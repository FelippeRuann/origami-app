import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { createFoldFile } from './src/lib/foldFormat.js';
import { processPdf } from './src/lib/processPdf.js';

const app = express();
const PORT = 3000;
const EXPO_PORT = 8082;

// Inicializa o Gemini com a chave dedicada ao PDF
const pdfApiKey = process.env.GEMINI_PDF_KEY;
if (!pdfApiKey) {
  console.error("⚠️ AVISO: Chave GEMINI_PDF_KEY não encontrada no arquivo .env!");
}
const pdfAI = new GoogleGenAI({ apiKey: pdfApiKey || 'dummy' });

// Garantir que as pastas existem
const uploadDir = path.join(process.cwd(), 'uploads');
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Configurar o Multer para receber o PDF
const upload = multer({ dest: 'uploads/' });

// Rota da nossa API (Backend)
app.post('/api/upload-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  
  console.log('📄 PDF recebido no backend:', req.file.originalname);
  
  const pdfPath = path.join(process.cwd(), req.file.path);
  const modelPath = path.join(process.cwd(), 'models', 'best.pt');
  const jobOutputDir = path.join(outputDir, req.file.filename);
  
  console.log('🤖 Iniciando processamento de PDF em JavaScript...');

  try {
    const result = await processPdf(pdfPath, jobOutputDir, req.file.originalname);

    console.log('✅ PDF processado! Iniciando leitura com Gemini Vision (paralelo)...');

      const prompt = `Você é um instrutor especialista em origami e visão computacional.
Sua tarefa é analisar a imagem extraída de um diagrama de origami e traduzir/interpretar o que deve ser feito no papel.

REGRAS RÍGIDAS:
1. Se houver texto em outros idiomas (como chinês, japonês ou inglês), TRADUZA-O para o Português do Brasil com termos de dobradura clássicos (Dobra em vale, dobra em montanha, inverter, etc.).
2. Se a imagem contiver APENAS a modelo final, ilustrações decorativas ou não representar uma instrução de dobradura, responda EXATAMENTE com a frase: 'Imagem de referência do modelo'.
3. Se a imagem tiver pouquíssimo texto ou apenas um número, mas a imagem MOSTRAR UMA AÇÃO (ex: dobrando uma ponta), DESCREVA A AÇÃO que deve ser feita na imagem baseando-se nas setas de origami. Ex: 'Dobre a aba superior para baixo usando a linha tracejada'.
4. IGNORE e não mencione logos, marcas d'água, dicas de papel ou números de páginas.
5. Seja claro, direto, e nunca use frases como "Na imagem eu vejo" ou "Parece que". Diga apenas a instrução imperativa.`;

      const foldData = {
        title: req.file.originalname.replace('.pdf', ''),
        coverImage: null,
        steps: []
      };

      // 1. Processar a capa (se houver)
      if (result.cover && fs.existsSync(result.cover)) {
        foldData.coverImage = `data:image/jpeg;base64,${Buffer.from(fs.readFileSync(result.cover)).toString('base64')}`;
      }

      // 2. Processar todos os passos em paralelo com Gemini
      const stepResults = await Promise.all(
        result.steps
          .filter(step => fs.existsSync(step.imagePath))
          .map(async (step) => {
            const base64Image = Buffer.from(fs.readFileSync(step.imagePath)).toString('base64');
            console.log(`Lendo passo ${step.stepNumber} com Gemini...`);
            try {
              const response = await pdfAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{
                  role: 'user',
                  parts: [
                    { text: prompt },
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
              console.error(`Erro na API para o passo ${step.stepNumber}:`, apiError.message || apiError);
              return {
                stepNumber: step.stepNumber,
                instruction: 'Instrução não pôde ser lida.',
                image: `data:image/jpeg;base64,${base64Image}`
              };
            }
          })
      );

      foldData.steps = stepResults.sort((a, b) => a.stepNumber - b.stepNumber);

      console.log('✅ Gemini finalizado! Criando arquivo .fold...');

      // 3. Criar o arquivo .fold criptografado
      const foldFileName = `${req.file.filename}.fold`;
      const foldFilePath = path.join(jobOutputDir, foldFileName);
      
      createFoldFile(foldData, foldFilePath);

      // Ler o arquivo .fold criado e converter em base64
      let foldFileBase64 = null;
      try {
        foldFileBase64 = fs.readFileSync(foldFilePath).toString('base64');
      } catch (readErr) {
        console.error("Erro ao ler arquivo .fold gerado:", readErr);
      }

      // 4. Enviar o JSON com tudo para o aplicativo
      res.json({
        success: true,
        foldData: foldData,
        foldFileBase64: foldFileBase64,
        filename: req.file.originalname.replace('.pdf', '.fold')
      });

      // Limpeza temporária em background
      try {
        fs.rmSync(jobOutputDir, { recursive: true, force: true });
        fs.unlinkSync(pdfPath);
      } catch (cleanErr) {
        console.warn("Aviso ao limpar arquivos temporários:", cleanErr);
      }
      
  } catch (e) {
    console.error("Erro ao processar as imagens do PDF:", e);
    res.status(500).json({ error: 'Erro ao processar as imagens do PDF.' });
  }
});

// Iniciar o Expo em background para o Frontend continuar funcionando
console.log('Iniciando o Frontend (Expo)...');
const expoProcess = spawn('npx', ['expo', 'start', '--web', '--port', EXPO_PORT.toString()], {
  stdio: 'inherit',
  shell: true
});

// Proxy: Tudo que não for /api vai para o Frontend (Expo)
app.use('/', createProxyMiddleware({ 
  target: `http://localhost:${EXPO_PORT}`, 
  changeOrigin: true, 
  ws: true 
}));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
