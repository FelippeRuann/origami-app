import crypto from 'crypto';
import AdmZip from 'adm-zip';

// A chave mestra vem da variavel de ambiente FOLD_SECRET (nunca versionada).
// A derivacao e preguicosa para que o modulo possa ser importado antes de o
// ambiente estar carregado (Cloud Functions injeta segredos so em tempo de execucao).
let cachedKey = null;
function getSecretKey() {
  if (cachedKey) return cachedKey;
  const secret = process.env.FOLD_SECRET;
  if (!secret) {
    throw new Error('FOLD_SECRET nao definida. Configure a variavel de ambiente antes de ler ou gravar arquivos .fold.');
  }
  cachedKey = crypto.createHash('sha256').update(secret).digest();
  return cachedKey;
}
const IV_LENGTH = 16;

export function createFoldFile(data, outputPath) {
  const jsonString = JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', getSecretKey(), iv);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const finalEncryptedContent = iv.toString('hex') + ':' + encrypted;

  const zip = new AdmZip();
  zip.addFile("signature.txt", Buffer.from("OrigamiApp_Official_Format", "utf8"));
  zip.addFile("content.bin", Buffer.from(finalEncryptedContent, "utf8"));
  zip.writeZip(outputPath);
  return outputPath;
}
