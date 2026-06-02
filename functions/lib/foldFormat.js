import crypto from 'crypto';
import AdmZip from 'adm-zip';

const SECRET_KEY = crypto.createHash('sha256').update('CHAVE_REMOVIDA').digest();
const IV_LENGTH = 16;

export function createFoldFile(data, outputPath) {
  const jsonString = JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const finalEncryptedContent = iv.toString('hex') + ':' + encrypted;

  const zip = new AdmZip();
  zip.addFile("signature.txt", Buffer.from("OrigamiApp_Official_Format", "utf8"));
  zip.addFile("content.bin", Buffer.from(finalEncryptedContent, "utf8"));
  zip.writeZip(outputPath);
  return outputPath;
}
