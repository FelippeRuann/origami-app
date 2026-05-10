import React, { createContext, useState, useContext, useEffect } from 'react';
import { lightTheme, darkTheme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clean Architecture - Importando Casos de Uso e Repositórios
import { AuthUseCase } from '../domain/usecases/AuthUseCase';
import { ManageProjectsUseCase } from '../domain/usecases/ManageProjectsUseCase';
import { storage } from '../firebase';
import { ref, uploadBytes, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

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
  
  // Estado para saber se o app já verificou a sessão e carregou os dados locais
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
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
  
  // 1. MONITOR DE AUTENTICAÇÃO (Roda uma única vez no boot)
  useEffect(() => {
    const { onAuthStateChanged } = require('firebase/auth');
    const { auth } = require('../firebase');
    
    // Este listener garante que a sessão se mantém e sincroniza os dados
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await AsyncStorage.setItem('@last_user_uid', firebaseUser.uid);
        
        // 1. Tenta carregar do Cache Local IMEDIATAMENTE para não mostrar tela vazia
        const cached = await AsyncStorage.getItem(`@favorites_${firebaseUser.uid}`);
        if (cached) {
          setSavedOrigamis(JSON.parse(cached));
        }

        // Carrega projetos locais também
        const localProjects = await ManageProjectsUseCase.getProjects(firebaseUser.uid);
        setImportedProjects(localProjects);

        // 2. Busca sessão completa (Rank, etc)
        const activeUser = await AuthUseCase.checkActiveSession();
        if (activeUser) {
          setUser(activeUser);
          
          // 3. Sync em Background com o Firestore
          try {
            const { collection, getDocs, query } = require('firebase/firestore');
            const { db } = require('../firebase');
            const q = query(collection(db, 'users', activeUser.id, 'favorites'));
            const snap = await getDocs(q);
            const favsFromCloud = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Se mudou ou chegou coisa nova, atualiza
            setSavedOrigamis(favsFromCloud);
            await AsyncStorage.setItem(`@favorites_${activeUser.id}`, JSON.stringify(favsFromCloud));
          } catch (cloudErr) {
            console.log("Firebase sync aguardando conexão... (usando cache local)");
          }
        }
      } else {
        // Logout Real ou apenas ainda não logou no boot
        // Só limpamos se já estávamos autenticados (isAuthReady=true indica que não é o primeiro check do boot)
        // Ou se realmente queremos limpar no boot quando não há usuário
        setUser(null);
        
        // Importante: Só limpamos projetos se isAuthReady for true, 
        // para não apagar o que o bootOffline acabou de carregar do cache
        if (isAuthReady) {
          setSavedOrigamis([]);
          setImportedProjects([]);
        }
        await AsyncStorage.removeItem('@last_user_uid');
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []); // SEM DEPENDÊNCIAS: Roda uma vez e fica ouvindo

  // 2. CARREGAMENTO ULTRA-RÁPIDO (BOOT OFFLINE)
  useEffect(() => {
    const bootOffline = async () => {
      try {
        // Tema
        const savedTheme = await AsyncStorage.getItem('@dark_mode');
        if (savedTheme !== null) setIsDarkMode(savedTheme === 'true');

        // Favoritos (YouTube) - Carrega o cache do último usuário conhecido IMEDIATAMENTE
        const lastUid = await AsyncStorage.getItem('@last_user_uid');
        if (lastUid) {
          // Favoritos
          const cachedFavs = await AsyncStorage.getItem(`@favorites_${lastUid}`);
          if (cachedFavs) {
            setSavedOrigamis(JSON.parse(cachedFavs));
          }
          // Projetos Locais (.fold) - Agora passando o lastUid
          const savedProjectsList = await ManageProjectsUseCase.getProjects(lastUid);
          setImportedProjects(savedProjectsList);
        } else {
          // Se não tem UID do último login, tenta carregar o que tiver (fallback)
          const savedProjectsList = await ManageProjectsUseCase.getProjects();
          setImportedProjects(savedProjectsList);
        }
      } catch (err) {
        console.error("Erro no boot offline:", err);
      } finally {
        // Marcamos que o app terminou de ler as pastas locais
        setIsInitialLoading(false);
      }
    };
    bootOffline();
  }, []);

  // --- FUNÇÕES DE AUTENTICAÇÃO E CADASTRO ---
  
  const login = async (email, password) => {
    try {
      const loggedUser = await AuthUseCase.login(email, password);
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, error: "Usuário não encontrado." };
    }
  };

  const loginWithGoogleToken = async (idToken) => {
    try {
      const loggedUser = await AuthUseCase.loginWithGoogle(idToken);
      setUser(loggedUser);
      return { success: true };
    } catch (error) {
      console.error("Erro no login com Google:", error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, username, avatarIcon, nivel, imageFile = null) => {
    try {
      const newUser = await AuthUseCase.register(email, password, username, avatarIcon, nivel);
      setUser(newUser);
      
      if (imageFile) {
         try {
           const storageRef = ref(storage, `users/${newUser.id}/avatars/${newUser.id}_${Date.now()}.jpg`);
           
           // Detecta se é um URI (string) ou um objeto File/Blob
           let blob = imageFile;
           if (typeof imageFile === 'string' && (imageFile.startsWith('http') || imageFile.startsWith('file') || imageFile.startsWith('data:'))) {
             const response = await fetch(imageFile);
             blob = await response.blob();
           }
           
           await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
           const downloadURL = await getDownloadURL(storageRef);
           const updatedUser = await AuthUseCase.updateAvatar(downloadURL);
           setUser(updatedUser);
         } catch (avatarError) {
           console.error("Erro ao fazer upload do avatar no register:", avatarError);
         }
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erro no cadastro:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await AuthUseCase.logout();
      setUser(null);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const resetPassword = async (email) => {
    return { success: true, message: "Funcionalidade de e-mail mockada." };
  };

  const updateAvatar = async (imageFile) => {
    if (!user) return { success: false, error: "Usuário não logado" };
    try {
      if (imageFile) {
          // Deletar avatar antigo se for uma imagem do Storage
          if (user.avatar && user.avatar.includes('firebasestorage.googleapis.com')) {
            try {
              const oldStorageRef = ref(storage, user.avatar);
              await deleteObject(oldStorageRef);
            } catch (deleteError) {
              console.warn("Não foi possível deletar o avatar antigo (pode já não existir):", deleteError);
            }
          }

          const storageRef = ref(storage, `users/${user.id}/avatars/${user.id}_${Date.now()}.jpg`);
          
          // Detecta se é um URI (string) ou um objeto File/Blob
          let blob = imageFile;
          if (typeof imageFile === 'string' && (imageFile.startsWith('http') || imageFile.startsWith('file') || imageFile.startsWith('data:'))) {
            const response = await fetch(imageFile);
            blob = await response.blob();
          }
          
          await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
          
          const downloadURL = await getDownloadURL(storageRef);
          const updatedUser = await AuthUseCase.updateAvatar(downloadURL);
          setUser(updatedUser);
          
          return { success: true };
      }
      return { success: false, error: "Sem imagem" };
    } catch (error) {
      console.error("Erro ao atualizar avatar:", error);
      return { success: false, error: error.message };
    }
  };

  const removeAvatar = async () => {
    if (!user) return { success: false, error: "Usuário não logado" };
    try {
      // Deletar avatar antigo se for uma imagem do Storage
      if (user.avatar && user.avatar.includes('firebasestorage.googleapis.com')) {
        try {
          const oldStorageRef = ref(storage, user.avatar);
          await deleteObject(oldStorageRef);
        } catch (deleteError) {
          console.warn("Não foi possível deletar o avatar do storage:", deleteError);
        }
      }

      const updatedUser = await AuthUseCase.updateAvatar('user');
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      console.error("Erro ao remover avatar:", error);
      return { success: false, error: error.message };
    }
  };

  // --- FUNÇÕES DE PERFIL E APP ---

  const toggleTheme = () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    AsyncStorage.setItem('@dark_mode', nextTheme.toString());
  };

  const saveOrigami = async (origami) => {
    if (!user) return false;
    
    if (!user?.isPro && savedOrigamis.length >= 7) {
      alert("Limite atingido! Assine o Pro para salvar mais origamis.");
      return false;
    }
    
    if (!savedOrigamis.find(o => o.id === origami.id)) {
      const newSaved = [...savedOrigamis, origami];
      setSavedOrigamis(newSaved);
      
      // Persiste no AsyncStorage imediatamente (Segurança Local total)
      await AsyncStorage.setItem(`@favorites_${user.id}`, JSON.stringify(newSaved));
      
      // Persiste no Firestore (O Firebase enfileira para salvar mesmo offline!)
      try {
        const { collection, doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const docRef = doc(db, 'users', user.id, 'favorites', origami.id.toString());
        await setDoc(docRef, {
          ...origami,
          savedAt: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Salvando localmente, será sincronizado quando houver internet.");
      }
    }
    return true;
  };

  const upgradeToPro = (asTeacher = false) => {
    setUser({ ...user, isPro: true, isTeacher: asTeacher });
  };

  const downgradeFromPro = () => {
    setUser({ ...user, isPro: false, isTeacher: false });
  };

  const unsaveOrigami = async (origamiId) => {
    if (!user) return;
    const newSaved = savedOrigamis.filter(o => o.id !== origamiId && o.videoId !== origamiId);
    setSavedOrigamis(newSaved);
    await AsyncStorage.setItem(`@favorites_${user.id}`, JSON.stringify(newSaved));
    
    // Firestore (Non-blocking deletion for better offline responsiveness)
    import('firebase/firestore').then(({ doc, deleteDoc }) => {
      import('../firebase').then(({ db }) => {
        deleteDoc(doc(db, 'users', user.id, 'favorites', origamiId.toString())).catch(e => {
          console.warn("Remoção na nuvem pendente (Offline):", e);
        });
      });
    });
  };

  // --- CRUD DE PROJETOS ---
  
  const addImportedProject = async (newProject) => {
    // Adapter para código legado da view
    const userId = user?.id || 'guest';
    if(newProject.type === 'youtube') {
       await ManageProjectsUseCase.addYoutubeProject(newProject.title, newProject.url, newProject.videoId, userId);
    } else {
       await ManageProjectsUseCase.addFoldProject(newProject.title, newProject.data || newProject, userId);
    }
    setImportedProjects(await ManageProjectsUseCase.getProjects(userId));
  };

  const removeImportedProject = async (projectId) => {
    const userId = user?.id || 'guest';
    // Otimista: Remove da UI imediatamente
    const currentList = [...importedProjects];
    setImportedProjects(prev => prev.filter(p => p.id !== projectId));
    
    try {
      await ManageProjectsUseCase.removeProject(projectId, userId);
    } catch (err) {
      console.error("Erro ao remover projeto:", err);
      // Reverte se der erro crítico (opcional em apps offline-first)
      // setImportedProjects(currentList);
    }
  };

  const updateVideoProgress = async (projectId, secondsWatched) => {
    const updatedList = importedProjects.map(p => {
       if(p.id === projectId) {
          p.watchedSeconds = secondsWatched;
          p.progress = secondsWatched > 0 ? 'Continuar assistindo' : '0%';
       }
       return p;
    });
    setImportedProjects(updatedList);
    await AsyncStorage.setItem('@imported_projects', JSON.stringify(updatedList)); 
    
    // AuthUseCase para atualizar profile com Analytics
    const u = await AuthUseCase.updateWatchedCount();
    if(u) setUser(u);
  };


  // --- FUNÇÕES DO PROFESSOR (Simulação MVP Local) ---
  
  const [managedStudents, setManagedStudents] = useState([]);
  const [classActivities, setClassActivities] = useState([]);
  const [teacherCode, setTeacherCode] = useState('PRO-A1B2');
  const [studentSubscriptions, setStudentSubscriptions] = useState([]);
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);

  useEffect(() => {
    if (user) {
        setTeacherCode(user.id?.substring(0, 5).toUpperCase() || 'PRO-MOCK');
    }
  }, [user]);

  const publishActivity = async (title, type) => {
      const newActivity = {
         id: Date.now().toString(),
         title,
         type, 
         teacherName: user?.name || 'Seu Professor',
         teacherId: user?.id || 'mock',
         createdAt: new Date().toISOString()
      };
      setClassActivities([newActivity, ...classActivities]);
  };

  const joinClass = async (code) => {
    if (code.length < 3) return { success: false, error: 'Código muito curto.' };
    const newSub = {
       id: 'prof_' + code,
       teacherName: 'Mestre ' + code,
       code: code
    };
    setStudentSubscriptions([...studentSubscriptions, newSub]);
    setManagedStudents([...managedStudents, { id: user?.id || Date.now().toString(), name: user?.name || 'Aluno Testador', email: user?.email || 'aluno@app.com', status: 'Ativo' }]);
    return { success: true };
  };

  const addStudent = async (studentEmail) => {
      const newStudent = {
        id: Date.now().toString(),
        name: studentEmail.split('@')[0],
        email: studentEmail,
        progress: 0,
        status: 'Pendente'
      };
      setManagedStudents([...managedStudents, newStudent]);
  };

  const removeStudent = async (studentId) => {
    setManagedStudents(managedStudents.filter(s => s.id !== studentId));
  };


  return (
    <AppContext.Provider value={{
      user, login, loginWithGoogleToken, register, logout, isAuthReady, isInitialLoading, resetPassword, updateAvatar, removeAvatar,
      isDarkMode, toggleTheme, theme,
      currentDetail, setCurrentDetail,
      foldingOrigami, setFoldingOrigami,
      importedProjects, setImportedProjects, addImportedProject, removeImportedProject,
      updateVideoProgress,
      currentRoute, setCurrentRoute,
      isFullscreenVideo, setIsFullscreenVideo,
      savedOrigamis, saveOrigami, unsaveOrigami,
      projects, documents, activities, classActivities, teacherCode, studentSubscriptions, publishActivity, joinClass,
      upgradeToPro, downgradeFromPro, managedStudents, addStudent, removeStudent
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
