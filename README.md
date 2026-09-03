# OrigamiApp

Aplicativo mobile para quem dobra origami: descobrir tutoriais em vídeo, montar
uma biblioteca pessoal, retomar de onde parou e acompanhar a evolução por
conquistas e nível de dobradura.

React Native + Expo, com backend em Firebase.

<!-- Coloque aqui 3 ou 4 capturas de tela do app rodando, ou um GIF curto.
     É a primeira coisa que alguém olha — vale mais que qualquer parágrafo. -->

## O problema

Tutorial de origami está espalhado pela internet, misturado com bijuteria,
crochê e vlog que se passam por origami. E quando você acha um bom, perde o
ponto onde parou.

O app resolve as duas coisas: uma descoberta curada só com origami de verdade,
e progresso salvo passo a passo.

## Conversão de PDF em tutorial interativo

A parte mais ambiciosa do projeto. O usuário envia um diagrama de origami em PDF
e recebe de volta um tutorial navegável, passo a passo:

```
PDF
 ├─ pdfjs-dist renderiza cada página como imagem
 ├─ modelo YOLO (ONNX Runtime) detecta duas classes: capa e passo de dobradura
 ├─ Non-Max Suppression descarta detecções sobrepostas
 ├─ sharp recorta cada região detectada
 ├─ Gemini Vision descreve a ação de cada passo — funciona mesmo em diagramas
 │  japoneses sem texto, interpretando as setas
 └─ .fold: JSON cifrado em AES-256-CBC dentro de um zip assinado
```

O modelo YOLO foi treinado num dataset próprio de diagramas de origami, anotado
com apoio de um script de pré-anotação que usa os números dos passos impressos no
PDF como âncora — assim o trabalho manual vira corrigir caixas, não desenhá-las.

O `.fold` é um formato próprio: um zip com assinatura de autenticidade e conteúdo
cifrado.

## Decisões de arquitetura

**Clean Architecture.** Domínio, casos de uso, infraestrutura e apresentação em
camadas separadas, com as regras de negócio isoladas do Firebase e da UI.

**Navegação sem biblioteca.** As telas são resolvidas por renderização
condicional a partir do Context API, sem React Navigation.

**Estado global em Context API.** Sem Redux nem Zustand.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Linguagem | JavaScript (JSX) |
| Backend | Firebase: Auth, Firestore, Storage, Cloud Functions |
| Cache local | AsyncStorage |
| Visão computacional | ONNX Runtime + modelo YOLO próprio |
| IA generativa | Google Gemini (Vision) |
| Processamento de PDF | pdfjs-dist, @napi-rs/canvas, sharp |
| Build | EAS (Expo Application Services) |

## Como rodar

Requisitos: Node.js 20 e um projeto no Firebase.

```bash
npm install
cp .env.example .env    # preencha com suas credenciais
npm start
```

O servidor de conversão de PDF roda separado:

```bash
npm run dev
```

O `.env.example` lista todas as variáveis necessárias. Os pesos do modelo YOLO e
o dataset de treino não estão no repositório por serem binários grandes; sem eles
o app funciona normalmente, apenas a conversão de PDF fica indisponível.

## Estrutura

```
src/
  domain/        entidades e casos de uso — regras de negócio puras
  screens/       telas do app
  context/       AppContext, o estado global
  config/        identidades e contatos, lidos do ambiente
  lib/           formato .fold, processamento de PDF
functions/       Cloud Functions
scripts/         ferramentas de dataset e inspeção de arquivos .fold
```

## Modelo de negócio

Freemium. O plano gratuito dá até 10 origamis salvos e 3 buscas ao vivo por dia.
O plano Pro libera biblioteca ilimitada e o Estúdio do Origamista, onde quem
ensina publica tutoriais para seus seguidores e turmas.

---

Desenvolvido por [Felippe Ruann](https://github.com/FelippeRuann).
