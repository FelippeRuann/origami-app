# Documentação de Entrega (Incremental)

## Atualização do Modelo de Dados
Para esta entrega, o aplicativo deixou de depender do Firebase e passou a estruturar a persistência de dados local focando na **Clean Architecture**. Foram definidas duas entidades principais de domínio:

- `User`: Representa os dados e a sessão do origamista (nome, foto, progresso).
- `OrigamiProject`: Centraliza a estrutura do projeto principal do app (pode ser tanto um arquivo `.fold` quanto um tutorial do `YouTube`). 

## Explicação da Escolha da Tecnologia de Persistência
Para a realização deste CRUD local dentro de aplicativos Expo/React Native, utilizamos a biblioteca `@react-native-async-storage/async-storage`. Ela opera na camada equivalente ao `SharedPreferences` no Android e ao `NSUserDefaults` no iOS.  
**Motivos:**
1. Adoção rápida de armazenamento em formato chave-valor (semelhante ao MongoDB/Firebase), tornando muito ágil nossa mudança de nuvem para armazenamento 100% nativo.
2. Capacidade offline absoluta: ideal para testes e validação das funcionalidades na fase de criação da interface sem depender da rede.

## Fluxo de Armazenamento e Recuperação de Dados
O aplicativo agora obedece o fluxo de dados em formato de *Camadas Isoladas (Clean Architecture)* limitadas ao CRUD que implementamos:

1. **Camada de Visão (UI/Screens)**: Onde a `Library.jsx` e o `Auth` pegam os inputs do usuário final. A UI nunca acessa o banco de forma direta.
2. **Camada de Casos de Uso (Domain/UseCases)**: Se o usuário preenche a tela "Adicionar Vídeo", a ação chama `ManageProjectsUseCase`. O UseCase analisa "Este vídeo tem título?", "Devemos converter algo?". 
3. **Camada de Repositório (Data/Repositories)**: Após o UseCase validar a regra, a entidade é formatada e despachada para o `OrigamiProjectRepository` ou `UserRepository`. Estes arquivos são os ÚNICOS que sabem que o `AsyncStorage` existe na máquina do usuário. Eles convertem o objeto em String (`JSON.stringify`) e efetuam o fluxo efetivo:
   - **CREATE/UPDATE**: Grava um novo JSON atualizado no celular contra a chave (`@imported_projects` / `@users_db`).
   - **READ**: Busca no celular de forma assíncrona o banco atual.
   - **DELETE**: Tira o item correspondente do JSON e salva de volta.

Esse desacoplamento mostra como abstrações são feitas e atende perfeitamente ao perfil de vaga de desenvolvimento desejado.
