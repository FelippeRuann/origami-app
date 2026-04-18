import React, { createContext, useState, useContext, useEffect } from 'react';
import { lightTheme, darkTheme } from '../theme';
import { auth, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 1. Criação do Contexto: É como se fosse um "armazém" global onde guardamos dados
// que precisam ser acessados por várias telas (ex: quem é o usuário, qual o tema atual).
const AppContext = createContext();

/**
 * AppProvider: É o componente que "abraça" o aplicativo e fornece os dados do contexto.
 * Tudo que estiver dentro de <AppProvider> (no App.js) terá acesso a esses dados.
 */
export function AppProvider({ children }) {
  // --- ESTADOS GLOBAIS ---
  const [user, setUser] = useState(null); // Guarda os dados do usuário logado
  const [isDarkMode, setIsDarkMode] = useState(true); // Controla o tema (Claro/Escuro)
  const [currentRoute, setCurrentRoute] = useState('Discover'); // Controla qual aba está ativa na TabBar
  const [currentDetail, setCurrentDetail] = useState(null); // Guarda o origami que está sendo visualizado na tela de Detalhes
  const [foldingOrigami, setFoldingOrigami] = useState(null); // Guarda o origami que está sendo dobrado (passo a passo)
  const [importedProjects, setImportedProjects] = useState([]); // Guarda os origamis customizados que o usuário importou
  
  // Estado para saber se o Firebase já terminou de verificar se o usuário está logado
  const [isAuthReady, setIsAuthReady] = useState(false);
  
  // Define as cores com base no modo escuro ou claro
  const theme = isDarkMode ? darkTheme : lightTheme;

  // App state
  const [savedOrigamis, setSavedOrigamis] = useState([]);
  const [projects, setProjects] = useState([
    { id: '1', title: 'Dragão Imperial', step: 14, totalSteps: 22, icon: 'github', progress: 14 / 22, bg: '#1A2A3A' },
    { id: '2', title: 'Lótus Sagrada',   step: 8,  totalSteps: 10, icon: 'sun', progress: 8 / 10,  bg: '#2A1A2A' },
  ]);
  const [documents, setDocuments] = useState([
    { id: 'd1', title: 'Origami Basics.pdf' },
    { id: 'd2', title: 'Advanced Dragons.pdf' },
  ]);
  const [activities, setActivities] = useState([
    { id: 'a1', title: 'Atividade 1: Tsuru', assignedBy: 'Prof. Silva', completed: false }
  ]);

  // --- EFEITOS (useEffect) ---
  
  // Carrega os projetos importados locais salvos no AsyncStorage quando o app abre
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        const storedProjects = await AsyncStorage.getItem('@imported_projects');
        if (storedProjects) setImportedProjects(JSON.parse(storedProjects));
        
        // RECUPERAÇÃO DE SESSÃO OFFLINE LOCAL (Atividade 4)
        const storedUser = await AsyncStorage.getItem('@user_session');
        if (storedUser && !user) {
           setUser(JSON.parse(storedUser));
           setIsAuthReady(true);
        }
      } catch (error) {
        console.error("Erro ao carregar dados salvos no celular:", error);
      }
    };
    loadLocalData();
  }, []);

  // Este efeito roda assim que o aplicativo abre. Ele fica "escutando" o Firebase
  // para saber se o usuário fez login ou logout.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Se o Firebase diz que tem alguém logado, buscamos os dados extras dele no banco de dados (Firestore)
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Atualiza o estado 'user' com os dados do Firebase + Firestore
            setUser({
              id: firebaseUser.uid,
              name: userData.username || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              photo: userData.avatarIcon || 'user',
              isPro: userData.isPro || false,
              isTeacher: userData.isTeacher || false,
              rank: userData.nivel || 'Iniciante',
              folds: userData.folds || 0,
              watchedVideos: userData.watchedVideos || 0
            });
          } else {
            // Fallback caso o documento não exista no banco
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              photo: 'user',
              isPro: false,
              isTeacher: false,
              rank: 'Iniciante',
              folds: 0,
              watchedVideos: 0
            });
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }
      } else {
        // Se não tem ninguém logado, limpa o estado
        setUser(null);
      }
      // Avisa o app que já terminamos de checar o login (remove a tela de loading)
      setIsAuthReady(true);
    });

    // Função de limpeza: para de escutar o Firebase quando o componente for desmontado
    return () => unsubscribe();
  }, []);

  // --- FUNÇÕES DE AUTENTICAÇÃO ---
  
  // Função para fazer login com email e senha
  const login = async (email, password) => {
    try {
      if (auth.app) { // Se Firebase estiver rodando
         await signInWithEmailAndPassword(auth, email, password);
      } else {
         // Validação Offline
         const storedUser = await AsyncStorage.getItem('@user_session');
         if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if(parsedUser.email === email) {
               setUser(parsedUser);
               return { success: true };
            }
         }
         throw new Error('user-not-found');
      }
      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, error: error.message };
    }
  };

  // Função para criar uma nova conta
  const register = async (email, password, username, avatarIcon, nivel, avatarImageUri = null) => {
    try {
      let finalAvatarIcon = avatarIcon;
      let uid = String(Date.now()); // ID provisório se for offline

      // Mock Local User persistency para a Atividade 4
      const localUser = {
        id: uid, username, email, avatarIcon: finalAvatarIcon,
        nivel, isPro: false, isTeacher: false, folds: 0,
        watchedVideos: 0,
        createdAt: new Date().toISOString()
      };

      if (auth.app && auth.apiKey && db) {
        // 1. Cria a conta no Firebase Authentication (que gerencia e-mail e senha)
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        uid = firebaseUser.uid;
        localUser.id = uid;

        // Upload omitido por brevidade no snippet offline fallback

        // 2. Salva os dados extras (nome, nível, foto) no Firestore (banco de dados)
        await setDoc(doc(db, 'users', uid), localUser);
      }
      
      // PERSISTÊNCIA LOCAL (Atividade 4 - AsyncStorage)
      await AsyncStorage.setItem('@user_session', JSON.stringify({ ...localUser, photo: finalAvatarIcon, name: username }));
      setUser({ ...localUser, photo: finalAvatarIcon, name: username });

      return { success: true };
    } catch (error) {
      console.error("Erro no cadastro:", error);
       // Gravação secundária apenas offline se rede cair
      if(error.message.includes('network') || error.message.includes('auth/')) {
        return { success: false, error: error.message };
      }
      return { success: false, error: error.message };
    }
  };

  // Função para sair da conta
  const logout = async () => {
    try {
      if (auth.app) await signOut(auth);
      await AsyncStorage.removeItem('@user_session');
      setUser(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  // Função para enviar e-mail de recuperação de senha
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Erro ao redefinir senha:", error);
      return { success: false, error: error.message };
    }
  };

  const updateAvatar = async (imageUri) => {
    if (!user) return { success: false, error: "Usuário não logado" };
    
    try {
      // 1. Preparar a imagem para upload no Cloudinary
      const data = new FormData();
      data.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });
      data.append('upload_preset', 'origamiapp'); // Vamos precisar criar esse preset no Cloudinary
      data.append('cloud_name', 'drvuzmqqg'); // Nome da nuvem (exemplo)

      // 2. Fazer o upload para o Cloudinary (API REST, não precisa de SDK)
      const response = await fetch('https://api.cloudinary.com/v1_1/drvuzmqqg/image/upload', {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || 'Erro ao fazer upload da imagem');
      }

      const downloadURL = result.secure_url;

      // 3. Atualizar o documento do usuário no Firestore com a URL do Cloudinary
      await updateDoc(doc(db, 'users', user.id), {
        avatarIcon: downloadURL
      });

      // 4. Atualizar o estado local do app
      setUser({ ...user, photo: downloadURL });

      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      return { success: false, error: error.message };
    }
  };

  const removeAvatar = async () => {
    if (!user) return { success: false, error: "Usuário não logado" };
    try {
      await updateDoc(doc(db, 'users', user.id), {
        avatarIcon: 'user'
      });
      setUser({ ...user, photo: 'user' });
      return { success: true };
    } catch (error) {
      console.error("Erro ao remover avatar:", error);
      return { success: false, error: error.message };
    }
  };

  // --- FUNÇÕES DE PERFIL E APP ---

  // Função para alternar entre modo claro e escuro
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Função para salvar um origami na biblioteca do usuário
  const saveOrigami = (origami) => {
    // Regra de negócio: Usuários gratuitos só podem salvar 7 origamis
    if (!user?.isPro && savedOrigamis.length >= 7) {
      alert("Limite atingido! Assine o Pro para salvar mais origamis.");
      return false;
    }
    // Evita salvar duplicado
    if (!savedOrigamis.find(o => o.id === origami.id)) {
      setSavedOrigamis([...savedOrigamis, origami]);
    }
    return true;
  };

  // Função para simular a compra do plano Pro
  const upgradeToPro = (asTeacher = false) => {
    setUser({ ...user, isPro: true, isTeacher: asTeacher });
  };

  // Função para salvar localmente um novo .fold importado ou video do YouTube
  const addImportedProject = async (newProject) => {
    const updatedList = [newProject, ...importedProjects];
    setImportedProjects(updatedList); // Atualiza na memória
    try {
      await AsyncStorage.setItem('@imported_projects', JSON.stringify(updatedList)); // Salva no celular
    } catch (e) {
      console.error("Erro ao salvar projeto no celular:", e);
    }
  };

  // Função para deletar itens locais salvos na Biblioteca (Persistência)
  const removeImportedProject = async (projectId) => {
    const updatedList = importedProjects.filter(p => p.id !== projectId);
    setImportedProjects(updatedList);
    try {
      await AsyncStorage.setItem('@imported_projects', JSON.stringify(updatedList));
    } catch (e) {
      console.error("Erro ao remover projeto:", e);
    }
  };

  // Função para reverter a simulação do plano Pro
  const downgradeFromPro = () => {
    setUser({ ...user, isPro: false, isTeacher: false });
  };

  const updateVideoProgress = async (projectId, secondsWatched) => {
    // Updates progress for a youtube video (locally memory + AsyncStorage)
    const updatedList = importedProjects.map(p => {
       if(p.id === projectId) {
          return { ...p, watchedSeconds: secondsWatched, progress: secondsWatched > 0 ? 'Continuar assistindo' : '0%' };
       }
       return p;
    });
    setImportedProjects(updatedList);
    try {
      await AsyncStorage.setItem('@imported_projects', JSON.stringify(updatedList));
      
      // Update User Watch Analytics on Firebase if logged in:
      if (user && db && auth.app) {
         try {
           const userRef = doc(db, 'users', user.id);
           getDoc(userRef).then((d) => {
             if (d.exists()) {
               updateDoc(userRef, { watchedVideos: (d.data().watchedVideos || 0) + 1 });
               setUser(prev => ({ ...prev, watchedVideos: (prev.watchedVideos || 0) + 1 }));
             }
           });
         } catch(e) { console.error('Erro atualizar videos vistos: ', e) }
      }
    } catch (e) {
      console.error("Erro ao registrar tempo do video:", e);
    }
  };

  // Aqui nós "exportamos" todas as variáveis e funções para que o resto do app possa usar
  return (
    <AppContext.Provider value={{
      user, login, register, logout, isAuthReady, resetPassword, updateAvatar, removeAvatar,
      isDarkMode, toggleTheme, theme,
      currentDetail, setCurrentDetail,
      foldingOrigami, setFoldingOrigami,
      importedProjects, setImportedProjects, addImportedProject, removeImportedProject,
      updateVideoProgress,
      currentRoute, setCurrentRoute,
      savedOrigamis, saveOrigami,
      projects, documents, activities,
      upgradeToPro, downgradeFromPro
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Hook customizado: Em vez de importar o useContext e o AppContext toda vez,
// as telas só precisam chamar `useApp()` para pegar os dados.
export const useApp = () => useContext(AppContext);
