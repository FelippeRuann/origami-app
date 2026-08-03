import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { GoogleGenAI } from '@google/genai';
import Busboy from 'busboy';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { processPdf } from './lib/processPdf.js';
import { createFoldFile } from './lib/foldFormat.js';

// Buscas de usuário no servidor (substituem o "allow list" das regras do Firestore)
export { findTeacherByCode, findStudentByEmail } from './lib/userLookup.js';

setGlobalOptions({ maxInstances: 5 });

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

// gemini-2.0-flash e 2.5-flash foram descontinuados e respondem 404 neste projeto.
const GEMINI_MODEL = 'gemini-3.5-flash';

// Em Cloud Functions v2 o runtime já consome o stream da requisição e deixa o corpo
// pronto em req.rawBody. Por isso Multer (que lê o req como stream) recebe um stream
// já encerrado e falha com "Unexpected end of form". Usamos Busboy alimentado
// diretamente pelo rawBody, que é o caminho recomendado pelo Firebase.
function parseUpload(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_UPLOAD_BYTES } });

    let file = null;
    let writeDone = null;
    let tooLarge = false;

    busboy.on('file', (fieldname, stream, info) => {
      if (fieldname !== 'pdf' || file) {
        stream.resume();
        return;
      }

      const id = crypto.randomUUID();
      const tmpPath = path.join(os.tmpdir(), id);
      file = { path: tmpPath, filename: id, originalname: info.filename || 'documento.pdf' };

      const out = fs.createWriteStream(tmpPath);
      writeDone = new Promise((done, fail) => {
        stream.on('limit', () => { tooLarge = true; });
        stream.on('error', fail);
        out.on('error', fail);
        out.on('close', done);
      });
      stream.pipe(out);
    });

    busboy.on('error', reject);

    busboy.on('close', async () => {
      try {
        if (writeDone) await writeDone;
        if (tooLarge) {
          fs.rmSync(file.path, { force: true });
          return reject(new Error('O PDF excede o limite de 20MB.'));
        }
        resolve(file);
      } catch (e) {
        reject(e);
      }
    });

    if (req.rawBody) busboy.end(req.rawBody);
    else req.pipe(busboy);
  });
}

const PROMPT = `Você é um instrutor especialista em origami e visão computacional.
Sua tarefa é analisar a imagem extraída de um diagrama de origami e traduzir/interpretar o que deve ser feito no papel.

REGRAS RÍGIDAS:
1. Se houver texto em outros idiomas (como chinês, japonês ou inglês), TRADUZA-O para o Português do Brasil com termos de dobradura clássicos (Dobra em vale, dobra em montanha, inverter, etc.).
2. Se a imagem contiver APENAS a modelo final, ilustrações decorativas ou não representar uma instrução de dobradura, responda EXATAMENTE com a frase: 'Imagem de referência do modelo'.
3. Se a imagem tiver pouquíssimo texto ou apenas um número, mas a imagem MOSTRAR UMA AÇÃO (ex: dobrando uma ponta), DESCREVA A AÇÃO que deve ser feita na imagem baseando-se nas setas de origami.
4. IGNORE e não mencione logos, marcas d'água, dicas de papel ou números de páginas.
5. Seja claro, direto, e nunca use frases como "Na imagem eu vejo" ou "Parece que". Diga apenas a instrução imperativa.`;

export const uploadPdf = onRequest(
  { cors: true, invoker: 'public', timeoutSeconds: 300, memory: '1GiB', secrets: ['GEMINI_PDF_KEY'] },
  async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });

    let file;
    try {
      file = await parseUpload(req);
    } catch (err) {
      console.error('Erro ao ler o upload:', err);
      return res.status(400).json({ error: err.message });
    }
    if (!file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const pdfPath = file.path;
    const jobOutputDir = path.join(os.tmpdir(), `job_${file.filename}`);

    try {
      console.log('Processando PDF:', file.originalname);
      const result = await processPdf(pdfPath, jobOutputDir, file.originalname);

      const pdfAI = new GoogleGenAI({ apiKey: process.env.GEMINI_PDF_KEY });

      const foldData = {
        title: file.originalname.replace(/\.pdf$/i, ''),
        coverImage: null,
        steps: []
      };

      if (result.cover && fs.existsSync(result.cover)) {
        foldData.coverImage = `data:image/jpeg;base64,${fs.readFileSync(result.cover).toString('base64')}`;
      }

      const stepResults = await Promise.all(
        result.steps
          .filter(step => fs.existsSync(step.imagePath))
          .map(async (step) => {
            const base64Image = fs.readFileSync(step.imagePath).toString('base64');
            try {
              const response = await pdfAI.models.generateContent({
                model: GEMINI_MODEL,
                contents: [{
                  role: 'user',
                  parts: [
                    { text: PROMPT },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                  ]
                }]
              });
              return {
                stepNumber: step.stepNumber,
                instruction: response.text.trim(),
                image: `data:image/jpeg;base64,${base64Image}`
              };
            } catch (apiError) {
              console.error(`Erro Gemini passo ${step.stepNumber}:`, apiError.message);
              return {
                stepNumber: step.stepNumber,
                instruction: 'Instrução não pôde ser lida.',
                image: `data:image/jpeg;base64,${base64Image}`
              };
            }
          })
      );

      foldData.steps = stepResults.sort((a, b) => a.stepNumber - b.stepNumber);
      console.log(`Passos gerados: ${foldData.steps.length}, capa: ${foldData.coverImage ? 'sim' : 'não'}`);

      const foldFilePath = path.join(jobOutputDir, `${file.filename}.fold`);
      createFoldFile(foldData, foldFilePath);

      const foldFileBase64 = fs.readFileSync(foldFilePath).toString('base64');

      res.json({
        success: true,
        foldData,
        foldFileBase64,
        filename: file.originalname.replace(/\.pdf$/i, '') + '.fold'
      });

    } catch (e) {
      console.error('Erro ao processar PDF:', e);
      res.status(500).json({ error: `Erro ao processar o PDF: ${e.message}` });
    } finally {
      try {
        fs.rmSync(jobOutputDir, { recursive: true, force: true });
        fs.rmSync(pdfPath, { force: true });
      } catch (_) {}
    }
  }
);
