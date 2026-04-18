import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import Groq from 'groq-sdk';
import { createFoldFile } from './src/lib/foldFormat.js';

const app = express();
const PORT = 3000;
const EXPO_PORT = 8082;

// Inicializa o Groq garantindo que a chave seja lida do .env
const apiKey = process.env.GROQ_API_KEY;
if (!apiKey) {
  console.error("⚠️ AVISO: Chave GROQ_API_KEY não encontrada no arquivo .env!");
}
const groq = new Groq({ apiKey: apiKey || 'dummy' });

// Garantir que as pastas existem
const uploadDir = path.join(process.cwd(), 'uploads');
const outputDir = path.join(process.cwd(), 'output');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Configurar o Multer para receber o PDF
const upload = multer({ dest: 'uploads/' });

// Rota da nossa API (Backend)
app.post('/api/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  
  console.log('📄 PDF recebido no backend:', req.file.originalname);
  
  const pdfPath = path.join(process.cwd(), req.file.path);
  const modelPath = path.join(process.cwd(), 'models', 'best.pt');
  const jobOutputDir = path.join(outputDir, req.file.filename);
  
  if (!fs.existsSync(modelPath)) {
    return res.status(500).json({ error: 'Modelo best.pt não encontrado na pasta models.' });
  }

  console.log('🤖 Iniciando Visão Computacional (YOLO)...');
  
  // Chamar o script Python (usando 'python' em vez de 'python3' para Windows)
  const pythonCommand = process.platform === 'win32' ? 'python' : 'python3';
  const pythonProcess = spawn(pythonCommand, ['process_pdf.py', pdfPath, modelPath, jobOutputDir]);
  
  let pythonOutput = '';
  
  pythonProcess.stdout.on('data', (data) => {
    pythonOutput += data.toString();
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`YOLO Log: ${data}`);
  });
  
  pythonProcess.on('close', async (code) => {
    console.log(`Python finalizou com código ${code}`);
    
    try {
      // O Python imprime o JSON na última linha
      const jsonStr = pythonOutput.trim().split('\n').pop();
      const result = JSON.parse(jsonStr);
      
      if (result.error) {
        return res.status(500).json({ error: 'Erro no YOLO: ' + result.error });
      }
      
      console.log('✅ YOLO finalizado! Iniciando leitura com Groq (Llama Vision)...');
      
      const foldData = {
        title: req.file.originalname.replace('.pdf', ''),
        coverImage: null,
        steps: []
      };

      // 1. Processar a capa (se houver)
      if (result.cover && fs.existsSync(result.cover)) {
        foldData.coverImage = `data:image/jpeg;base64,${Buffer.from(fs.readFileSync(result.cover)).toString('base64')}`;
      }

      // 2. Processar cada passo com o Groq (Llama Vision)
      for (const step of result.steps) {
        if (fs.existsSync(step.imagePath)) {
          console.log(`Lendo passo ${step.stepNumber} com Groq...`);
          
          const base64Image = Buffer.from(fs.readFileSync(step.imagePath)).toString('base64');
          const prompt = "Leia as instruções de origami nesta imagem. Retorne APENAS o texto da instrução, de forma clara e direta. Não adicione comentários extras.";
          
          try {
            const response = await groq.chat.completions.create({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                  ]
                }
              ],
              temperature: 0.1,
              max_completion_tokens: 1024,
            });
            
            foldData.steps.push({
              stepNumber: step.stepNumber,
              instruction: response.choices[0].message.content.trim(),
              image: `data:image/jpeg;base64,${base64Image}`
            });
            
            // Pausa de 2 segundos (Groq tem limite de 30 RPM no free tier)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
          } catch (apiError) {
            console.error(`Erro na API para o passo ${step.stepNumber}:`, apiError.message || apiError);
            foldData.steps.push({
              stepNumber: step.stepNumber,
              instruction: "Instrução não pôde ser lida.",
              image: `data:image/jpeg;base64,${base64Image}`
            });
          }
        }
      }

      console.log('✅ Groq finalizado! Criando arquivo .fold...');

      // 3. Criar o arquivo .fold criptografado
      const foldFileName = `${req.file.filename}.fold`;
      const foldFilePath = path.join(jobOutputDir, foldFileName);
      
      createFoldFile(foldData, foldFilePath);

      // 4. Enviar o arquivo de volta para o aplicativo
      res.download(foldFilePath, req.file.originalname.replace('.pdf', '.fold'), (err) => {
        if (err) {
          console.error("Erro ao enviar o arquivo .fold:", err);
        }
        
        // Limpeza (opcional): apagar os arquivos temporários depois de enviar
        // fs.rmSync(jobOutputDir, { recursive: true, force: true });
        // fs.unlinkSync(pdfPath);
      });
      
    } catch (e) {
      console.error("Erro ao processar as imagens do PDF:", e);
      res.status(500).json({ error: 'Erro ao processar as imagens do PDF.' });
    }
  });
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
