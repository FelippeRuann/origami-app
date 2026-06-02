# OrigamiApp
## Plataforma Digital para Entusiastas de Origami

### Documentação de Produto — v5
React Native + Expo | Modelo Freemium | Integração com API e Nuvem

---

| | |
|---|---|
| **Produto** | OrigamiApp — Biblioteca digital e comunidade de origami |
| **Persona** | Rafael, 22 anos — estudante universitário e entusiasta de arte |
| **Modelo** | Freemium — gratuito com recursos premium |
| **Plataforma** | Mobile (Android) — React Native + Expo |
| **Versão** | V5 — Integração com API e Nuvem |

---

## Sumário

1. Visão Geral da Entrega — Atividade 5
2. Arquitetura de Integração (App ↔ API ↔ Banco)
3. APIs e Serviços Integrados
4. Fluxo Online/Offline
5. Estrutura de Código para Requisições
6. Tratamento de Erros, Loading e Indicadores
— Resumo do Contexto Herdado

---

## 1. Visão Geral da Entrega — Atividade 5

Esta versão v5 documenta a **Integração com API e Nuvem** do OrigamiApp. O foco desta etapa foi conectar o aplicativo a múltiplos serviços externos — Firebase (autenticação e banco de dados em nuvem), YouTube Data API v3 (descoberta de conteúdo), Google Gemini AI (curadoria inteligente) e um servidor local Express.js (processamento de PDFs) — garantindo parsing correto de JSON, indicadores de carregamento e tratamento robusto de erros em todos os fluxos.

| **Integração Funcional** | Consumo real do Firebase Auth, Firestore, Storage e três APIs externas (YouTube, Gemini, Invidious) com dados exibidos dinamicamente nas telas. |
|---|---|
| **Parsing de JSON** | Respostas da YouTube Data API v3, Invidious API e Google Gemini AI são parseadas, validadas e normalizadas antes de serem exibidas ao usuário. |
| **Exibição de Dados Externos** | Tela `Discover` exibe vídeos buscados via API com título, thumbnail, duração, canal e nível de dificuldade classificado por IA. |
| **Indicação de Loading** | Estados de carregamento presentes em todas as operações assíncronas: busca de vídeos, upload de PDF, login, cadastro e conquistas. |
| **Tratamento de Erros** | Múltiplas camadas de fallback: quota excedida → RSS → Invidious → cache local. Erros de autenticação mapeados para mensagens amigáveis em português. |

---

## 2. Arquitetura de Integração (App ↔ API ↔ Banco)

### Diagrama Geral

```
┌─────────────────────────────────────────────────────────────────────┐
│                          ORIGAMIAPP (React Native + Expo)            │
│                                                                       │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│   │ Auth.jsx │  │Discover  │  │Library   │  │ Profile.jsx      │   │
│   │          │  │.jsx      │  │.jsx      │  │                  │   │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┬─────────┘   │
│        │              │              │                  │             │
│        └──────────────┴──────────────┴──────────────────┘            │
│                                    │                                  │
│                          ┌─────────▼──────────┐                      │
│                          │    AppContext.jsx    │                      │
│                          │  (Estado Global)    │                      │
│                          └────────┬────────────┘                      │
│                                   │                                   │
│          ┌───────────────┬─────────┴────────────┬──────────────┐     │
│          │               │                       │              │     │
│   ┌──────▼──────┐ ┌──────▼──────┐       ┌───────▼──────┐      │     │
│   │UserRepository│ │VideoDiscovery│       │ManageProjects│      │     │
│   │             │ │UseCase       │       │UseCase       │      │     │
│   └──────┬──────┘ └──────┬──────┘       └──────┬───────┘      │     │
│          │               │                      │              │     │
└──────────┼───────────────┼──────────────────────┼──────────────┘     
           │               │                      │                    
    ┌──────▼──────┐ ┌──────▼──────────────┐ ┌────▼──────────┐        
    │  FIREBASE   │ │   YOUTUBE / GEMINI  │ │  SERVER.JS    │        
    │             │ │                     │ │  (Express)    │        
    │ ● Auth      │ │ ● YouTube Data API  │ │               │        
    │ ● Firestore │ │ ● YouTube RSS Feed  │ │ ● POST /api/  │        
    │ ● Storage   │ │ ● Invidious API     │ │   upload-pdf  │        
    └──────┬──────┘ │ ● Gemini AI (Flash) │ └────┬──────────┘        
           │        └──────────┬──────────┘      │                    
           │                   │                  │                    
    ┌──────▼───────────────────▼──────────────────▼──────────┐        
    │                    AsyncStorage (Cache Local)            │        
    │  • Sessão de usuário  • Quota YouTube  • Prefs          │        
    │  • Projetos locais    • Termos buscados • Haptics       │        
    └─────────────────────────────────────────────────────────┘        
```

### Camadas da Arquitetura

| Camada | Arquivo(s) | Responsabilidade |
|---|---|---|
| **UI / Telas** | `Auth.jsx`, `Discover.jsx`, `Library.jsx`, `Profile.jsx` | Exibição de dados e disparo de ações do usuário |
| **Estado Global** | `AppContext.jsx` | Orquestra todas as chamadas às camadas inferiores e distribui o estado para as telas |
| **Casos de Uso** | `VideoDiscoveryUseCase.js`, `ManageProjectsUseCase.js` | Regras de negócio: curadoria, quota, fallback de APIs |
| **Repositórios** | `UserRepository.js`, `OrigamiProjectRepository.js` | Abstração de acesso a dados (Firebase + AsyncStorage) |
| **Fontes de Dados** | `LocalProjectDataSource.js`, `RemoteProjectDataSource.js` | Operações diretas no AsyncStorage e Firestore |
| **Configuração Firebase** | `src/firebase.js` | Inicialização do SDK, Auth com persistência, Firestore e Storage |
| **Servidor Local** | `server.js` | API Express para processamento de PDFs via Gemini Vision |

---

## 3. APIs e Serviços Integrados

### 3.1 Firebase Authentication

Gerencia o ciclo completo de autenticação do usuário.

| Método | Função Firebase | Utilização |
|---|---|---|
| Cadastro | `createUserWithEmailAndPassword` | Cria conta com e-mail e senha |
| Login | `signInWithEmailAndPassword` | Autentica com e-mail e senha |
| Google OAuth | `signInWithCredential` + `GoogleAuthProvider` | Login social via expo-auth-session |
| Logout | `signOut` | Encerra sessão e limpa estado |
| Reset de Senha | `sendPasswordResetEmail` | Envia e-mail de recuperação |
| Confirmar Reset | `confirmPasswordReset` | Aplica nova senha com código `oobCode` via deep link |
| Persistência | `getReactNativePersistence(AsyncStorage)` | Sessão sobrevive ao fechamento do app |

**Configuração (`src/firebase.js`):** As credenciais são carregadas exclusivamente via variáveis de ambiente (`EXPO_PUBLIC_FIREBASE_*`), não sendo versionadas no repositório.

---

### 3.2 Firebase Firestore

Banco de dados NoSQL em nuvem com estratégia híbrida (local-first).

| Coleção | Operações | Conteúdo |
|---|---|---|
| `users/{uid}` | `getDoc`, `setDoc`, `updateDoc` | Perfil, rank, isPro, isTeacher, watchedVideos, achievements, streak |
| `projects/{uid}` | `getDocs`, `addDoc`, `deleteDoc` | Projetos do usuário (YouTube e .fold) |
| `community_videos` | `getDocs`, `addDoc`, `updateDoc`, `getCountFromServer` | Vídeos curados pela IA (catálogo compartilhado) |
| `teacher_classes/{code}` | `getDoc`, `updateDoc` | Turmas de professores com lista de alunos |
| `video_quota` | `getDoc`, `setDoc` | Controle de quota diária da YouTube API |
| `processed_video_checks` | `addDoc` | Log de vídeos já analisados (evita reprocessamento) |
| `searched_terms` | `getDocs`, `addDoc` | Termos de busca já utilizados (rotação inteligente) |

---

### 3.3 Firebase Storage

Armazenamento de arquivos binários na nuvem.

| Operação | Caminho no Storage | Conteúdo |
|---|---|---|
| Upload de avatar | `users/{uid}/avatars/{uid}_{timestamp}.jpg` | Foto de perfil do usuário |
| Upload de .fold | `users/{uid}/folds/{filename}.fold` | Diagramas de origami importados pelo usuário |
| Download de URL | `getDownloadURL(ref)` | URL pública para exibição da imagem no app |

---

### 3.4 YouTube Data API v3

Busca e enriquecimento de vídeos de origami do YouTube.

| Endpoint | Custo (units) | Utilização |
|---|---|---|
| `search.list` | **100 units/req** | Busca vídeos por termo (ex: "origami crane beginner") |
| `videos.list` (contentDetails) | **1 unit/req** | Obtém duração (`ISO 8601`) dos vídeos encontrados |

**Gestão de Quota:**
- Limite diário: **10.000 units** (tier gratuito Google)
- Buffer de segurança: **300 units** reservadas
- Rastreamento local em `AsyncStorage` (`@yt_quota`) com reset automático a cada dia
- Rotação de **40+ termos de busca** rastreados em `AsyncStorage` (`@searched_terms`) para evitar repetição

**Parsing de resposta (`search.list`):**
```json
{
  "items": [
    {
      "id": { "videoId": "ABC123" },
      "snippet": {
        "title": "Easy Origami Crane",
        "channelTitle": "Jo Nakashima",
        "thumbnails": { "high": { "url": "https://..." } }
      }
    }
  ]
}
```
Cada item é normalizado para o formato interno `{ id, title, channelTitle, thumbnail, duration, source }`.

---

### 3.5 YouTube RSS Feed (Zero Quota)

Alternativa gratuita ao `search.list` para canais confiáveis cadastrados.

- **Endpoint:** `https://www.youtube.com/feeds/videos.xml?channel_id={id}`
- **Custo:** 0 units de quota
- **Parsing:** Regex aplicado no XML para extrair `<yt:videoId>`, `<title>`, `<published>`, `<media:description>`
- **Canais monitorados:** OrigamiByBoice, Tadashi Mori, Jo Nakashima, Mariano Zavala, SakuSaku Origami, Kade Chan, Origami Oritai
- **Limitação:** Exibe apenas os 15 vídeos mais recentes de cada canal

---

### 3.6 Invidious API (Fallback Gratuito)

Alternativa open-source ao YouTube quando a quota está esgotada.

- **Endpoint:** `{instância}/api/v1/search?q={query}&type=video&fields=...`
- **Instâncias configuradas:** `yewtu.be`, `inv.nadeko.net`, `invidious.privacydev.net`, `iv.melmac.space`
- **Comportamento:** Tenta cada instância em sequência com timeout de 8 segundos; se todas falharem, retorna array vazio sem travar o app
- **Custo:** 0 units

---

### 3.7 Google Gemini AI (Flash) — Curadoria de Vídeos

Classificação inteligente de vídeos usando modelo multimodal.

| Aspecto | Detalhe |
|---|---|
| **Modelo** | `gemini-3-flash-preview` |
| **SDK** | `@google/genai` (GoogleGenAI) |
| **Input** | Texto (título, canal, duração, descrição) + imagem inline da thumbnail (base64) |
| **Output** | JSON estruturado: `{ isOrigami, tags, difficulty, summary }` |
| **Schema forçado** | `responseMimeType: 'application/json'` + `responseSchema` tipado — garante parsing sem falhas |
| **Filtro pré-IA** | Keywords negativas verificadas antes da chamada para economizar tokens |

**Prompt de classificação:** Instrui o modelo a aceitar apenas tutoriais reais de dobradura de papel e rejeitar bijuteria, recorte puro, vlogs, "origami" como nome de marca, entre outros. A dificuldade pré-calculada por keywords locais é confirmada ou corrigida pela IA.

**Fallback quando a API falha:** O sistema verifica as keywords negativas localmente (`REJECT_KEYWORDS`) antes de aceitar o vídeo — evita que qualquer falha na API aprove conteúdo indevido.

---

### 3.8 Servidor Local Express.js — Processamento de PDF

API REST rodando localmente para converter PDFs de diagramas no formato `.fold`.

| | |
|---|---|
| **Endpoint** | `POST /api/upload-pdf` |
| **Porta** | `3000` |
| **Body** | `multipart/form-data` com campo `pdf` (arquivo) |
| **Resposta** | JSON com array `steps: [{ stepNumber, instruction, image }]` |
| **Tecnologia** | Express.js + Multer (upload) + Gemini Vision (leitura de imagens das páginas) |

**Fluxo interno do servidor:**
1. Recebe o PDF via Multer e salva em `uploads/`
2. Converte as páginas do PDF em imagens
3. Envia cada imagem ao Gemini Vision com prompt especializado
4. Extrai instruções de dobra de cada etapa
5. Monta o arquivo `.fold` (JSON estruturado) e retorna ao app

---

## 4. Fluxo Online/Offline

O OrigamiApp adota uma **estratégia Local-First**: dados são persistidos localmente via AsyncStorage antes de qualquer sincronização com a nuvem. Isso garante funcionamento mesmo sem conexão.

### Diagrama do Fluxo

```
Usuário inicia ação
        │
        ▼
┌───────────────────┐     Sem conexão     ┌──────────────────────┐
│  Tenta operação   ├────────────────────►│  Salva localmente    │
│  no Firebase/API  │                     │  (AsyncStorage)      │
└────────┬──────────┘                     └──────────────────────┘
         │ Com conexão
         ▼
┌───────────────────┐    Sucesso          ┌──────────────────────┐
│  Firebase /       ├────────────────────►│  Atualiza estado     │
│  YouTube API      │                     │  global (Context)    │
└────────┬──────────┘                     └──────────────────────┘
         │ Erro / Timeout
         ▼
┌───────────────────┐
│  Fallback:        │
│  1. AsyncStorage  │
│  2. RSS Feed      │
│  3. Invidious API │
└───────────────────┘
```

### Comportamento por Funcionalidade

| Funcionalidade | Online | Offline |
|---|---|---|
| **Login** | Firebase Auth + busca Firestore | Sessão restaurada via AsyncStorage (`getReactNativePersistence`) |
| **Biblioteca pessoal** | Sincroniza com Firestore | Carrega de `AsyncStorage` (`@projects_{uid}`) |
| **Discover — vídeos** | YouTube API → Gemini AI → Firestore | Exibe `community_videos` cacheados |
| **Conquistas e streak** | Salva no Firestore | Salva localmente; sincroniza ao reconectar |
| **Perfil e configurações** | Atualiza Firestore | Persiste preferências em AsyncStorage |
| **Upload de PDF** | Envia ao servidor local → retorna `.fold` | Indisponível (requer servidor) |
| **Quota YouTube** | Rastreada no Firestore e AsyncStorage | Mantém controle local diário |

---

## 5. Estrutura de Código para Requisições

O projeto segue a **Clean Architecture**, separando as chamadas de API em camadas bem definidas.

### Organização das Pastas

```
src/
├── firebase.js                          # Configuração e inicialização Firebase
├── context/
│   └── AppContext.jsx                   # Orquestrador: chama UseCases, distribui estado
├── domain/
│   ├── entities/
│   │   ├── User.js                      # Entidade de domínio: usuário
│   │   └── OrigamiProject.js            # Entidade de domínio: projeto
│   └── usecases/
│       ├── VideoDiscoveryUseCase.js     # Curadoria: YouTube + Gemini + RSS + Invidious
│       └── ManageProjectsUseCase.js     # CRUD de projetos do usuário
├── data/
│   ├── datasources/
│   │   ├── LocalProjectDataSource.js   # Operações AsyncStorage
│   │   └── RemoteProjectDataSource.js  # Operações Firestore
│   └── repositories/
│       ├── UserRepository.js           # Auth + Firestore (usuário)
│       └── OrigamiProjectRepository.js # Projetos (híbrido local + nuvem)
└── utils/
    └── haptics.js                       # Utilitário de feedback tátil
```

### Padrão de Chamada à API

Todas as requisições seguem o mesmo padrão assíncrono com tratamento de erro isolado na camada de repositório, sem que a UI lide com exceções diretamente:

```
UI (tela)
  → chama função do AppContext (ex: saveOrigami)
    → AppContext chama UseCase ou Repository (ex: OrigamiProjectRepository.save)
      → Repository tenta AsyncStorage primeiro (rápido)
      → Repository tenta Firebase em segundo (persistência longa)
        → Em caso de erro: warn local, dado já está no AsyncStorage
```

### Exemplo: Fluxo de Descoberta de Vídeos

```
Discover.jsx
  → chama VideoDiscoveryUseCase.discoverVideos(apiKey)
    1. Verifica quota diária (AsyncStorage + Firestore)
    2. Se quota OK → YouTube search.list (100 units)
       Se quota baixa → RSS Feed (0 units)
       Se RSS falha → Invidious API (0 units)
    3. Para cada vídeo: pre-filtra por keywords
    4. Vídeos que passam → Gemini AI (análise multimodal)
    5. Aprovados → salvos em community_videos (Firestore)
    6. Retorna lista formatada para exibição
```

---

## 6. Tratamento de Erros, Loading e Indicadores

### 6.1 Indicadores de Carregamento (Loading States)

| Tela / Operação | Indicador |
|---|---|
| Login / Cadastro | Botão desabilitado + texto "Entrando..." / "Criando..." |
| Busca de vídeos (Discover) | `ActivityIndicator` centralizado durante o scan da IA |
| Upload de PDF | Estado `isConverting` — botão desabilitado com feedback visual |
| Carregamento inicial do app | Tela em branco com `backgroundColor: theme.bg` enquanto `isAuthReady = false` |
| Ações de conquista | Toast animado (`AchievementToast`) com barra de progresso visual |

### 6.2 Tratamento de Erros por Camada

**Autenticação (Firebase Auth):**

| Código de Erro | Mensagem exibida ao usuário |
|---|---|
| `auth/invalid-credential` | "E-mail ou senha incorretos." |
| `auth/email-already-in-use` | "Este e-mail já está cadastrado. Tente fazer login." |
| `auth/user-not-found` | "Nenhuma conta encontrada com este e-mail." |
| `auth/too-many-requests` | "Muitas tentativas. Tente novamente mais tarde." |
| `auth/expired-action-code` | "O código expirou. Solicite um novo e-mail de recuperação." |
| `auth/weak-password` | "A senha é muito fraca. Use pelo menos 6 caracteres." |

**YouTube API:**

| Situação | Comportamento |
|---|---|
| `quotaExceeded` | Interrompe busca por YouTube, ativa fallback RSS/Invidious |
| Resposta com `data.error` | Lança erro mapeado; não exibe dados parciais |
| Timeout / rede indisponível | `try/catch` silencioso; usa dados do cache Firestore |

**Gemini AI:**

| Situação | Comportamento |
|---|---|
| API indisponível | Fallback: verifica `REJECT_KEYWORDS` localmente antes de aceitar o vídeo |
| JSON inválido na resposta | `responseSchema` tipado previne parsing incorreto |
| Thumbnail inacessível | Prossegue a análise apenas com os dados textuais |

**Firebase Firestore:**

Todas as operações de escrita no Firestore são envolvidas em `try/catch`. Em caso de falha, um `console.warn` indica "salvo localmente, pendente sync" — o dado já está no AsyncStorage e será sincronizado na próxima conexão.

**Invidious API:**

Tenta 4 instâncias em sequência com `AbortSignal.timeout(8000)` por instância. Se todas falharem, retorna array vazio sem propagar erro para a UI.

---

## Resumo

| **Persona** | Rafael, 22 anos, estudante de design e entusiasta de arte. Procura um app organizado para não precisar buscar diagramas em vários sites. |
|---|---|
| **Jornada** | Descobre o app → Cadastra-se no Firebase → Explora vídeos curados por IA → Salva na biblioteca → Acompanha conquistas e streak → Converte para Premium. |
| **Proposta** | O lugar certo para descobrir, salvar e estudar modelos de origami — do iniciante ao avançado, com curadoria inteligente e comunidade organizada. |

| **PROPOSTA DE VALOR** | Para entusiastas do origami que sofrem com diagramas espalhados por toda a internet, o OrigamiApp integra Firebase, YouTube API e Gemini AI para entregar um catálogo curado, personalizado e sempre sincronizado — online ou offline. |
|---|---|

---

*OrigamiApp • Documentação Acadêmica • React Native + Expo • v5*
