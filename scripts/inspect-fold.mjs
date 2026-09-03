/**
 * Abre um .fold e despeja o conteúdo em uma pasta, para inspeção.
 *
 *   node scripts/inspect-fold.mjs caminho/do/arquivo.fold [pasta-de-saida]
 *
 * O .fold é um zip cujo content.bin está criptografado (ver functions/lib/foldFormat.js),
 * então não dá para simplesmente descompactar e ler. Este script desfaz as duas camadas
 * e grava: fold.json (sem as imagens, para caber na tela), cover.jpg e step_N.jpg.
 *
 * Serve principalmente para conferir a QUALIDADE DA CONVERSÃO: se os recortes de passo
 * saíram bem enquadrados, se estão na ordem certa e se as instruções fazem sentido.
 */
import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

if (!process.env.FOLD_SECRET) {
  console.error('FOLD_SECRET nao definida. Adicione-a ao .env na raiz do projeto.');
  process.exit(1);
}
const SECRET_KEY = crypto.createHash('sha256').update(process.env.FOLD_SECRET).digest();

const foldPath = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(foldPath || '.'), 'fold-inspecionado');

if (!foldPath) {
  console.error('Uso: node scripts/inspect-fold.mjs <arquivo.fold> [pasta-de-saida]');
  process.exit(1);
}
if (!fs.existsSync(foldPath)) {
  console.error(`Arquivo não encontrado: ${foldPath}`);
  process.exit(1);
}

let entries;
try {
  entries = new AdmZip(foldPath).getEntries();
} catch (e) {
  console.error(`Não parece um .fold válido (falhou ao ler como zip): ${e.message}`);
  process.exit(1);
}

const content = entries.find(e => e.entryName === 'content.bin');
if (!content) {
  console.error(`Zip sem content.bin. Entradas encontradas: ${entries.map(e => e.entryName).join(', ')}`);
  process.exit(1);
}

const [ivHex, encrypted] = content.getData().toString('utf8').split(':');
const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, Buffer.from(ivHex, 'hex'));
const json = decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
const data = JSON.parse(json);

fs.mkdirSync(outDir, { recursive: true });

const stripDataUri = b64 => b64.replace(/^data:image\/\w+;base64,/, '');
const saved = [];

if (data.coverImage) {
  const p = path.join(outDir, 'cover.jpg');
  fs.writeFileSync(p, Buffer.from(stripDataUri(data.coverImage), 'base64'));
  saved.push(p);
}

for (const step of data.steps || []) {
  if (!step.image) continue;
  const p = path.join(outDir, `step_${String(step.stepNumber).padStart(2, '0')}.jpg`);
  fs.writeFileSync(p, Buffer.from(stripDataUri(step.image), 'base64'));
  saved.push(p);
}

// Versão sem as imagens: o base64 tornaria o arquivo ilegível.
const semImagens = {
  ...data,
  coverImage: data.coverImage ? '<imagem salva em cover.jpg>' : null,
  steps: (data.steps || []).map(s => ({ stepNumber: s.stepNumber, instruction: s.instruction })),
};
fs.writeFileSync(path.join(outDir, 'fold.json'), JSON.stringify(semImagens, null, 2), 'utf8');

console.log(`Título : ${data.title}`);
console.log(`Capa   : ${data.coverImage ? 'sim' : 'não'}`);
console.log(`Passos : ${(data.steps || []).length}`);
console.log('');
for (const s of data.steps || []) {
  console.log(`  ${String(s.stepNumber).padStart(2)}. ${s.instruction}`);
}
console.log('');
console.log(`${saved.length} imagem(ns) + fold.json gravados em: ${outDir}`);
