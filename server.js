import express from 'express';
import multer from 'multer';
import { spawn } from 'child_process';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import fs from 'fs';
import { createFoldFile, readFoldFile } from './src/lib/foldFormat.js';

const app = express();
const PORT = 3000;
const EXPO_PORT = 8082;

// Garantir que a pasta de uploads existe
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configurar o Multer para receber o PDF
const upload = multer({ dest: 'uploads/' });

// Rota da nossa API (Backend)
app.post('/api/upload-pdf', upload.single('pdf'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }
  
  console.log('📄 PDF recebido no backend:', req.file.originalname);
  
  // TODO: Aqui é onde vamos chamar o script Python com o YOLO no futuro!
  // Por enquanto, vamos apenas simular que deu certo.
  
  res.json({ 
    message: 'PDF recebido com sucesso no backend!', 
    filename: req.file.filename,
    originalName: req.file.originalname
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
