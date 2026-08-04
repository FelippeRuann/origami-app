/**
 * Lê de uma página o que permite separar origamis diferentes dentro do mesmo PDF:
 * o TÍTULO do modelo e os NÚMEROS dos passos.
 *
 * Duas fontes, nesta ordem:
 *   1. camada de texto do PDF  — exata e instantânea (diagramas avulsos)
 *   2. OCR                     — para livros escaneados, que não têm texto algum
 *
 * Medido nos arquivos de teste: diagramas de autor têm camada de texto em 100% das
 * páginas; livros publicados (Robert Lang, Yoshizawa, Nicolas Terry) têm 0%.
 * Por isso o OCR não é luxo — é o caminho principal para livro.
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const require = createRequire(import.meta.url);

// fileURLToPath, e não new URL().pathname: este último devolve o caminho com
// %20 no lugar dos espaços, e o fs não resolve isso.
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const TESS_LANG_PATH = path.resolve(AQUI, '../models/tesseract');

let _worker = null;
let _workerPromise = null;

async function getWorker() {
  if (_worker) return _worker;
  if (!_workerPromise) {
    _workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');

      // langPath aponta para o eng.traineddata local: sem isso a lib baixa da rede
      // a cada arranque frio da function. gzip:false porque guardamos o arquivo
      // descompactado (a lib procura .traineddata.gz por padrão).
      const local = fs.existsSync(path.join(TESS_LANG_PATH, 'eng.traineddata'));
      if (local) {
        _worker = await createWorker('eng', undefined, {
          langPath: TESS_LANG_PATH, gzip: false, cacheMethod: 'none',
        });
      } else {
        console.warn('eng.traineddata não encontrado em', TESS_LANG_PATH, '— baixando da rede');
        _worker = await createWorker('eng');
      }
      return _worker;
    })();
  }
  return _workerPromise;
}

export async function encerrarOcr() {
  if (_worker) {
    await _worker.terminate().catch(() => {});
    _worker = null;
    _workerPromise = null;
  }
}

/** Extrai título e números da camada de texto do PDF. Devolve null se não houver texto. */
export async function lerCamadaDeTexto(page, alturaPx, escala) {
  const itens = (await page.getTextContent()).items.filter(i => i.str && i.str.trim());
  if (itens.length < 3) return null;

  const alturaDe = i => Math.hypot(i.transform[1], i.transform[3]);
  const alturas = itens.map(alturaDe).sort((a, b) => a - b);
  const mediana = alturas[Math.floor(alturas.length / 2)] || 1;

  const numeros = itens
    .filter(i => /^\d{1,3}$/.test(i.str.trim()) && alturaDe(i) >= mediana * 1.2)
    .map(i => ({
      n: parseInt(i.str.trim(), 10),
      x: i.transform[4] * escala,
      y: alturaPx - i.transform[5] * escala,
    }));

  // Título: item bem maior que o corpo do texto, no topo da página.
  const candidatos = itens
    .filter(i => alturaDe(i) > mediana * 1.6
                 && /[A-Za-zÀ-ÿ]{3}/.test(i.str)
                 && (alturaPx - i.transform[5] * escala) < alturaPx * 0.15)
    .sort((a, b) => alturaDe(b) - alturaDe(a));

  return {
    origem: 'texto',
    titulo: candidatos.length ? candidatos[0].str.trim() : null,
    numeros,
  };
}

/** Mesma leitura, via OCR, para páginas sem camada de texto. */
export async function lerPorOcr(imagemBuffer, alturaPx) {
  const worker = await getWorker();

  // As caixas por palavra só vêm com { blocks: true }; sem isso o retorno traz
  // apenas o texto corrido e os números soltos ficam invisíveis.
  const { data } = await worker.recognize(imagemBuffer, {}, { blocks: true, text: true });

  const palavras = [];
  for (const b of (data.blocks || [])) {
    for (const par of (b.paragraphs || [])) {
      for (const ln of (par.lines || [])) {
        for (const w of (ln.words || [])) {
          if (w.text && w.text.trim()) palavras.push(w);
        }
      }
    }
  }
  if (!palavras.length) return { origem: 'ocr', titulo: null, numeros: [], listaRodape: [] };

  const numeros = palavras
    .filter(w => /^\d{1,3}$/.test(w.text.trim()) && w.confidence > 50 && w.bbox.y0 < alturaPx * 0.85)
    .map(w => ({ n: parseInt(w.text.trim(), 10), x: w.bbox.x0, y: w.bbox.y0 }));

  const topo = palavras
    .filter(w => w.bbox.y0 < alturaPx * 0.10 && /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ-]{2,}$/.test(w.text.trim()))
    .sort((a, b) => (b.bbox.y1 - b.bbox.y0) - (a.bbox.y1 - a.bbox.y0));

  // O rodapé costuma trazer "1. Fold ... 2. Squash-fold ..." — serve para saber
  // quantos passos a página tem mesmo quando o OCR perde algum número solto.
  const listaRodape = (data.text || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => /^\d{1,3}\.\s+\S/.test(l))
    .map(l => {
      const m = l.match(/^(\d{1,3})\.\s+(.*)$/);
      return { n: parseInt(m[1], 10), texto: m[2] };
    });

  return {
    origem: 'ocr',
    titulo: topo.length ? topo[0].text.trim() : null,
    numeros,
    listaRodape,
  };
}

/**
 * Decide se uma página inicia um MODELO NOVO.
 *
 * Dois sinais, validados no livro do Robert Lang:
 *   - título novo na página (ex.: "Pegasus", depois "Cube")
 *   - a contagem de passos reinicia (…22, 23, e a próxima página começa em 1)
 */
export function comecaModeloNovo(leitura, ultimoNumeroVisto, tituloAtual) {
  if (!leitura) return false;

  const nums = (leitura.numeros || []).map(v => v.n).filter(n => n > 0);

  // Quantos números parecem INÍCIO de contagem, e quantos parecem CONTINUAÇÃO?
  // Olhar só o menor número não serve: um dígito lido errado pelo OCR inseria um
  // "1" numa página que na verdade seguia em 28, 29, 30 — e partia o modelo à toa.
  const baixos = nums.filter(n => n <= 3).length;
  const continuam = nums.filter(n => n >= ultimoNumeroVisto - 3).length;

  const reinicioForte = baixos >= 2 && continuam === 0 && ultimoNumeroVisto >= 5;
  if (reinicioForte) return true;

  // Título novo só corta quando a numeração NÃO está claramente continuando.
  // Livros põem cabeçalho de seção no meio de um modelo; sem esta trava, cada
  // cabeçalho viraria um origami separado.
  const t = leitura.titulo;
  const tituloDiferente = t && tituloAtual && t.toLowerCase() !== tituloAtual.toLowerCase();
  const tituloInedito = t && !tituloAtual && ultimoNumeroVisto > 0;

  if ((tituloDiferente || tituloInedito) && continuam === 0) return true;

  return false;
}
