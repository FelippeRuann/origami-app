import sys
import os
import json
import fitz  # PyMuPDF
from ultralytics import YOLO
from PIL import Image

def process_pdf(pdf_path, model_path, output_dir):
    try:
        # Carregar o modelo YOLO (best.pt)
        model = YOLO(model_path)
        
        # Abrir o PDF
        doc = fitz.open(pdf_path)
        
        results_data = {"cover": None, "steps": []}
        os.makedirs(output_dir, exist_ok=True)
        
        step_counter = 1
        
        # Passar por cada página do PDF
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Converter a página para imagem (resolução boa para o YOLO)
            pix = page.get_pixmap(dpi=200)
            img_path = os.path.join(output_dir, f"page_{page_num}.jpg")
            pix.save(img_path)
            
            # Rodar o YOLO na imagem da página (verbose=False para não sujar o log)
            results = model(img_path, verbose=False)
            
            # Processar os resultados (caixas encontradas)
            page_boxes = []
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    cls_name = model.names[cls_id]
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    page_boxes.append({
                        "cls_name": cls_name,
                        "x1": x1, "y1": y1, "x2": x2, "y2": y2
                    })
            
            # Ordenar as caixas da página na ordem de leitura (Cima -> Baixo, Esquerda -> Direita)
            # Agrupamos o eixo Y em "linhas" com tolerância de 150 pixels para manter itens lado a lado próximos.
            page_boxes.sort(key=lambda b: (int(b['y1'] / 150), b['x1']))

            for box in page_boxes:
                cls_name = box['cls_name']
                x1, y1, x2, y2 = box['x1'], box['y1'], box['x2'], box['y2']
                
                # Recortar a imagem original usando as coordenadas
                img = Image.open(img_path)
                crop_img = img.crop((x1, y1, x2, y2))
                
                if cls_name == "cover":
                        crop_path = os.path.join(output_dir, "cover.jpg")
                        crop_img.save(crop_path)
                        results_data["cover"] = crop_path
                    elif cls_name == "step":
                        crop_path = os.path.join(output_dir, f"step_{step_counter}.jpg")
                        crop_img.save(crop_path)
                        results_data["steps"].append({
                            "stepNumber": step_counter,
                            "imagePath": crop_path
                        })
                        step_counter += 1
                        
        # Imprimir o resultado em JSON para o Node.js ler
        print(json.dumps(results_data), flush=True)
        
    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Faltam argumentos. Uso: python process_pdf.py <pdf_path> <model_path> <output_dir>"}), flush=True)
        sys.exit(1)
        
    pdf_path = sys.argv[1]
    model_path = sys.argv[2]
    output_dir = sys.argv[3]
    
    process_pdf(pdf_path, model_path, output_dir)
