# OrigamiApp

**Plataforma Digital para Entusiastas de Origami**

---

## Documentacao de Produto — v3.0
React Native + Expo | Modelo Freemium | Implementacao Inicial + Modelo de Dados

| | |
|---|---|
| **Produto** | OrigamiApp — Biblioteca digital e comunidade de origami |
| **Persona** | Rafael, 22 anos — estudante universitario e entusiasta de arte |
| **Modelo** | Freemium — gratuito com recursos premium |
| **Plataforma** | Mobile (iOS e Android) — React Native + Expo |
| **Versao** | v3.0 — Implementacao Inicial + Modelo de Dados |

---

### 1. Visao Geral da Entrega (Atividade 3)
### 2. Estrutura de Telas e Navegacao
### 3. Estrutura de Pastas do Projeto
### 4. Modelo de Dados Inicial
### 5. Justificativa das Entidades Criadas
### — Contexto Herdado da v2.0 (Resumo)

---

## 1. Visão Geral da Entrega — Atividade 4
Esta versão reflete a implementação da "ATIVIDADE 4 – Persistência Local" do OrigamiApp. O foco desta etapa é garantir o armazenamento local persistente que sustente o modelo de negócio (freemium voltado para curadoria de origamis do YouTube).

| Requisito Atividade 4 | Implementação |
|---|---|
| **Cadastro funcional de usuários** | A autenticação é gerenciada mantendo os dados e status de login (token e credenciais offline básicas) salvos localmente utilizando AsyncStorage (SharedPreferences). |
| **Cadastro de item principal do app** | Módulo de adição de vídeos do YouTube e .fold na Biblioteca, permitindo o usuário adicionar URLs de origamis e salvar localmente. |
| **Tela de busca e exibição de dados** | Tela "Minha Biblioteca" atualizada com funcionalidade de Busca (Search bar) que filtra e renderiza as coleções de projetos salvos no aparelho. |
| **Persistência (*AsyncStorage*)** | Operações CRUD completas (Adicionar Vídeo, Ler Feed de Biblioteca, Editar informações e Excluir Item). Todo salvamento não é apenas no Firebase, mas espelhado na persistência na memória física. |

---

## Estrutura Atualizada do Modelo de Dados (Persistência Local)

Optamos por utilizar a biblioteca `@react-native-async-storage/async-storage` (tecnologia de persistência assíncrona baseada em chave-valor). Ela é a tradução direta do **SharedPreferences (Android)** e **NSUserDefaults (iOS)** no ecossistema React Native, sendo a tecnologia mais eficaz para dicionários locais e coleções não essenciais onde um banco relacional como o SQLite seria mais oneroso.

### Fluxo de Armazenamento e Recuperação de Dados Local:
1. **Gravação**: Quando o usuário adiciona um URL do YouTube "Quero fazer", o app resgata o array JSON local da chave `@imported_projects`, insere o novo objeto, sanitiza e regrava com `AsyncStorage.setItem`.
2. **Recuperação e Inicialização**: No evento de abertura do App (`useEffect` no `AppContext`), `AsyncStorage.getItem` é acionado para preencher a Biblioteca sem a necessidade de gastar conexões/dados de nuvem.
3. **Mecanismo de Busca**: Renderiza a tela `Library.jsx` consumindo o estado que já espelhou a memória local, e os filtros são aplicados puramente sob o array em memória (O(n)).

### Entidades do SharedPreferences (Keys)
*   **Key:** `@user_session` -> Persiste os dados de sessão se a nuvem estiver indisponível (nome, rank "0 dobras", etc).
*   **Key:** `@imported_projects` -> Array com todos os origamis, modelos do Youtube adicionados de forma personalizada ou origamis `.fold` (Trafegam offline).

| | |
|---|---|
| **Funcionamento da Navegacao (3,0)** | Implementada com renderizacao condicional baseada no estado de autenticacao. Um ScrollView paginado horizontalmente no Layout.jsx gerencia a Tab Bar inferior com transicoes suaves entre telas da area logada. |
| **Organizacao do Codigo (2,0)** | Projeto organizado em pastas separadas: screens/, components/, context/ e theme.js. Segue o padrao Clean Code com separacao de responsabilidades (RNF08). |
| **Coerencia do Modelo de Dados (3,0)** | Firebase Firestore com 3 colecoes principais: users, origamis e user_projects. Cada entidade foi justificada com base nos Requisitos Funcionais da v2.0. |
| **Documentacao Clara e Consistente (2,0)** | Documento incrementado sobre a v2.0, mantendo todo o conteudo anterior e adicionando as secoes exigidas pela Atividade 3: diagrama de dados, justificativas e estrutura de pastas. |

---

## 2. Estrutura de Telas e Navegacao

O aplicativo foi estruturado com fluxo claro, separando a area publica da area logada.

| | |
|---|---|
| **Auth.jsx**<br>*Tela Publica* | Contem as estruturas visuais de Login e Cadastro. O usuario pode alternar entre criar nova conta (informando nivel de experiencia e interesses) ou acessar conta existente via e-mail/senha ou login social (Google/Apple). |
| **Discover.jsx**<br>*Tela Inicial da Area Logada* | O "Feed" principal onde o usuario encontra projetos em destaque, categorias filtradas e recomendacoes personalizadas com base no nivel. Banner hero com projeto em destaque e cards com nivel de dificuldade, tempo e passos. |
| **Library.jsx**<br>*Biblioteca do Usuario* | Gerenciamento de projetos salvos com status (Quero Fazer, Em Andamento, Concluido), barra de progresso por etapa, galeria de concluidos e estatisticas pessoais (folds, horas de foco, medalhas). |
| **Profile.jsx**<br>*Perfil e Configuracoes* | Exibicao de dados do usuario, estatisticas (dobras, streak), conquistas desbloqueadas, galeria de criacoes e configuracoes incluindo alternancia de Tema Claro/Escuro (RF15). |
| **DetailScreen.jsx**<br>*Detalhe do Projeto* | Pagina completa do origami com avaliacao em estrelas, nivel de dificuldade, tempo estimado, tamanho do papel, materiais necessarios, tecnicas utilizadas e botao Start Folding. |
| **TeacherPro.jsx**<br>*Painel do Professor* | Tela exclusiva para usuarios com perfil de instrutor (isTeacher: true). Permite gerenciar alunos, criar atividades e acompanhar progresso da turma. |
| **Layout.jsx**<br>*Componente Base* | Estrutura base da area logada com Tab Bar inferior fixa. Utiliza ScrollView paginado horizontalmente para gerenciar as transicoes entre telas com animacao suave. |

### Logica de Navegacao

| Estado de Auth | Condicao | Tela Exibida |
|---|---|---|
| isAuthReady = false | Carregando... | Splash / Loading |
| isAuthReady = true, user = null | Nao autenticado | Auth.jsx (Login / Cadastro) |
| isAuthReady = true, user != null | Autenticado | Layout.jsx (Discover, Library, Profile) |

---

## 3. Estrutura de Pastas do Projeto

Projeto organizado visando Manutenibilidade (RNF08) e separacao clara de responsabilidades.

| | | |
|---|---|---|
| **App.js** | Raiz | Ponto de entrada principal. Gerencia o estado de autenticacao (isAuthReady, user) e renderiza condicionalmente Auth.jsx ou Layout.jsx. |
| **app.json** | Raiz | Configuracoes do Expo: nome, versao, icone, splash screen, permissoes e bundle identifier. |
| **package.json** | Raiz | Dependencias do projeto: Firebase, Expo, AsyncStorage, React Navigation. |
| **.env.example** | Raiz | Modelo de variaveis de ambiente. As chaves reais do Firebase ficam no .env (nao versionado). |
| **src/components/** | Components | Componentes visuais reutilizaveis compartilhados entre telas. |
| **src/components/Layout.jsx** | Components | Estrutura base da area logada com Tab Bar inferior e ScrollView paginado para navegacao entre telas. |
| **src/context/** | Context | Gerenciamento de estado global com Context API. |
| **src/context/AppContext.jsx** | Context | Logica de negocio central: integracao Firebase, autenticacao, estado do usuario e funcoes compartilhadas. |
| **src/screens/** | Screens | Telas completas do aplicativo, cada uma com sua propria logica e estilo. |
| **src/screens/Auth.jsx** | Screens | Telas de Login e Cadastro com alternancia entre os dois fluxos. |
| **src/screens/Discover.jsx** | Screens | Feed principal com banner, categorias e cards de projetos recomendados. |
| **src/screens/Library.jsx** | Screens | Biblioteca pessoal com status de progresso e galeria de concluidos. |
| **src/screens/Profile.jsx** | Screens | Perfil do usuario com estatisticas, conquistas e configuracoes. |
| **src/screens/DetailScreen.jsx** | Screens | Detalhe completo de um projeto com materiais e tecnicas. |
| **src/screens/FoldingScreen.jsx** | Screens | Interface de passo a passo para execucao do origami. |
| **src/screens/TeacherPro.jsx** | Screens | Painel exclusivo para instrutores (isTeacher: true). |
| **src/theme.js** | Theme | Design tokens: cores, tipografia, espacamentos para os modos Claro e Escuro. |

---

## 4. Modelo de Dados Inicial

Banco de dados escolhido: Firebase Firestore (NoSQL), ideal para escalabilidade e sincronizacao em tempo real exigidas pelo aplicativo.

### Colecao de Usuarios

| Campo | Tipo | Descricao |
|---|---|---|
| **uid (document_id)** | string | ID unico gerado pelo Firebase Authentication |
| **username** | string | Nome de exibicao do usuario |
| **email** | string | E-mail de autenticacao |
| **avatarIcon** | string | URL da imagem de perfil |
| **nivel** | string | Iniciante \| Intermediario \| Avancado |
| **isPro** | boolean | true se possui plano Premium ativo |
| **isTeacher** | boolean | true se possui perfil de instrutor |
| **folds** | number | Total de origamis concluidos pelo usuario |
| **createdAt** | timestamp | Data de criacao da conta |

### Catalogo de Projetos

| Campo | Tipo | Descricao |
|---|---|---|
| **document_id** | string | ID unico do projeto |
| **title** | string | Nome do origami (ex: Desert Fox) |
| **difficulty** | string | BEGINNER \| INTERMEDIATE \| ADVANCED \| EXPERT |
| **time_minutes** | number | Tempo estimado em minutos |
| **total_steps** | number | Quantidade total de etapas |
| **category** | string | Animals \| Flowers \| Decorative \| Quick Folds |
| **author_id** | string | UID do criador (system para conteudo oficial) |
| **imageUrl** | string | URL da imagem de capa do projeto |
| **rating** | number | Avaliacao media (0.0 a 5.0) |

### Projetos do Usuario (Biblioteca)

| Campo | Tipo | Descricao |
|---|---|---|
| **document_id** | string | ID unico do registro |
| **userId** | string | UID do usuario dono do projeto |
| **origamiId** | string | ID do origami na colecao origamis |
| **status** | string | Quero Fazer \| Em Andamento \| Concluido |
| **current_step** | number | Etapa atual (0 se nao iniciado) |
| **savedAt** | timestamp | Data em que foi salvo na biblioteca |
| **completedAt** | timestamp | Data de conclusao (null se nao concluido) |

---

## 5. Justificativa das Entidades Criadas

A modelagem NoSQL foi desenhada para atender aos Requisitos Funcionais (RF01 a RF17) definidos na v2.0.

### 1. Entidade users (Usuarios)
Essencial para Autenticacao (RF01, RF02) e Perfil (RF04). Armazena as preferencias do usuario — como o nivel escolhido no cadastro — para personalizar o feed na tela Discover (RF05). As flags isPro e isTeacher controlam acesso a recursos premium (RF17) e a tela exclusiva de professores, sem precisar de colecoes separadas para cada tipo de usuario.
*   **RF01 — Criar Conta**
*   **RF02 — Login**
*   **RF04 — Editar Perfil**
*   **RF15 — Modo Noturno**
*   **RF17 — Plano Premium**

### 2. Entidade origamis (Catalogo de Projetos)
Necessaria para alimentar a tela Discover (RF05, RF06). Contem os metadados do projeto — dificuldade, tempo, total de passos, categoria — para que o usuario saiba o que esperar antes de iniciar a dobradura (RF07). O campo author_id permite que, no futuro, criadores da comunidade publiquem seus proprios projetos.
*   **RF05 — Listar Projetos**
*   **RF06 — Filtrar por Categoria**
*   **RF07 — Ver Detalhe**
*   **RF08 — Salvar Projeto**

### 3. Entidade user_projects (Biblioteca e Progresso)
Atende diretamente a funcionalidade da Biblioteca (RF08, RF09, RF10, RF11). Em vez de colocar um array dentro do documento do usuario — anti-pattern no Firestore devido ao limite de 1MB por documento — foi criada uma colecao separada que relaciona usuario e origami. Isso permite consultas rapidas e atualizacoes constantes do current_step sem sobrecarregar o documento principal do usuario.
*   **RF08 — Salvar Projeto**
*   **RF09 — Gerenciar Status**
*   **RF10 — Barra de Progresso**
*   **RF11 — Galeria de Concluidos**
*   **RF16 — Limite Freemium**

---

## Resumo do Contexto do Produto (Herdado da v2.0)

| | |
|---|---|
| **Jornada** | Descobre o app -> Cadastra-se informando o nivel -> Explora categorias -> Salva projetos -> Acompanha progresso -> Publica resultados -> Converte para Premium ao atingir limite de 7 projetos (RF16). |
| **PROPOSTA DE VALOR** | Para entusiastas do origami que sofrem com diagramas espalhados por toda a internet e a falta de uma comunidade organizada, o OrigamiApp e o lugar certo para descobrir, salvar e compartilhar modelos — do iniciante ao avancado. |
