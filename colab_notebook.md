# Treinador de Visão Sem Restrições Comerciais (Google MediaPipe / EfficientDet)

Siga este bloco de passos no seu Google Colab "limpo" (depois de excluir o ambiente antigo).

## Passo 1: No Roboflow (A Extracão)
Vá no seu projeto do Roboflow. Clique em **"Export Dataset"**.
No menu que abrir, não escolha YOLO. Escolha o formato chamado **"COCO"** (seja COCO JSON ou COCO format).
Baixe o arquivo `.zip` para o seu computador.

## Passo 2: Mandar o ZIP pro Colab
Abra o Google Colab.
No canto esquerdo, clique no ícone de **Pasta**.
Arraste o seu `.zip` do Roboflow e solte ali para fazer o Upload (espere carregar 100%).

## Passo 3: Limpeza e Instalação (Célula 1)
Copie e cole este código e rode:

```python
# Instala a ferramenta ultra-moderna do Google (Sem dores de cabeça do passado)
!pip install -q mediapipe-model-maker
print("Instalação com sucesso do motor do Google!")
```

## Passo 4: Descompactar as Imagens (Célula 2)
Mude a palavra "cole_o_nome_do_seu_arquivo.zip" pelo nome verdadeiro do zip que você fez upload no passo 2. Depois rode a célula.

```python
import zipfile
import os

zip_path = "/content/cole_o_nome_do_seu_arquivo.zip" # <-- MUDE AQUI

with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall("/content/dataset")

print("Seus origamis foram abertos na pasta /content/dataset")
```

## Passo 5: Treinamento Mágico e Novo Cérebro (Célula 3)
Esse script acha a pasta train e valid do seu COCO, amarra no cérebro limpo do Google (EfficientDet-Lite0) e frita na placa de vídeo do Colab. Apenas rode e espere ele acabar.

```python
import os
from mediapipe_model_maker import object_detector

print("Lendo as imagens com as marcações...")
# O Roboflow COCO separa em train e valid e cria um _annotations.coco.json
train_data = object_detector.Dataset.from_coco_folder(
    "/content/dataset/train", 
    "/content/dataset/train/_annotations.coco.json"
)

validation_data = object_detector.Dataset.from_coco_folder(
    "/content/dataset/valid", 
    "/content/dataset/valid/_annotations.coco.json"
)

# Escolhendo modelo e dizendo pra ele dar 50 voltas de aprendizado
options = object_detector.ObjectDetectorOptions(
    supported_model=object_detector.SupportedModels.EFFICIENTDET_LITE0,
    epochs=50,
    batch_size=8,
    learning_rate=0.1
)

print("Iniciando o treinamento do cérebro (Aguarde alguns minutos)...")
model = object_detector.ObjectDetector.create(
    train_data=train_data,
    validation_data=validation_data,
    options=options
)

# Salvar o robô
print("Treinamento finalizado! Exportando modelo para TFLite...")
model.export_model("/content/exportado")

print("Tudo pronto! Seu modelo foi salvo na pasta /content/exportado/model.tflite")
```

## Passo 6: Download do Seu Cérebro Livre!
Clique na pasta `exportado` na esquerda do Colab. Você verá um arquivo chamado `model.tflite`.
Clique nos 3 pontinhos dele e dê **Download**.

Pronto! Esse `model.tflite` é o seu arquivo final e blindado legalmente de graça. Na ferramenta local do Python, em vez de importar "yolo", o outro Engenheiro de Chat usará esse `.tflite` (que é absurdamente leve e pode até rodar dentro do próprio celular offline um dia se você quiser, sem servidor na nuvem!).
