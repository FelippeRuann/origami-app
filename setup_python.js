import { execSync } from 'child_process';

console.log("Verificando Python...");
try {
  console.log(execSync('python3 --version').toString());
  console.log("Instalando dependências do YOLO (Isso pode levar um minutinho)...");
  console.log(execSync('curl -sS https://bootstrap.pypa.io/get-pip.py | python3').toString());
  console.log(execSync('python3 -m pip install ultralytics PyMuPDF Pillow --no-cache-dir').toString());
  console.log("Tudo pronto!");
} catch (error) {
  console.error("Erro:", error.message);
  if (error.stdout) console.log("Stdout:", error.stdout.toString());
  if (error.stderr) console.error("Stderr:", error.stderr.toString());
}
