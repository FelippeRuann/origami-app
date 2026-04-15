import crypto from 'crypto';
import AdmZip from 'adm-zip';

// A chave secreta mestre do seu aplicativo (Deve ser guardada a 7 chaves no .env no futuro)
const SECRET_KEY = crypto.createHash('sha256').update('CHAVE_REMOVIDA').digest();
const IV_LENGTH = 16; // Para AES, o Initialization Vector tem 16 bytes

/**
 * Função que pega os dados do Origami, transforma em JSON, criptografa e salva como .fold
 */
export function createFoldFile(data, outputPath) {
  // 1. Transforma os dados em uma string JSON
  const jsonString = JSON.stringify(data);

  // 2. Criptografia AES-256-CBC (Padrão militar/bancário)
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
  
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // 3. Junta o IV (necessário para descriptografar depois) com o conteúdo criptografado
  const finalEncryptedContent = iv.toString('hex') + ':' + encrypted;

  // 4. Cria um arquivo ZIP em memória
  const zip = new AdmZip();
  
  // Adiciona a sua "assinatura" para provar que o arquivo é autêntico do seu app
  zip.addFile("signature.txt", Buffer.from("OrigamiApp_Official_Format", "utf8"));
  
  // Adiciona o conteúdo criptografado
  zip.addFile("content.bin", Buffer.from(finalEncryptedContent, "utf8"));

  // 5. Salva no disco com a extensão .fold
  zip.writeZip(outputPath);

  return outputPath;
}

/**
 * Função que o aplicativo vai usar para ler o arquivo .fold
 */
export function readFoldFile(filePath) {
  try {
    // 1. Abre o "ZIP" disfarçado
    const zip = new AdmZip(filePath);
    
    // 2. Verifica a assinatura (Se não tiver, não é um arquivo seu!)
    const signatureEntry = zip.getEntry("signature.txt");
    if (!signatureEntry || signatureEntry.getData().toString('utf8') !== "OrigamiApp_Official_Format") {
      throw new Error("Arquivo .fold inválido ou corrompido.");
    }

    // 3. Pega o conteúdo criptografado
    const contentEntry = zip.getEntry("content.bin");
    if (!contentEntry) {
      throw new Error("Conteúdo do origami não encontrado.");
    }
    
    const encryptedContent = contentEntry.getData().toString('utf8');

    // 4. Separa o IV do texto criptografado
    const textParts = encryptedContent.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');

    // 5. Descriptografa
    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    // 6. Transforma de volta em Objeto JavaScript
    return JSON.parse(decrypted.toString('utf8'));

  } catch (error) {
    console.error("Tentativa de invasão ou arquivo corrompido:", error);
    throw new Error("Não foi possível ler este arquivo de origami.");
  }
}
