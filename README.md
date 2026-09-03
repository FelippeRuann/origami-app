# OrigamiApp

Aplicativo mobile para quem dobra origami: descobrir tutoriais em vídeo, montar
uma biblioteca pessoal, retomar de onde parou e acompanhar a evolução por
conquistas e nível de dobradura.

Feito em React Native + Expo, com backend em Firebase.

> **Status:** projeto pessoal em desenvolvimento ativo desde abril de 2026.
> Funcional ponta a ponta, ainda não publicado nas lojas.

<!-- Coloque aqui 3 ou 4 capturas de tela do app rodando, ou um GIF curto.
     É a primeira coisa que alguém olha — vale mais que qualquer parágrafo. -->

## O problema

Tutorial de origami está espalhado pela internet, misturado com bijuteria,
crochê e vlog que se passam por origami. E quando você acha um bom, perde o
ponto onde parou.

O app resolve as duas coisas: uma descoberta curada só com origami de verdade,
e progresso salvo passo a passo.

## O que tem de interessante tecnicamente

**Conversão de PDF em tutorial interativo.** A parte mais ambiciosa do projeto.
O usuário envia um diagrama de origami em PDF e recebe de volta um tutorial
navegável passo a passo:

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

O modelo YOLO foi treinado num dataset próprio de diagramas de origami
(`models/oricoco/`). O formato `.fold` é um container próprio — um zip com
assinatura de autenticidade e conteúdo cifrado.

**Clean Architecture.** O código é separado em camadas (domínio, casos de uso,
infraestrutura, apresentação), com as regras de negócio isoladas do Firebase e
da UI.

**Sem biblioteca de navegação.** A navegação entre telas é resolvida por
renderização condicional a partir do Context API, sem React Navigation.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native 0.81 + Expo SDK 54 |
| Linguagem | JavaScript (JSX) |
| Estado | Context API — sem Redux ou Zustand |
| Backend | Firebase: Auth, Firestore, Storage, Cloud Functions |
| Cache local | AsyncStorage |
| Visão computacional | ONNX Runtime + modelo YOLO próprio |
| IA generativa | Google Gemini (Vision) |
| Processamento de PDF | pdfjs-dist, @napi-rs/canvas, sharp |
| Build | EAS (Expo Application Services) |

## Como rodar

Requisitos: Node.js 20 e uma conta no Firebase.

```bash
npm install
cp .env.example .env    # preencha com suas credenciais
npm start               # abre o Expo
```

Para o servidor de conversão de PDF, que roda separado:

```bash
npm run dev
```

O `.env.example` lista todas as variáveis necessárias. As chaves do Firebase
saem do console do projeto; a `FOLD_SECRET` é a chave mestra da criptografia
dos arquivos `.fold` e pode ser qualquer valor aleatório.

## Estrutura

```
src/
  domain/        entidades e casos de uso — regras de negócio puras
  screens/       telas do app
  context/       AppContext, o estado global
  lib/           formato .fold, processamento de PDF
functions/       Cloud Functions (conversão de PDF, lookups de usuário)
models/          modelo YOLO treinado e dataset de origami
```

## Modelo de negócio

Freemium. O plano gratuito dá até 10 origamis salvos e 3 buscas ao vivo por dia.
O plano Pro libera biblioteca ilimitada e o Estúdio do Origamista, onde quem
ensina publica tutoriais para seus seguidores e turmas.

O pagamento ainda não está integrado.

## Roadmap

- [ ] Integrar pagamento do plano Pro
- [ ] Migrar as consultas de usuário para as Cloud Functions já escritas
- [ ] App Check no Firebase
- [ ] Publicar na Play Store

---

Desenvolvido por [Felippe Ruann](https://github.com/FelippeRuann).
