# OrigamiApp
## Plataforma Digital para Entusiastas de Origami

### Documentação Final de Produto — v6
**Defesa do Projeto — Trabalho de Conclusão de Disciplina**

React Native + Expo | Firebase | YouTube API | Google Gemini AI | Modelo Freemium

---

| | |
|---|---|
| **Produto** | OrigamiApp — Biblioteca digital e comunidade de origami |
| **Persona** | Rafael, 22 anos — estudante universitário e entusiasta de arte |
| **Modelo de Negócio** | Freemium — gratuito com recursos premium desbloqueáveis |
| **Plataforma** | Mobile (Android/iOS) — React Native + Expo SDK 54 |
| **Versão** | V6 — Projeto Final Completo |
| **Arquitetura** | Clean Architecture (Entities → UseCases → Repositories → Datasources) |
| **Backend** | Firebase (Auth + Firestore + Storage) + Express.js local |

---

## Sumário

1. O Problema e a Proposta de Valor
2. Funcionalidades Implementadas
3. Arquitetura Técnica
4. Modelo de Dados Completo
5. Integrações com APIs e Nuvem
6. Experiência do Usuário (UX/UI)
7. Segurança e Autenticação
8. Modelo de Negócio Freemium
9. Desafios Encontrados e Soluções
10. Conclusão

---

## 1. O Problema e a Proposta de Valor

### O Problema

Entusiastas de origami enfrentam um problema cotidiano e frustrante: o conteúdo de qualidade está espalhado por dezenas de canais do YouTube, sites pessoais de origamistas e comunidades fragmentadas. Não existe um lugar centralizado onde um iniciante possa descobrir tutoriais adequados ao seu nível, salvar os que gosta, acompanhar seu progresso e ainda interagir com uma comunidade organizada.

Além disso, a descoberta de conteúdo relevante é prejudicada por algoritmos genéricos que misturam vídeos de joalheria, recorte de papel e vlogs junto com tutoriais reais de dobradura — tornando a busca manual cansativa e ineficiente.

### A Solução

O **OrigamiApp** resolve esse problema através de três pilares:

| Pilar | Descrição |
|---|---|
| **Descoberta Inteligente** | Curadoria automática via Gemini AI que analisa título, canal, duração e thumbnail de cada vídeo para garantir que apenas tutoriais reais de origami cheguem ao usuário |
| **Biblioteca Pessoal** | Espaço organizado onde o usuário salva vídeos do YouTube e importa diagramas em PDF, com progresso rastreado individualmente |
| **Comunidade Estruturada** | Sistema de professores e alunos com códigos de convite, publicação de atividades e painel exclusivo para instrutores |

### Proposta de Valor

> *"Para entusiastas do origami que sofrem com tutoriais espalhados por toda a internet, o OrigamiApp é o lugar certo para descobrir, salvar e estudar modelos — do iniciante ao avançado — com uma comunidade organizada entre usuários e professores."*

---

## 2. Funcionalidades Implementadas

### 2.1 Autenticação e Perfil

| Funcionalidade | Descrição |
|---|---|
| **Cadastro com nível** | Usuário informa seu nível (Iniciante, Intermediário, Avançado) no cadastro, personalizando o feed desde o primeiro acesso |
| **Login e-mail/senha** | Autenticação via Firebase com sessão persistente (sobrevive ao fechamento do app) |
| **Login com Google** | OAuth via expo-auth-session + GoogleAuthProvider |
| **Recuperação de senha** | Envio de e-mail via Firebase + tela de redefinição integrada ao app por deep link (`origami-app://reset?oobCode=...`) |
| **Foto de perfil** | Upload direto da galeria para Firebase Storage com recorte quadrado |
| **Rank automático** | Progressão automática de nível (Iniciante → Intermediário → Avançado) baseada em vídeos assistidos e streak |

### 2.2 Tela Discover — Curadoria com IA

| Funcionalidade | Descrição |
|---|---|
| **Scan de vídeos com IA** | Busca vídeos via YouTube API, filtra com Gemini AI e salva no catálogo compartilhado (`community_videos`) |
| **Classificação de dificuldade** | Algoritmo por keywords (pré-filtro local) + confirmação/correção pelo Gemini AI |
| **Salvar no coração** | Botão de coração com haptic feedback que adiciona o vídeo à biblioteca pessoal |
| **Fallback de quota** | Quando a quota da YouTube API está esgotada, o sistema recorre automaticamente a RSS Feed e depois à Invidious API (custo zero) |
| **Canais confiáveis** | Lista curada de 7 canais de origamistas reconhecidos (Jo Nakashima, Tadashi Mori, etc.) monitorados via RSS |

### 2.3 Biblioteca Pessoal

| Funcionalidade | Descrição |
|---|---|
| **Lista de vídeos salvos** | Exibe todos os projetos salvos com título, progresso e data |
| **Importar PDF de diagrama** | Upload de PDF para o servidor local, processamento via Gemini Vision e conversão para formato `.fold` com passos numerados |
| **Adicionar YouTube manualmente** | Campo para colar URL de vídeo e salvar diretamente na biblioteca |
| **Entrar em turma** | Campo de código de convite (formato `XXXX-XXXX` ou `XXXXXXXX`) para ingressar na turma de um professor |
| **Limites do plano Free** | Máximo de 10 vídeos e 3 arquivos `.fold` na biblioteca; arquivos `.fold` limitados a 10 MB |

### 2.4 FoldingScreen — Passo a Passo

| Funcionalidade | Descrição |
|---|---|
| **Visualizador de passos** | Navegação entre etapas com imagem e instrução textual extraídas do PDF pelo Gemini Vision |
| **Controles de navegação** | Botões "Anterior" e "Próximo" com indicador de progresso (passo X de Y) |
| **Botão Concluir** | Registra a conclusão e retorna à biblioteca |
| **Estado sem passos** | Tela informativa quando o diagrama não possui etapas extraídas, com botão para fechar |

### 2.5 Perfil e Gamificação

| Funcionalidade | Descrição |
|---|---|
| **Estatísticas** | Contador de vídeos assistidos, dias de streak e número de arquivos `.fold` abertos |
| **Sistema de conquistas** | 15 conquistas desbloqueáveis cobrindo vídeos assistidos (1, 10, 50, 100), diagramas abertos, streaks (3, 7, 14, 30, 100 dias), plano Pro e evolução de rank |
| **Toast de conquista animado** | Notificação visual que desliza do topo da tela com spring animation, barra de progresso e haptic de sucesso ao desbloquear uma conquista |
| **Streak diário** | Registra o último acesso e incrementa a sequência de dias consecutivos |
| **Tema claro/escuro** | Alternância completa de tema com design tokens aplicados em todas as telas |

### 2.6 Configurações

| Funcionalidade | Descrição |
|---|---|
| **Notificações** | Lembrete diário configurável por horário (07:00–22:00) e alerta de streak às 20:00 |
| **Vibração (haptics)** | Toggle para ativar/desativar feedback tátil em botões e conquistas, persistido por usuário no AsyncStorage |
| **Plano Pro** | Tela de assinatura com lista de benefícios e botão de upgrade/downgrade |
| **Editar perfil** | Troca de foto, ícone de avatar e nível de origami |

### 2.7 TeacherPro — Painel do Professor

| Funcionalidade | Descrição |
|---|---|
| **Código de convite exclusivo** | Cada professor possui um código único (`XXXX-XXXX`) gerado no cadastro |
| **Gerenciamento de alunos** | Lista de alunos matriculados com opção de remoção |
| **Publicação de atividades** | Criação e envio de atividades para todos os alunos da turma |
| **Acesso restrito** | Tela visível apenas para usuários com `isTeacher: true` |

### 2.8 AdminDiscovery — Painel de Administração

Tela exclusiva para administradores executarem o scan de vídeos com IA, acompanhando o progresso em tempo real e gerenciando o catálogo da plataforma.

---

## 3. Arquitetura Técnica

O projeto foi desenvolvido seguindo os princípios da **Clean Architecture**, garantindo separação clara de responsabilidades, testabilidade e manutenibilidade.

### 3.1 Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAMADA DE APRESENTAÇÃO (UI)                   │
│   Auth  │  Discover  │  Library  │  Profile  │  TeacherPro      │
│                DetailScreen │ FoldingScreen                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Lê/Escreve via Context
┌───────────────────────────────▼─────────────────────────────────┐
│               CAMADA DE ESTADO GLOBAL (AppContext)               │
│     Orquestra UseCases e Repositories. Distribui estado          │
│     via React Context API para todas as telas.                   │
└──────────────┬──────────────────────────┬───────────────────────┘
               │                          │
┌──────────────▼────────────┐  ┌──────────▼───────────────────────┐
│   CAMADA DE CASOS DE USO   │  │   CAMADA DE REPOSITÓRIOS         │
│  VideoDiscoveryUseCase    │  │  UserRepository                  │
│  ManageProjectsUseCase    │  │  OrigamiProjectRepository        │
└──────────────┬────────────┘  └──────────┬───────────────────────┘
               │                          │
┌──────────────▼──────────────────────────▼───────────────────────┐
│               CAMADA DE FONTES DE DADOS                          │
│   LocalProjectDataSource   │   RemoteProjectDataSource          │
│        (AsyncStorage)      │        (Firebase Firestore)        │
└─────────────────────────────────────────────────────────────────┘
               │                          │
┌──────────────▼──────────────────────────▼───────────────────────┐
│              SERVIÇOS EXTERNOS                                    │
│  Firebase Auth  │  Firestore  │  Storage  │  YouTube API         │
│  Gemini AI      │  Invidious  │  RSS Feed │  Express Server      │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Estrutura de Pastas

```
origami-organizer/
├── App.js                          # Ponto de entrada, MainNavigator, AchievementToast
├── app.json                        # Config Expo: nome, ícone, splash, deep link scheme
├── server.js                       # API Express para processamento de PDF
├── .env                            # Chaves de API (não versionado)
│
├── src/
│   ├── firebase.js                 # Inicialização Firebase (Auth, Firestore, Storage)
│   │
│   ├── context/
│   │   └── AppContext.jsx          # Estado global, autenticação, conquistas, streak
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── User.js             # Entidade: id, name, email, isPro, rank, streak...
│   │   │   └── OrigamiProject.js   # Entidade: id, title, url, type (youtube|.fold)
│   │   └── usecases/
│   │       ├── VideoDiscoveryUseCase.js  # YouTube + Gemini + RSS + Invidious
│   │       └── ManageProjectsUseCase.js # CRUD projetos com validação
│   │
│   ├── data/
│   │   ├── datasources/
│   │   │   ├── LocalProjectDataSource.js   # AsyncStorage
│   │   │   └── RemoteProjectDataSource.js  # Firebase Firestore
│   │   └── repositories/
│   │       ├── UserRepository.js           # Auth + Firestore (usuário)
│   │       └── OrigamiProjectRepository.js # Híbrido local + nuvem
│   │
│   ├── screens/
│   │   ├── Auth.jsx                # Login, Cadastro, Esqueci Senha, Reset Senha
│   │   ├── Discover.jsx            # Feed curado por IA
│   │   ├── Library.jsx             # Biblioteca pessoal
│   │   ├── Profile.jsx             # Perfil, conquistas, configurações
│   │   ├── DetailScreen.jsx        # Detalhes do projeto + vídeo YouTube
│   │   ├── FoldingScreen.jsx       # Passo a passo do diagrama .fold
│   │   ├── TeacherPro.jsx          # Painel do professor
│   │   ├── AdminDiscovery.jsx      # Admin: scan de vídeos com IA
│   │   └── ResetPasswordScreen.jsx # Redefinição de senha via deep link
│   │
│   ├── components/
│   │   ├── Layout.jsx              # Tab Bar inferior + ScrollView paginado
│   │   └── AchievementToast.jsx    # Toast animado de conquista
│   │
│   └── utils/
│       └── haptics.js              # Utilitário expo-haptics
```

### 3.3 Princípios Aplicados

| Princípio | Aplicação no Projeto |
|---|---|
| **Separação de Responsabilidades** | UI nunca acessa Firebase diretamente; toda lógica fica em UseCases e Repositories |
| **Local-First** | Dados salvos primeiro no AsyncStorage, depois sincronizados com Firestore |
| **Inversão de Dependência** | `AppContext` depende de abstrações (UseCase), não de implementações concretas |
| **Fallback em Cascata** | YouTube API → RSS → Invidious → cache; cada camada tem seu contingente |
| **Variáveis de Ambiente** | Todas as chaves de API em `.env` via `process.env.EXPO_PUBLIC_*`, nunca versionadas |

---

## 4. Modelo de Dados Completo

### Coleção: `users` — Usuários

| Campo | Tipo | Descrição |
|---|---|---|
| `uid` (document_id) | string | ID único do Firebase Authentication |
| `username` | string | Nome de exibição |
| `email` | string | E-mail de autenticação |
| `photo` | string | URL da imagem no Firebase Storage ou ícone padrão |
| `rank` | string | `Iniciante` \| `Intermediário` \| `Avançado` |
| `isPro` | boolean | Plano Premium ativo |
| `isTeacher` | boolean | Perfil de instrutor |
| `watchedVideos` | number | Total de vídeos assistidos (progressão de rank) |
| `folds` | number | Total de diagramas `.fold` abertos |
| `streak` | number | Dias consecutivos de acesso |
| `lastStreakDate` | string | ISO date do último acesso (para calcular streak) |
| `achievements` | array | IDs das conquistas desbloqueadas |
| `teacherCode` | string | Código de convite único do professor (`XXXX-XXXX`) |
| `notificationPrefs` | object | `{ dailyReminder, reminderTime, streakAlert }` |
| `createdAt` | string | ISO timestamp de criação da conta |

### Coleção: `projects` — Projetos do Usuário

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | ID único gerado por `Date.now()` |
| `title` | string | Título do projeto |
| `url` | string | URL do vídeo YouTube ou caminho do arquivo |
| `videoId` | string | ID do vídeo no YouTube |
| `type` | string | `youtube` \| `.fold` |
| `progress` | string | Percentual de progresso (`0%` a `100%`) |
| `date` | string | Data de salvamento (`Agora`, ou data formatada) |
| `data` | object\|null | Conteúdo do arquivo `.fold` com array de `steps` |

### Coleção: `community_videos` — Catálogo Curado por IA

| Campo | Tipo | Descrição |
|---|---|---|
| `videoId` | string | ID único do YouTube |
| `title` | string | Título do vídeo |
| `channelTitle` | string | Nome do canal |
| `channelId` | string | ID do canal no YouTube |
| `thumbnail` | string | URL da thumbnail |
| `duration` | string | Duração formatada (`MM:SS` ou `HH:MM:SS`) |
| `difficulty` | string | `easy` \| `intermediate` \| `hard` |
| `tags` | array | Tags geradas pelo Gemini AI |
| `aiSummary` | string | Descrição gerada pelo Gemini AI |
| `verifiedByAi` | boolean | Confirmação de que é um tutorial real de origami |
| `addedAt` | timestamp | Data de adição ao catálogo |
| `source` | string | `youtube` \| `rss` \| `invidious` |

### Coleção: `teacher_classes` — Turmas

| Campo | Tipo | Descrição |
|---|---|---|
| `code` | string | Código único (`XXXX-XXXX`) — document ID |
| `teacherId` | string | UID do professor |
| `students` | array | Lista de UIDs dos alunos matriculados |
| `activities` | array | Atividades publicadas pelo professor |

### AsyncStorage (Cache Local)

| Chave | Conteúdo |
|---|---|
| `@projects_{uid}` | Array de projetos do usuário |
| `@notif_prefs_{uid}` | Preferências de notificação |
| `@haptics_{uid}` | Estado do toggle de vibração |
| `@yt_quota` | `{ date, used }` — controle de quota diária da YouTube API |
| `@searched_terms` | Array de termos já utilizados na busca |

---

## 5. Integrações com APIs e Nuvem

### 5.1 Mapa de Integrações

```
                    ┌─────────────────────┐
                    │      ORIGAMIAPP      │
                    └──────────┬──────────┘
           ┌──────────┬────────┴────────┬──────────┐
           ▼          ▼                 ▼           ▼
    ┌──────────┐ ┌──────────┐   ┌──────────┐ ┌──────────┐
    │ FIREBASE │ │YOUTUBE   │   │GEMINI AI │ │ EXPRESS  │
    │          │ │DATA API  │   │  FLASH   │ │  SERVER  │
    │ • Auth   │ │v3        │   │          │ │          │
    │ • Firestore│• search  │   │• Classif.│ │• PDF     │
    │ • Storage│ │• videos  │   │• Multimod│ │  Upload  │
    └──────────┘ └──────────┘   └──────────┘ └──────────┘
                      │
              ┌───────┴───────┐
              ▼               ▼
        ┌──────────┐   ┌──────────┐
        │ RSS FEED │   │INVIDIOUS │
        │(YouTube) │   │   API    │
        │ 0 units  │   │ 0 units  │
        └──────────┘   └──────────┘
```

### 5.2 Resumo dos Serviços

| Serviço | Função | Custo |
|---|---|---|
| **Firebase Authentication** | Login, cadastro, Google OAuth, reset de senha por deep link | Gratuito (tier Spark) |
| **Firebase Firestore** | Banco de dados NoSQL: usuários, projetos, catálogo, turmas | Gratuito até 50k leituras/dia |
| **Firebase Storage** | Avatares de usuário e arquivos `.fold` grandes | Gratuito até 5 GB |
| **YouTube Data API v3** | Busca de vídeos por termo, detalhes de duração | 10.000 units/dia grátis |
| **YouTube RSS Feed** | Monitoramento de canais confiáveis, sem quota | Gratuito (zero units) |
| **Invidious API** | Fallback de busca quando quota YouTube esgota | Gratuito (open-source) |
| **Google Gemini Flash** | Classificação de vídeos (texto + imagem), extração de passos de PDF | Gratuito (tier free) |
| **Express.js (local)** | API de conversão de PDF para formato `.fold` | Infraestrutura própria |

### 5.3 Estratégia de Quota da YouTube API

Um dos maiores desafios do projeto foi o gerenciamento da quota diária de **10.000 units** da YouTube Data API. A solução implementada combina três camadas:

1. **Controle local:** `AsyncStorage` registra units usadas com reset automático à meia-noite
2. **Controle remoto:** Firestore sincroniza o uso para evitar duplicações entre sessões
3. **Fallback inteligente:** ao atingir o limite de segurança (9.700 units), o sistema muda automaticamente para RSS Feed (0 units) e, se necessário, para a Invidious API (0 units)

Além disso, a **rotação de termos de busca** garante que os 40+ termos cadastrados sejam usados exatamente uma vez cada, evitando resultados duplicados e otimizando o catálogo.

---

## 6. Experiência do Usuário (UX/UI)

### 6.1 Design System

O app utiliza um sistema de design tokens centralizado no contexto global, aplicado dinamicamente em todas as telas:

| Token | Modo Escuro | Modo Claro |
|---|---|---|
| `theme.bg` | Fundo principal escuro | Fundo branco/cinza claro |
| `theme.primary` | Verde vibrante (cor de destaque) | Verde vibrante |
| `theme.card` | Cartão levemente mais claro que o fundo | Branco com sombra leve |
| `theme.text` | Branco | Preto |
| `theme.textMuted` | Cinza médio | Cinza escuro |

A alternância de tema é instantânea e persistida no AsyncStorage, sem necessidade de reiniciar o app.

### 6.2 Navegação

A navegação principal utiliza **renderização condicional baseada em estado**, sem bibliotecas de navegação externas:

| Estado | Tela exibida |
|---|---|
| `isAuthReady = false` | Splash (tela em branco com cor do tema) |
| `isAuthReady = true`, `user = null` | Auth.jsx |
| `resetOobCode != null` | ResetPasswordScreen.jsx |
| `user != null`, `foldingOrigami != null` | FoldingScreen.jsx |
| `user != null`, `currentDetail != null` | DetailScreen.jsx |
| `currentRoute = 'AdminDiscovery'` | AdminDiscovery.jsx |
| `user != null` | Layout.jsx (Discover / Library / TeacherPro / Profile) |

O componente `Layout.jsx` usa um **ScrollView paginado horizontalmente** para transições suaves entre as abas da barra inferior, sem saltos visuais.

### 6.3 Feedback Tátil e Visual

| Interação | Feedback |
|---|---|
| Salvar vídeo (coração) | Haptic leve (`ImpactFeedbackStyle.Light`) |
| Botões de ação principal | Haptic leve |
| Conquista desbloqueada | Haptic de sucesso (`NotificationFeedbackType.Success`) + toast animado |
| Erro de formulário | Haptic de erro (`NotificationFeedbackType.Error`) |
| Estados de carregamento | Botão desabilitado + texto dinâmico ("Entrando...", "Criando...") |
| Limite do plano Free atingido | Alert com botão "Ver Plano Pro" que navega diretamente às configurações |

### 6.4 Fluxo de Autenticação Completo

```
Tela Inicial (boas-vindas)
        │
   ┌────┴────┐
   ▼         ▼
 Login    Cadastro
   │    (com nível,
   │     foto e
   │     termos)
   │         │
   └────┬────┘
        ▼
  Área Logada
  (Discover)

  "Esqueci a senha"
        │
        ▼
  E-mail enviado
  (tela reset-sent)
        │
   ┌────┴─────────────────┐
   ▼                       ▼
Deep link              Colar link
(origami-app://        (campo de
 reset?oobCode=...)     paste)
        │                  │
        └─────────┬────────┘
                  ▼
        ResetPasswordScreen
        (confirmPasswordReset)
                  │
                  ▼
              Login
```

---

## 7. Segurança e Autenticação

### 7.1 Credenciais e Variáveis de Ambiente

Todas as chaves de API são carregadas exclusivamente via variáveis de ambiente prefixadas com `EXPO_PUBLIC_`, garantindo que nunca sejam versionadas no repositório:

```
EXPO_PUBLIC_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
EXPO_PUBLIC_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID
EXPO_PUBLIC_YOUTUBE_API_KEY
EXPO_PUBLIC_GEMINI_API_KEY
GEMINI_PDF_KEY
```

O arquivo `.env` está listado no `.gitignore` e nunca é versionado.

### 7.2 Persistência Segura de Sessão

O Firebase Auth é configurado com `getReactNativePersistence(AsyncStorage)` no mobile, garantindo que a sessão do usuário persiste entre sessões sem expor tokens em texto plano.

### 7.3 Regras de Acesso

| Recurso | Proteção |
|---|---|
| Telas da área logada | Renderização condicional: `if (!user) return <Auth />` |
| Painel do Professor | `isTeacher: true` verificado no Firestore |
| Painel Admin | Rota `AdminDiscovery` com verificação adicional |
| Limites do plano Free | Verificados no `AppContext` antes de qualquer operação de escrita |
| Upload de PDF | Limite de 10 MB e máximo de 3 arquivos verificados antes do picker |

### 7.4 Deep Link de Redefinição de Senha

O `oobCode` do Firebase é capturado via `expo-linking` e nunca exposto na UI — é processado diretamente pela função `confirmPasswordReset` e descartado após o uso com `setResetOobCode(null)`.

---

## 8. Modelo de Negócio Freemium

### Limites do Plano Gratuito

| Recurso | Plano Free | Plano Pro |
|---|---|---|
| Vídeos na biblioteca | **10 vídeos** | Ilimitado |
| Arquivos `.fold` | **3 arquivos** | Ilimitado |
| Tamanho máximo por PDF | **10 MB** | Ilimitado |
| Acesso à comunidade de professores | ✓ | ✓ |
| Scan de vídeos com IA (Admin) | ✗ | ✓ |

### Navegação Forçada para o Pro

Quando o usuário atinge qualquer limite, o app exibe um `Alert` com o botão **"Ver Plano Pro"** que navega diretamente para a tela de assinatura, usando o estado global `pendingProOpen` como sinalizador — sem necessidade de passar props entre telas.

---

## 9. Desafios Encontrados e Soluções

### Desafio 1: Quota Limitada da YouTube API

**Problema:** A YouTube Data API v3 tem limite de 10.000 units/dia gratuitas. Uma busca por termo custa 100 units — apenas 100 buscas por dia.

**Solução:** Sistema de três camadas em cascata (YouTube API → RSS Feed → Invidious), rotação de termos de busca com rastreamento persistido, e controle de quota com buffer de segurança de 300 units para evitar interrupções abruptas.

---

### Desafio 2: Falsos Positivos na Curadoria de Vídeos

**Problema:** Vídeos de bijuteria, papercutting e marcas chamadas "Origami" passavam pelo filtro apenas por conter a palavra "origami" no título.

**Solução:** Filtro de três camadas: (1) pré-filtro por keywords positivas obrigatórias, (2) filtro negativo por `REJECT_KEYWORDS` antes de chamar a IA, (3) prompt Gemini reforçado com 7 categorias de rejeição explícitas. O fallback em caso de falha da API também verifica as keywords negativas antes de aceitar qualquer vídeo.

---

### Desafio 3: Persistência Offline

**Problema:** Firebase Firestore em Expo Go tem comportamento instável em modo offline.

**Solução:** Estratégia Local-First — todas as escritas vão primeiro ao AsyncStorage (síncrono e confiável) e depois tentam sincronizar com o Firestore em segundo plano. Em caso de falha, um `console.warn` registra o estado pendente e o dado já está seguro localmente.

---

### Desafio 4: Navegação entre Telas sem React Navigation

**Problema:** Implementar deep links, modais e transições complexas sem uma biblioteca de navegação dedicada.

**Solução:** Renderização condicional centralizada no `AppContext` via estados globais (`currentRoute`, `currentDetail`, `foldingOrigami`, `resetOobCode`, `pendingProOpen`). Cada estado ativa uma tela diferente, e a transição é instantânea porque o estado já está disponível globalmente.

---

### Desafio 5: Reset de Senha com Retorno ao App

**Problema:** O e-mail padrão do Firebase redireciona para uma página web genérica do Firebase — quebrando a experiência mobile.

**Solução:** Deep link `origami-app://reset?oobCode=XXX` capturado via `expo-linking` no `App.js`. Como alternativa para ambientes sem configuração de deep link (ex: Expo Go), o usuário pode colar o link do e-mail diretamente em um campo da tela `reset-sent`, e o app extrai o `oobCode` automaticamente via regex.

---

## 10. Conclusão

### O que Foi Construído

O OrigamiApp é uma aplicação mobile completa que resolve um problema real para entusiastas de origami. Em suas seis versões de desenvolvimento, o projeto evoluiu de uma tela estática de catálogo para um ecossistema completo com:

- **Autenticação real** via Firebase, com fluxo completo de cadastro, login e recuperação de senha
- **Curadoria inteligente** combinando três fontes de dados (YouTube API, RSS, Invidious) com classificação por IA multimodal (Gemini Flash)
- **Biblioteca pessoal** com suporte a vídeos do YouTube e diagramas em PDF convertidos para um formato estruturado de passos
- **Gamificação** com 15 conquistas, sistema de streak diário, progressão de rank e feedback tátil e visual
- **Comunidade** com sistema de professores e alunos
- **Persistência híbrida** (AsyncStorage + Firebase Firestore) com funcionamento offline
- **Modelo de negócio Freemium** com limites aplicados na camada de domínio

### Aprendizados Técnicos

| Área | Aprendizado |
|---|---|
| **Arquitetura** | A Clean Architecture facilita a manutenção e a troca de fontes de dados sem reescrever a UI |
| **APIs externas** | É essencial planejar fallbacks desde o início; dependência de uma única API cria pontos únicos de falha |
| **Estado global** | React Context API é suficiente para apps de médio porte sem necessidade de Redux ou Zustand |
| **UX** | Pequenos detalhes de feedback (haptics, animações, mensagens de erro amigáveis) têm impacto desproporcional na percepção de qualidade |
| **Segurança** | Variáveis de ambiente e persistência segura de sessão não são opcionais — são parte do MVP |

### Próximos Passos (Roadmap)

| Prioridade | Feature |
|---|---|
| Alta | Sons nativos (`expo-av`) para salvar, conquistas e transições |
| Alta | Testes de integração para os repositórios Firebase |
| Média | Sistema de pagamento real para o Plano Pro (Stripe ou Google Play Billing) |
| Média | Push notifications via FCM com development build |
| Baixa | Modo social: compartilhamento de projetos entre usuários |
| Baixa | Busca e filtro avançado no catálogo por dificuldade e canal |

---

### Considerações Finais

O OrigamiApp demonstra que é possível construir um produto mobile funcional, bem arquitetado e com valor real para o usuário utilizando o ecossistema **React Native + Expo + Firebase**. A combinação de inteligência artificial para curadoria de conteúdo com uma experiência de usuário cuidadosa — desde o feedback tátil até o toast de conquistas — resulta em um aplicativo que se diferencia pelo cuidado com os detalhes.

A escolha da **Clean Architecture** provou seu valor ao longo do desenvolvimento: múltiplas mudanças de requisitos (novos limites do plano free, novos filtros de IA, novo fluxo de reset de senha) foram implementadas sem reescrever telas, apenas adicionando ou modificando a camada correta.

---

| **PROPOSTA DE VALOR FINAL** | Para entusiastas do origami que sofrem com tutoriais espalhados por toda a internet e a falta de uma comunidade organizada, o **OrigamiApp** é o lugar certo para descobrir, salvar e estudar modelos — do iniciante ao avançado — com curadoria inteligente, gamificação motivadora e uma comunidade estruturada entre usuários e professores. |
|---|---|

---

*OrigamiApp • Documentação Acadêmica Final • React Native + Expo • v6*

*Felippe Ruann — Engenharia de Software Mobile*
