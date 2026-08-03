import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { createRequire } from 'module';

// Em Node não existe worker de verdade: o pdfjs cai no "fake worker", que faz um
// import dinâmico do caminho em workerSrc. Deixar isso vazio quebra com
// 'No "GlobalWorkerOptions.workerSrc" specified' — apontamos para o arquivo real.
const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

// Sem estes assets o pdfjs não desenha fontes padrão nem texto CJK — e os diagramas
// japoneses/chineses chegariam ao Gemini sem os caracteres.
// Caminho de disco (com barra final), não file:// — em Node o pdfjs lê estes
// assets pelo filesystem e uma URL faria o readFile falhar.
// Caminho de disco, não file:// — em Node o pdfjs lê estes assets pelo filesystem.
// A barra final é obrigatória e precisa ser "/" mesmo no Windows.
const PDFJS_ROOT = path.dirname(require.resolve('pdfjs-dist/package.json')).replace(/\\/g, '/');
const STANDARD_FONTS = `${PDFJS_ROOT}/standard_fonts/`;
const CMAPS = `${PDFJS_ROOT}/cmaps/`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(__dirname, '../models/best.onnx');

const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;
const INPUT_SIZE = 640;
const CLASS_COVER = 0;
const CLASS_STEP = 1;

let _sessionPromise = null;
function getSession() {
  if (!_sessionPromise) {
    _sessionPromise = ort.InferenceSession.create(MODEL_PATH).catch(e => {
      _sessionPromise = null;
      throw e;
    });
  }
  return _sessionPromise;
}

function iou(a, b) {
  const xA = Math.max(a[0], b[0]), yA = Math.max(a[1], b[1]);
  const xB = Math.min(a[2], b[2]), yB = Math.min(a[3], b[3]);
  const inter = Math.max(0, xB - xA) * Math.max(0, yB - yA);
  const aArea = (a[2] - a[0]) * (a[3] - a[1]);
  const bArea = (b[2] - b[0]) * (b[3] - b[1]);
  return inter / (aArea + bArea - inter);
}

function nms(dets) {
  dets.sort((a, b) => b.conf - a.conf);
  const keep = [], seen = new Set();
  for (let i = 0; i < dets.length; i++) {
    if (seen.has(i)) continue;
    keep.push(dets[i]);
    for (let j = i + 1; j < dets.length; j++) {
      if (!seen.has(j) && dets[i].classId === dets[j].classId && iou(dets[i].box, dets[j].box) > IOU_THRESHOLD)
        seen.add(j);
    }
  }
  return keep;
}

// Ordena as detecções na ordem de leitura (esquerda→direita, linha a linha).
// Diagramas de origami são grades: ordenar só por y embaralha os passos de uma
// mesma linha, porque eles diferem por poucos pixels na vertical. A altura da
// faixa vem da mediana das caixas, então se adapta ao layout de cada página.
export function sortReadingOrder(dets) {
  if (dets.length < 2) return dets;

  const heights = dets.map(d => d.box[3] - d.box[1]).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)];
  const rowTolerance = medianHeight * 0.5;

  const byTop = [...dets].sort((a, b) => a.box[1] - b.box[1]);
  const rows = [];
  for (const det of byTop) {
    const row = rows[rows.length - 1];
    const rowTop = row?.[0].box[1];
    if (row && det.box[1] - rowTop < rowTolerance) row.push(det);
    else rows.push([det]);
  }

  return rows.flatMap(row => row.sort((a, b) => a.box[0] - b.box[0]));
}

async function detectBoxes(imagePath, origWidth, origHeight) {
  const session = await getSession();

  // Letterbox (proporção preservada + preenchimento), que é como o YOLO treina.
  // Usar fit:'fill' achatava a página num quadrado e a distorção derrubava a
  // taxa de detecção — passos deixavam de ser encontrados.
  const ratio = Math.min(INPUT_SIZE / origWidth, INPUT_SIZE / origHeight);
  const padX = (INPUT_SIZE - origWidth * ratio) / 2;
  const padY = (INPUT_SIZE - origHeight * ratio) / 2;

  const { data: rgb } = await sharp(imagePath)
    .resize(INPUT_SIZE, INPUT_SIZE, {
      fit: 'contain',
      position: 'centre',
      background: { r: 114, g: 114, b: 114 },
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = INPUT_SIZE * INPUT_SIZE;
  const f32 = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i++) {
    f32[i]           = rgb[i * 3]     / 255.0;
    f32[pixels + i]  = rgb[i * 3 + 1] / 255.0;
    f32[2*pixels + i]= rgb[i * 3 + 2] / 255.0;
  }

  const tensor = new ort.Tensor('float32', f32, [1, 3, INPUT_SIZE, INPUT_SIZE]);
  const inputName = session.inputNames[0];
  const out = await session.run({ [inputName]: tensor });
  const raw = out[session.outputNames[0]].data; // [1, 6, 8400]
  const N = 8400;

  // Desfaz o letterbox: tira o preenchimento antes de reverter a escala.
  const toOrigX = v => (v - padX) / ratio;
  const toOrigY = v => (v - padY) / ratio;
  const dets = [];
  let maxConf = 0;

  for (let i = 0; i < N; i++) {
    const xc = raw[0*N+i], yc = raw[1*N+i], w = raw[2*N+i], h = raw[3*N+i];
    const cCover = raw[4*N+i], cStep = raw[5*N+i];
    const conf = Math.max(cCover, cStep);
    if (conf > maxConf) maxConf = conf;
    if (conf < CONF_THRESHOLD) continue;
    const classId = cCover > cStep ? CLASS_COVER : CLASS_STEP;
    const x1 = Math.max(0, Math.round(toOrigX(xc - w/2)));
    const y1 = Math.max(0, Math.round(toOrigY(yc - h/2)));
    const x2 = Math.min(origWidth,  Math.round(toOrigX(xc + w/2)));
    const y2 = Math.min(origHeight, Math.round(toOrigY(yc + h/2)));
    if (x2 - x1 < 10 || y2 - y1 < 10) continue;
    dets.push({ classId, box: [x1, y1, x2, y2], conf });
  }

  // Se a confiança máxima ficar logo abaixo do limiar, o problema é calibração,
  // não o modelo — este log é o que permite distinguir os dois casos.
  console.log(`Confiança máxima na página: ${maxConf.toFixed(3)} (limiar ${CONF_THRESHOLD}), ${dets.length} candidato(s).`);

  return { dets: nms(dets), maxConf };
}

class NodeCanvasFactory {
  create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext('2d') }; }
  reset({ canvas }, w, h) { canvas.width = w; canvas.height = h; }
  destroy({ canvas }) { canvas.width = 0; canvas.height = 0; }
}

export async function processPdf(pdfPath, outputDir, originalName = 'unknown.pdf') {
  fs.mkdirSync(outputDir, { recursive: true });

  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({
    data: pdfData,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: STANDARD_FONTS,
    cMapUrl: CMAPS,
    cMapPacked: true,
  }).promise;

  // stats permite ao chamador distinguir "o modelo reconheceu o documento" de
  // "não reconheci nada e cortei a página ao meio no chute" — sem isso, um PDF
  // que não é origami produz um .fold indistinguível de uma conversão legítima.
  const result = {
    cover: null,
    steps: [],
    stats: { totalPages: pdf.numPages, pagesWithDetections: 0, maxConfidence: 0 },
  };
  let stepCounter = 1;
  const canvasFactory = new NodeCanvasFactory();

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: 200 / 72 });
    const actualWidth  = Math.ceil(viewport.width);
    const actualHeight = Math.ceil(viewport.height);
    const { canvas, context } = canvasFactory.create(actualWidth, actualHeight);

    await page.render({ canvasContext: context, viewport, canvasFactory }).promise;

    const imgPath = path.join(outputDir, `page_${pageIndex}.jpg`);
    fs.writeFileSync(imgPath, canvas.toBuffer('image/jpeg'));
    canvasFactory.destroy({ canvas });

    let dets = [];
    try {
      const detection = await detectBoxes(imgPath, actualWidth, actualHeight);
      dets = detection.dets;
      result.stats.maxConfidence = Math.max(result.stats.maxConfidence, detection.maxConf);
    } catch (e) {
      console.error(`YOLO falhou na página ${pageIndex}, usando fallback:`, e.message);
    }

    if (dets.length > 0) {
      result.stats.pagesWithDetections++;
      // YOLO detectou regiões — usa bounding boxes reais
      const covers = dets.filter(d => d.classId === CLASS_COVER).sort((a, b) => a.box[1] - b.box[1]);
      const steps  = sortReadingOrder(dets.filter(d => d.classId === CLASS_STEP));
      console.log(`Página ${pageIndex + 1}: ${steps.length} passo(s), ${covers.length} capa(s) detectada(s).`);

      for (const det of covers) {
        const [x1, y1, x2, y2] = det.box;
        const cropPath = path.join(outputDir, 'cover.jpg');
        await sharp(imgPath).extract({ left: x1, top: y1, width: x2-x1, height: y2-y1 }).jpeg().toFile(cropPath);
        result.cover = cropPath;
      }
      for (const det of steps) {
        const [x1, y1, x2, y2] = det.box;
        const cropPath = path.join(outputDir, `step_${stepCounter}.jpg`);
        await sharp(imgPath).extract({ left: x1, top: y1, width: x2-x1, height: y2-y1 }).jpeg().toFile(cropPath);
        result.steps.push({ stepNumber: stepCounter, imagePath: cropPath });
        stepCounter++;
      }
    } else {
      // Fallback: página 0 = capa, demais = metade superior e inferior
      console.log(`Página ${pageIndex + 1}: nenhuma detecção acima de ${CONF_THRESHOLD} — usando fallback de metades.`);
      if (pageIndex === 0) {
        const cropPath = path.join(outputDir, 'cover.jpg');
        await sharp(imgPath).jpeg().toFile(cropPath);
        result.cover = cropPath;
      } else {
        const half = Math.floor(actualHeight / 2);
        for (const [top, height] of [[0, half], [half, actualHeight - half]]) {
          const cropPath = path.join(outputDir, `step_${stepCounter}.jpg`);
          await sharp(imgPath).extract({ left: 0, top, width: actualWidth, height }).jpeg().toFile(cropPath);
          result.steps.push({ stepNumber: stepCounter, imagePath: cropPath });
          stepCounter++;
        }
      }
    }
  }

  return result;
}
