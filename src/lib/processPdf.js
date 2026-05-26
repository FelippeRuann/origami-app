import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset({ canvas }, width, height) {
    canvas.width = width;
    canvas.height = height;
  }
  destroy({ canvas }) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

function findAnnotationsInCoco(originalName, pageNum, scriptDir) {
  const baseName = path.basename(originalName, path.extname(originalName)).toLowerCase();
  const targetPattern = `${baseName}-pdf_page_${pageNum + 1}.png`;

  const cocoPaths = [
    path.join(scriptDir, 'models', 'oricoco', 'train', '_annotations.coco.json'),
    path.join(scriptDir, 'models', 'oricoco', 'valid', '_annotations.coco.json'),
  ];

  for (const cocoPath of cocoPaths) {
    if (!fs.existsSync(cocoPath)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(cocoPath, 'utf-8'));

      let targetImage = data.images?.find(img => {
        const extra = (img.extra?.name || '').toLowerCase();
        const fileName = (img.file_name || '').toLowerCase();
        return extra === targetPattern || extra.includes(targetPattern) || fileName.includes(targetPattern);
      });

      if (!targetImage) {
        targetImage = data.images?.find(img => {
          const extra = (img.extra?.name || '').toLowerCase();
          return extra.includes(baseName) && extra.includes(`page_${pageNum + 1}`);
        });
      }

      if (targetImage) {
        const annots = (data.annotations || []).filter(a => a.image_id === targetImage.id);
        return { annots, cocoWidth: targetImage.width, cocoHeight: targetImage.height };
      }
    } catch (e) {
      console.error(`COCO read error for ${cocoPath}:`, e.message);
    }
  }

  return { annots: null, cocoWidth: null, cocoHeight: null };
}

export async function processPdf(pdfPath, outputDir, originalName = 'unknown.pdf') {
  fs.mkdirSync(outputDir, { recursive: true });

  const pdfData = new Uint8Array(fs.readFileSync(pdfPath));
  const pdf = await getDocument({ data: pdfData, useWorkerFetch: false, isEvalSupported: false }).promise;

  const result = { cover: null, steps: [] };
  let stepCounter = 1;
  const scriptDir = process.cwd();
  const canvasFactory = new NodeCanvasFactory();

  for (let pageIndex = 0; pageIndex < pdf.numPages; pageIndex++) {
    const page = await pdf.getPage(pageIndex + 1);
    const scale = 200 / 72;
    const viewport = page.getViewport({ scale });

    const actualWidth = Math.ceil(viewport.width);
    const actualHeight = Math.ceil(viewport.height);
    const { canvas, context } = canvasFactory.create(actualWidth, actualHeight);

    await page.render({ canvasContext: context, viewport, canvasFactory }).promise;

    const imgPath = path.join(outputDir, `page_${pageIndex}.jpg`);
    fs.writeFileSync(imgPath, canvas.toBuffer('image/jpeg'));
    canvasFactory.destroy({ canvas });

    const { annots, cocoWidth, cocoHeight } = findAnnotationsInCoco(originalName, pageIndex, scriptDir);

    let pageBoxes = [];

    if (annots?.length) {
      const scaleX = actualWidth / (cocoWidth || actualWidth);
      const scaleY = actualHeight / (cocoHeight || actualHeight);

      for (const ann of annots) {
        const clsName = ann.category_id === 1 ? 'cover' : 'step';
        const [bx, by, bw, bh] = ann.bbox || [];
        if (bx == null) continue;

        const x1 = Math.max(0, Math.min(Math.floor(bx * scaleX), actualWidth));
        const y1 = Math.max(0, Math.min(Math.floor(by * scaleY), actualHeight));
        const x2 = Math.max(0, Math.min(Math.floor((bx + bw) * scaleX), actualWidth));
        const y2 = Math.max(0, Math.min(Math.floor((by + bh) * scaleY), actualHeight));

        if (x2 > x1 && y2 > y1) pageBoxes.push({ clsName, x1, y1, x2, y2 });
      }
    } else {
      console.log(`No COCO annotations for ${originalName} page ${pageIndex + 1}. Using fallback layout.`);
      if (pageIndex === 0) {
        pageBoxes.push({ clsName: 'cover', x1: 0, y1: 0, x2: actualWidth, y2: actualHeight });
      } else {
        const halfH = Math.floor(actualHeight / 2);
        pageBoxes.push({ clsName: 'step', x1: 0, y1: 0, x2: actualWidth, y2: halfH });
        pageBoxes.push({ clsName: 'step', x1: 0, y1: halfH, x2: actualWidth, y2: actualHeight });
      }
    }

    pageBoxes.sort((a, b) => {
      const rowDiff = Math.floor(a.y1 / 150) - Math.floor(b.y1 / 150);
      return rowDiff !== 0 ? rowDiff : a.x1 - b.x1;
    });

    for (const { clsName, x1, y1, x2, y2 } of pageBoxes) {
      if (clsName === 'cover') {
        const cropPath = path.join(outputDir, 'cover.jpg');
        await sharp(imgPath).extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }).jpeg().toFile(cropPath);
        result.cover = cropPath;
      } else {
        const cropPath = path.join(outputDir, `step_${stepCounter}.jpg`);
        await sharp(imgPath).extract({ left: x1, top: y1, width: x2 - x1, height: y2 - y1 }).jpeg().toFile(cropPath);
        result.steps.push({ stepNumber: stepCounter, imagePath: cropPath });
        stepCounter++;
      }
    }
  }

  return result;
}
