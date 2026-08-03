/**
 * Gera anotações COCO automaticamente a partir de PDFs de origami, para servir de
 * ponto de partida no Label Studio. A ideia é NUNCA desenhar uma caixa do zero:
 * o script chuta todas, e o trabalho humano vira só corrigir as tortas.
 *
 *   node scripts/pre-anotar.mjs <pasta-com-pdfs> <pasta-de-saida>
 *
 * Como funciona: PDFs de origami trazem o número de cada passo como TEXTO de verdade,
 * com coordenadas. Usamos esses números como âncora, agrupamos a tinta da página em
 * blocos conectados e damos cada bloco ao número mais próximo.
 *
 * O que ele NÃO faz: não marca a capa (`cover`). São poucas por documento e o desenho
 * dela não tem número para ancorar — marque-as à mão no Label Studio.
 *
 * Saída (formato COCO, pronto para importar):
 *   <saida>/images/*.jpg
 *   <saida>/_annotations.coco.json
 */
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')).href;
const PDFJS_ROOT = path.dirname(require.resolve('pdfjs-dist/package.json')).replace(/\\/g, '/');

const SCALE = 200 / 72;  // resolução de render
const SHRINK = 3;        // redução usada na análise de blocos (velocidade)
const DARK = 170;        // abaixo disto é tinta; a fita cinza que liga os passos é mais clara
const MIN_BLOB = 12;     // blocos menores são poeira de compressão

const entrada = process.argv[2];
const saida = process.argv[3];

if (!entrada || !saida) {
  console.error('Uso: node scripts/pre-anotar.mjs <pasta-com-pdfs> <pasta-de-saida>');
  process.exit(1);
}

const pdfs = fs.statSync(entrada).isDirectory()
  ? fs.readdirSync(entrada).filter(f => f.toLowerCase().endsWith('.pdf')).map(f => path.join(entrada, f))
  : [entrada];

if (!pdfs.length) {
  console.error(`Nenhum PDF encontrado em ${entrada}`);
  process.exit(1);
}

const dirImagens = path.join(saida, 'images');
fs.mkdirSync(dirImagens, { recursive: true });

const coco = {
  info: { description: 'Pré-anotação automática por âncora de texto — REVISAR', version: '1' },
  images: [],
  annotations: [],
  categories: [
    { id: 1, name: 'cover', supercategory: 'none' },
    { id: 2, name: 'step', supercategory: 'none' },
  ],
};

let idImagem = 0, idAnotacao = 1;
const resumo = [];

for (const pdfPath of pdfs) {
  const nomeDoc = path.basename(pdfPath, path.extname(pdfPath)).replace(/[^\w-]+/g, '_');
  let pdf;
  try {
    pdf = await getDocument({
      data: new Uint8Array(fs.readFileSync(pdfPath)),
      useWorkerFetch: false, isEvalSupported: false,
      standardFontDataUrl: `${PDFJS_ROOT}/standard_fonts/`,
      cMapUrl: `${PDFJS_ROOT}/cmaps/`, cMapPacked: true,
    }).promise;
  } catch (e) {
    console.error(`  ! ${nomeDoc}: falhou ao abrir (${e.message})`);
    continue;
  }

  let passosDoc = 0, paginasSemTexto = 0;

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: SCALE });
    const W = Math.ceil(vp.width), H = Math.ceil(vp.height);

    const canvas = createCanvas(W, H);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    const jpg = canvas.toBuffer('image/jpeg');

    const items = (await page.getTextContent()).items.filter(i => i.str.trim());
    const alturaFonte = i => Math.hypot(i.transform[1], i.transform[3]);

    // Âncoras: números isolados em fonte grande. Legendas usam fonte menor.
    const anchors = items
      .filter(i => /^\d{1,3}$/.test(i.str.trim()) && alturaFonte(i) >= 15)
      .map(i => ({ n: parseInt(i.str.trim(), 10), x: i.transform[4] * SCALE, y: H - i.transform[5] * SCALE }))
      .sort((a, b) => a.n - b.n);

    if (!anchors.length) {
      paginasSemTexto++;
      continue; // página escaneada ou sem numeração: não dá para ancorar
    }

    const nomeImagem = `${nomeDoc}-pdf_page_${p}.jpg`;
    fs.writeFileSync(path.join(dirImagens, nomeImagem), jpg);
    coco.images.push({ id: idImagem, file_name: nomeImagem, width: W, height: H });

    // --- blocos de tinta ---
    const { data, info } = await sharp(jpg).greyscale().resize({ width: Math.round(W / SHRINK) })
      .raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const k = W / w;

    const visto = new Uint8Array(w * h);
    const pilha = new Int32Array(w * h);
    const blocos = [];

    for (let inicio = 0; inicio < w * h; inicio++) {
      if (visto[inicio] || data[inicio] >= DARK) continue;
      let sp = 0; pilha[sp++] = inicio; visto[inicio] = 1;
      let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, n = 0, sx = 0, sy = 0;
      while (sp > 0) {
        const idx = pilha[--sp];
        const cx = idx % w, cy = (idx / w) | 0;
        n++; sx += cx; sy += cy;
        if (cx < x1) x1 = cx; if (cx > x2) x2 = cx;
        if (cy < y1) y1 = cy; if (cy > y2) y2 = cy;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (visto[ni] || data[ni] >= DARK) continue;
          visto[ni] = 1; pilha[sp++] = ni;
        }
      }
      if (n >= MIN_BLOB) blocos.push({ x1, y1, x2, y2, cx: sx / n, cy: sy / n });
    }

    // A moldura da página vira um bloco que cobre tudo — descartar.
    const uteis = blocos.filter(b => !((b.x2 - b.x1) > w * 0.9 && (b.y2 - b.y1) > h * 0.9));

    // Teto de distância, derivado do espaçamento típico entre passos vizinhos.
    const vizinhos = anchors.map(a => {
      let melhor = Infinity;
      for (const o of anchors) if (o !== a) melhor = Math.min(melhor, Math.hypot(o.x - a.x, o.y - a.y));
      return melhor;
    }).sort((a, b) => a - b);
    const espacamento = vizinhos[Math.floor(vizinhos.length / 2)] || Math.max(W, H);
    const maxDist = espacamento * 0.75;

    const caixas = new Map(anchors.map(a => [a.n, { x1: a.x - 12, y1: a.y - 22, x2: a.x + 22, y2: a.y + 12 }]));

    for (const b of uteis) {
      const bx = b.cx * k, by = b.cy * k;
      let melhor = null, bd = Infinity;
      for (const a of anchors) {
        const d = Math.hypot(a.x - bx, a.y - by);
        if (d < bd) { bd = d; melhor = a; }
      }
      if (!melhor || bd > maxDist) continue;
      const c = caixas.get(melhor.n);
      c.x1 = Math.min(c.x1, b.x1 * k); c.y1 = Math.min(c.y1, b.y1 * k);
      c.x2 = Math.max(c.x2, b.x2 * k); c.y2 = Math.max(c.y2, b.y2 * k);
    }

    for (const a of anchors) {
      const c = caixas.get(a.n);
      const pad = 8;
      const x = Math.max(0, Math.round(c.x1 - pad));
      const y = Math.max(0, Math.round(c.y1 - pad));
      const bw = Math.min(W - x, Math.round(c.x2 - c.x1 + pad * 2));
      const bh = Math.min(H - y, Math.round(c.y2 - c.y1 + pad * 2));
      if (bw < 20 || bh < 20) continue;
      coco.annotations.push({
        id: idAnotacao++, image_id: idImagem, category_id: 2, // 2 = step
        bbox: [x, y, bw, bh], area: bw * bh, iscrowd: 0,
      });
      passosDoc++;
    }

    idImagem++;
  }

  resumo.push({ documento: nomeDoc, paginas: pdf.numPages, passos: passosDoc, paginasSemTexto });
  console.log(`${nomeDoc}: ${pdf.numPages} paginas, ${passosDoc} passos pre-anotados` +
              (paginasSemTexto ? `, ${paginasSemTexto} pagina(s) sem texto (ignoradas)` : ''));
}

fs.writeFileSync(path.join(saida, '_annotations.coco.json'), JSON.stringify(coco, null, 1), 'utf8');

console.log('\n----------------------------------------');
console.log(`documentos processados : ${resumo.length}`);
console.log(`imagens geradas        : ${coco.images.length}`);
console.log(`caixas pre-anotadas    : ${coco.annotations.length}`);
console.log(`\nsaida: ${saida}`);
console.log('\nPROXIMO PASSO: importe no Label Studio, corrija as caixas tortas');
console.log('e marque as capas (cover) a mao — o script nao as detecta.');
