import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { lightTheme, darkTheme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
          await updateStreak(activeUser);
          await checkAchievements(activeUser);
          const cachedNotifPrefs = await AsyncStorage.getItem(`@notif_prefs_${firebaseUser.uid}`);
          if (cachedNotifPrefs) setNotifPrefs(JSON.parse(cachedNotifPrefs));
          else if (activeUser.notificationPrefs) setNotifPrefs(activeUser.notificationPrefs);
          
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
      _loadedUid.current = null;
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

  const upgradeToPro = async (asTeacher = false) => {
    if (!user) return;
    const updates = { isPro: true, isTeacher: asTeacher };
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', user.id), updates);
    } catch (e) {
      console.warn("Erro ao salvar upgrade Pro:", e);
    }
    await checkAchievements(updatedUser);
  };

  const downgradeFromPro = async () => {
    if (!user) return;
    const updates = { isPro: false, isTeacher: false };
    setUser({ ...user, ...updates });
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', user.id), updates);
    } catch (e) {
      console.warn("Erro ao remover Pro:", e);
    }
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

  const updateVideoProgress = async (projectId, secondsWatched, markAsWatched = false) => {
    const updatedList = importedProjects.map(p => {
      if (p.id === projectId) {
        return { ...p, watchedSeconds: secondsWatched, progress: secondsWatched > 0 ? 'Continuar assistindo' : '0%' };
      }
      return p;
    });
    setImportedProjects(updatedList);
    await AsyncStorage.setItem('@imported_projects', JSON.stringify(updatedList));

    if (markAsWatched && user) {
      const newCount = (user.watchedVideos || 0) + 1;
      const updatedUser = { ...user, watchedVideos: newCount };
      setUser(updatedUser);
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        await updateDoc(doc(db, 'users', user.id), { watchedVideos: newCount });
      } catch (e) {
        console.warn("watchedVideos sync pendente:", e);
      }
      await checkAchievements(updatedUser);
    }
  };


  // --- DETALHES DE PROJETOS E SINC REGULAR ---
  const [managedStudents, setManagedStudents] = useState([]);
  const [classActivities, setClassActivities] = useState([]);
  const [teacherCode, setTeacherCode] = useState('PRO-A1B2');
  const [studentSubscriptions, setStudentSubscriptions] = useState([]);
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({ dailyReminder: false, reminderTime: '20:00', streakAlert: false });

  const _loadedUid    = useRef(null);
  const _unsubStudents  = useRef(null);
  const _unsubActivities = useRef(null);

  useEffect(() => {
    const cleanup = () => {
      _unsubStudents.current?.();
      _unsubActivities.current?.();
      _unsubStudents.current  = null;
      _unsubActivities.current = null;
    };

    if (!user?.id) { cleanup(); _loadedUid.current = null; return; }
    if (user.id === _loadedUid.current) return;
    _loadedUid.current = user.id;
    cleanup();

    const userId = user.id;

    const setup = async () => {
      const { collection, onSnapshot, getDocs, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      if (user.isTeacher) {
        // Gera código do professor se necessário
        let code = user.teacherCode || teacherCode;
        const isDefaultCode = !code || code === 'PRO-A1B2' || code === 'PRO-MOCK' || /^PRO-[A-Z0-9]{4,5}$/.test(code);
        if (isDefaultCode) {
          code = userId.substring(0, 4).toUpperCase() + '-' + userId.substring(4, 8).toUpperCase();
          try {
            const updated = await AuthUseCase.updateUserSession({ teacherCode: code });
            setUser(updated);
          } catch (e) { console.warn("Teacher code offline fallback:", e); }
        }
        setTeacherCode(code);
        await AsyncStorage.setItem(`@teacher_code_${userId}`, code);

        // Cache local como fallback imediato
        const localStudents = await AsyncStorage.getItem(`@managed_students_${userId}`);
        if (localStudents) setManagedStudents(JSON.parse(localStudents));

        const localActs = await AsyncStorage.getItem(`@class_activities_${userId}`);
        if (localActs) setClassActivities(JSON.parse(localActs));

        // Listener em tempo real para alunos
        _unsubStudents.current = onSnapshot(
          collection(db, 'users', userId, 'students'),
          (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            console.log(`[Students] ${list.length} alunos no Firestore`);
            setManagedStudents(list);
            AsyncStorage.setItem(`@managed_students_${userId}`, JSON.stringify(list));
          },
          (err) => console.warn('[Students] snapshot error:', err)
        );

        // Listener em tempo real para atividades publicadas
        _unsubActivities.current = onSnapshot(
          query(collection(db, 'users', userId, 'activities'), orderBy('createdAt', 'desc')),
          (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClassActivities(list);
            AsyncStorage.setItem(`@class_activities_${userId}`, JSON.stringify(list));
          },
          (err) => console.warn('[Activities] snapshot error:', err)
        );

      } else {
        // Aluno: exibe cache imediatamente, depois sincroniza com Firestore
        const localSubs = await AsyncStorage.getItem(`@student_subscriptions_${userId}`);
        if (localSubs) setStudentSubscriptions(JSON.parse(localSubs));

        const localActs = await AsyncStorage.getItem(`@student_class_activities_${userId}`);
        if (localActs) setClassActivities(JSON.parse(localActs));
        const cachedActivities = localActs ? JSON.parse(localActs) : [];

        try {
          const snap = await getDocs(collection(db, 'users', userId, 'subscriptions'));
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setStudentSubscriptions(list);
          await AsyncStorage.setItem(`@student_subscriptions_${userId}`, JSON.stringify(list));

          // Busca atividades por professor individualmente — falha em um não derruba os outros
          let allSubActivities = [];
          for (const sub of list) {
            if (!sub.teacherId) continue;
            try {
              const actSnap = await getDocs(collection(db, 'users', sub.teacherId, 'activities'));
              allSubActivities.push(...actSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch {
              // Regras do Firestore não permitem leitura direta — usa cache para este professor
              const fromCache = cachedActivities.filter(a => a.teacherId === sub.teacherId);
              allSubActivities.push(...fromCache);
            }
          }

          allSubActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setClassActivities(allSubActivities);
          if (allSubActivities.length > 0) {
            await AsyncStorage.setItem(`@student_class_activities_${userId}`, JSON.stringify(allSubActivities));
          }
        } catch (e) {
          console.warn("Firestore inacessível, usando cache local:", e);
          // Cache já foi carregado acima
        }
      }
    };

    setup();
    return cleanup;
  }, [user?.id]);

  // Publicar atividade VIP para a classe
  const publishActivity = async (title, type, fileUrlOrYtLink) => {
    if (!user) return;
    const teacherId = user.id;

    const newActivity = {
       id: 'act_' + Date.now().toString(),
       title,
       type, 
       url: fileUrlOrYtLink || '',
       teacherName: user.name || 'Seu Professor',
       teacherId: teacherId,
       createdAt: new Date().toISOString()
    };

    // Salva Localmente
    const updated = [newActivity, ...classActivities];
    setClassActivities(updated);
    await AsyncStorage.setItem(`@class_activities_${teacherId}`, JSON.stringify(updated));

    // Salva no Firebase Firestore
    try {
      const { doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      const docRef = doc(db, 'users', teacherId, 'activities', newActivity.id);
      await setDoc(docRef, newActivity);
    } catch (e) {
      console.warn("Erro ao sincronizar nova atividade com o Firebase:", e);
    }
  };

  // Aluno ingressa na turma por código de convite
  const joinClass = async (code) => {
    if (!user) return { success: false, error: 'Faça login primeiro para entrar na turma.' };
    const studentId = user.id;

    const trimmedCode = code.trim().toUpperCase();
    if (trimmedCode.length < 3) return { success: false, error: 'Código muito curto.' };

    try {
      const { collection, getDocs, query, where, doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // 1. Encontra o professor correspondente na coleção users
      const q = query(collection(db, 'users'), where('isTeacher', '==', true), where('teacherCode', '==', trimmedCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        return { success: false, error: 'Código de professor não encontrado. Verifique a digitação.' };
      }

      const teacherDoc = snap.docs[0];
      const teacherId = teacherDoc.id;
      const teacherData = teacherDoc.data();

      // 2. Cria documento de inscrição para o Aluno
      const subObj = {
        id: teacherId,
        teacherId: teacherId,
        teacherName: teacherData.name || 'Seu Professor',
        teacherPhoto: teacherData.photo || null,
        code: trimmedCode,
        joinedAt: new Date().toISOString()
      };

      const studentSubDocRef = doc(db, 'users', studentId, 'subscriptions', teacherId);
      await setDoc(studentSubDocRef, subObj);

      // 3. Salva inscrição do aluno (crítico)
      const updatedSubs = [...studentSubscriptions.filter(s => s.teacherId !== teacherId), subObj];
      setStudentSubscriptions(updatedSubs);
      await AsyncStorage.setItem(`@student_subscriptions_${studentId}`, JSON.stringify(updatedSubs));

      // 4. Best-effort: registra aluno na lista do professor (pode falhar por regras de segurança)
      try {
        const studentObj = {
          id: studentId,
          name: user.name || 'Aluno',
          email: user.email || '',
          progress: user.watchedVideos || 0,
          status: 'Ativo',
          joinedAt: new Date().toISOString()
        };
        const teacherStudentDocRef = doc(db, 'users', teacherId, 'students', studentId);
        await setDoc(teacherStudentDocRef, studentObj);
      } catch (e) {
        console.warn("Não foi possível registrar na lista do professor:", e);
      }

      // 5. Tenta carregar atividades agora — mas não sobrescreve cache se vier vazio
      try {
        const activitiesSnap = await getDocs(collection(db, 'users', teacherId, 'activities'));
        const activitiesList = activitiesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (activitiesList.length > 0) {
          const allClassActivities = [...classActivities.filter(act => act.teacherId !== teacherId), ...activitiesList];
          allClassActivities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setClassActivities(allClassActivities);
          await AsyncStorage.setItem(`@student_class_activities_${studentId}`, JSON.stringify(allClassActivities));
        }
      } catch (e) {
        console.warn("Atividades serão carregadas na próxima abertura:", e);
      }

      return { success: true, message: `Excelente! Você agora é aprendiz de ${teacherData.name || 'Seu Professor'}!` };
    } catch (e) {
      console.error("Erro ao entrar na turma:", e);
      return { success: false, error: 'Falha ao conectar com o servidor. Tente novamente mais tarde.' };
    }
  };

  // Professor adiciona um aluno diretamente por E-mail
  const addStudent = async (studentEmail) => {
    if (!user) return { success: false, error: 'Faça login primeiro.' };
    const teacherId = user.id;

    const emailClean = studentEmail.trim().toLowerCase();
    if (!emailClean) return { success: false, error: 'E-mail em branco.' };

    const alreadyAdded = managedStudents.some(s => s.email === emailClean);
    if (alreadyAdded) return { success: false, error: 'Este aluno já está na sua lista.' };

    let studentId = 'temp_' + Date.now();
    let studentName = emailClean.split('@')[0];
    let foundRealUser = false;

    try {
      const { collection, getDocs, query, where, doc, setDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      // Procura usuário pelo email
      const userQuery = query(collection(db, 'users'), where('email', '==', emailClean));
      const querySnap = await getDocs(userQuery);

      if (!querySnap.empty) {
        const foundDoc = querySnap.docs[0];
        studentId = foundDoc.id;
        const realUserData = foundDoc.data();
        studentName = realUserData.name || studentName;
        foundRealUser = true;
      }

      const newStudentObj = {
        id: studentId,
        name: studentName,
        email: emailClean,
        progress: foundRealUser ? (querySnap.docs[0].data().watchedVideos || 0) : 0,
        status: foundRealUser ? 'Ativo' : 'Pendente',
        addedAt: new Date().toISOString()
      };

      // Adiciona na subcoleção de alunos do professor
      const studentDocRef = doc(db, 'users', teacherId, 'students', studentId);
      await setDoc(studentDocRef, newStudentObj);

      // Se for usuário real, adiciona a inscrição correspondente do professor para ele
      if (foundRealUser) {
        const subDocRef = doc(db, 'users', studentId, 'subscriptions', teacherId);
        await setDoc(subDocRef, {
          id: teacherId,
          teacherId: teacherId,
          teacherName: user.name || 'Seu Professor',
          teacherPhoto: user.photo || null,
          code: teacherCode,
          joinedAt: new Date().toISOString()
        });
      }

      // Atualiza local
      const updatedList = [newStudentObj, ...managedStudents.filter(s => s.email !== emailClean)];
      setManagedStudents(updatedList);
      await AsyncStorage.setItem(`@managed_students_${teacherId}`, JSON.stringify(updatedList));

      return { success: true, isPending: !foundRealUser, message: foundRealUser ? 'Aluno adicionado com sucesso!' : 'E-mail não cadastrado ainda. Esse aluno aparecerá como pendente até criar uma conta.' };
    } catch (e) {
      console.error("Erro ao adicionar aluno:", e);
      // Fallback local caso offline
      const newStudentObj = {
        id: studentId,
        name: studentName,
        email: emailClean,
        progress: 0,
        status: 'Pendente',
        addedAt: new Date().toISOString()
      };
      const updatedList = [newStudentObj, ...managedStudents.filter(s => s.email !== emailClean)];
      setManagedStudents(updatedList);
      await AsyncStorage.setItem(`@managed_students_${teacherId}`, JSON.stringify(updatedList));
      return { success: true, message: 'Aluno agendado localmente (Offline). Será sincronizado quando reestabelecer conexão.' };
    }
  };

  // Remover aluno
  const removeStudent = async (studentId) => {
    if (!user) return;
    const teacherId = user.id;

    // Remove local
    const updated = managedStudents.filter(s => s.id !== studentId);
    setManagedStudents(updated);
    await AsyncStorage.setItem(`@managed_students_${teacherId}`, JSON.stringify(updated));

    // Remove do Firestore
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const docRef = doc(db, 'users', teacherId, 'students', studentId);
      await deleteDoc(docRef);

      const isTemp = studentId.startsWith('temp_');
      if (!isTemp) {
        const subDocRef = doc(db, 'users', studentId, 'subscriptions', teacherId);
        await deleteDoc(subDocRef);
      }
    } catch (e) {
      console.warn("Erro ao sincronizar remoção do aluno:", e);
    }
  };

  // --- STREAK ---

  const updateStreak = async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;

    const today = new Date().toDateString();
    if (u.lastStreakDate === today) return; // já contou hoje

    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = u.lastStreakDate === yesterday ? (u.streak || 0) + 1 : 1;

    const updatedFields = { streak: newStreak, lastStreakDate: today };
    const updatedUser = { ...u, ...updatedFields };
    setUser(updatedUser);

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', u.id), updatedFields);
    } catch (e) {
      console.warn("Streak salvo localmente, pendente sync:", e);
    }

    await checkAchievements(updatedUser);
  };

  // --- CONQUISTAS ---

  const ACHIEVEMENT_DEFS = [
    // Vídeos
    { id: 'first_video',  icon: 'play-circle', title: 'Primeiro Dobrador',  desc: 'Assistiu ao primeiro vídeo de origami',  check: (u) => (u.watchedVideos || 0) >= 1   },
    { id: 'ten_videos',   icon: 'film',         title: 'Estudante Dedicado', desc: 'Completou 10 vídeos',                    check: (u) => (u.watchedVideos || 0) >= 10  },
    { id: 'fifty_videos', icon: 'tv',           title: 'Maratonista',        desc: 'Completou 50 vídeos',                    check: (u) => (u.watchedVideos || 0) >= 50  },
    { id: 'hundred_videos',icon:'monitor',      title: 'Enciclopédia Viva',  desc: 'Completou 100 vídeos',                   check: (u) => (u.watchedVideos || 0) >= 100 },
    // Diagramas .fold
    { id: 'first_fold',   icon: 'book-open',    title: 'Leitor de Diagramas',desc: 'Abriu seu primeiro diagrama .fold',       check: (u) => (u.folds || 0) >= 1          },
    { id: 'fold_10',      icon: 'layers',       title: 'Colecionador',       desc: 'Abriu 10 diagramas .fold',               check: (u) => (u.folds || 0) >= 10         },
    // Streaks
    { id: 'streak_3',     icon: 'zap',          title: 'Aquecendo',          desc: '3 dias seguidos no app',                 check: (u) => (u.streak || 0) >= 3         },
    { id: 'streak_7',     icon: 'sun',          title: 'Uma Semana',         desc: '7 dias de streak',                       check: (u) => (u.streak || 0) >= 7         },
    { id: 'streak_14',    icon: 'star',         title: 'Duas Semanas',       desc: '14 dias consecutivos',                   check: (u) => (u.streak || 0) >= 14        },
    { id: 'streak_30',    icon: 'moon',         title: 'Mês do Origami',     desc: '30 dias de streak',                      check: (u) => (u.streak || 0) >= 30        },
    { id: 'streak_100',   icon: 'shield',       title: 'Lendário',           desc: '100 dias consecutivos',                  check: (u) => (u.streak || 0) >= 100       },
    // Comunidade / Pro
    { id: 'went_pro',       icon: 'award',        title: 'Membro Pro',         desc: 'Tornou-se um membro Pro',                    check: (u) => u.isPro === true             },
    // Evolução de nível
    { id: 'rank_intermediate', icon: 'trending-up', title: 'Subindo de Nível',  desc: 'Evoluiu para Intermediário (15 vídeos)',    check: (u) => (u.watchedVideos || 0) >= 15 },
    { id: 'rank_advanced',     icon: 'zap',          title: 'Dobrador Avançado', desc: 'Evoluiu para Avançado (50 vídeos + 7 dias)', check: (u) => (u.watchedVideos || 0) >= 50 && (u.streak || 0) >= 7 },
  ];

  const checkAchievements = async (currentUser) => {
    const u = currentUser || user;
    if (!u) return;

    const current = u.achievements || [];
    const newlyUnlocked = ACHIEVEMENT_DEFS
      .filter(def => !current.includes(def.id) && def.check(u))
      .map(def => def.id);

    if (newlyUnlocked.length === 0) return;

    const updatedAchievements = [...current, ...newlyUnlocked];

    // Progressão automática de rank
    const rankUpdate = {};
    if (newlyUnlocked.includes('rank_advanced')) {
      rankUpdate.rank = 'Avançado';
    } else if (newlyUnlocked.includes('rank_intermediate') && u.rank !== 'Avançado') {
      rankUpdate.rank = 'Intermediário';
    }

    const updatedUser = { ...u, achievements: updatedAchievements, ...rankUpdate };
    setUser(updatedUser);

    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', u.id), { achievements: updatedAchievements, ...rankUpdate });
    } catch (e) {
      console.warn("Conquistas salvas localmente, pendente sync:", e);
    }
  };

  const updateRank = async (newRank) => {
    if (!user) return;
    const updatedUser = { ...user, rank: newRank };
    setUser(updatedUser);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', user.id), { rank: newRank });
    } catch (e) {
      console.warn("Rank salvo localmente:", e);
    }
  };

  const updateNotifPrefs = async (newPrefs) => {
    if (!user) return;
    setNotifPrefs(newPrefs);
    await AsyncStorage.setItem(`@notif_prefs_${user.id}`, JSON.stringify(newPrefs));
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', user.id), { notificationPrefs: newPrefs });
    } catch (e) {
      console.warn('Notif prefs saved locally:', e);
    }
  };

  const unlockAchievement = async (achievementId) => {
    if (!user || user.achievements?.includes(achievementId)) return;
    const updatedUser = { ...user, achievements: [...(user.achievements || []), achievementId] };
    setUser(updatedUser);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      await updateDoc(doc(db, 'users', user.id), { achievements: updatedUser.achievements });
    } catch (e) {
      console.warn("Conquista salva localmente:", e);
    }
  };

  // Mudar nome do vídeo do youtube apenas para ele (Biblioteca/Favoritos)
  const updateYoutubeVideoTitle = async (projectId, newTitle) => {
    if (!user) return;
    const userId = user.id;

    const isImported = importedProjects.some(p => p.id === projectId || p.id?.toString() === projectId?.toString());
    if (isImported) {
      try {
        // Usa o caso de uso (Clean Architecture) para atualizar o título do projeto
        await ManageProjectsUseCase.updateProjectTitle(projectId, newTitle, userId);
        
        // Recarrega os projetos atualizados do repositório/datasource
        const updatedProjects = await ManageProjectsUseCase.getProjects(userId);
        setImportedProjects(updatedProjects);
      } catch (e) {
        console.error("Erro ao renomear projeto via UseCase:", e);
        throw e;
      }
    } else {
      // Atualiza nos salvos da comunidade (favoritos)
      const updatedSaved = savedOrigamis.map(o => {
        const idString = o.id?.toString() || o.videoId || '';
        if (idString === projectId || o.videoId === projectId || o.id === projectId) {
          return { ...o, title: newTitle };
        }
        return o;
      });
      setSavedOrigamis(updatedSaved);
      await AsyncStorage.setItem(`@favorites_${user.id}`, JSON.stringify(updatedSaved));

      // Sincroniza favoritação no Firestore
      try {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        
        const targetFav = updatedSaved.find(o => {
          const idString = o.id?.toString() || o.videoId || '';
          return idString === projectId || o.videoId === projectId || o.id === projectId;
        });

        if (targetFav) {
          const docId = targetFav.id?.toString() || targetFav.videoId || 'unknown';
          const docRef = doc(db, 'users', userId, 'favorites', docId);
          await setDoc(docRef, {
            ...targetFav,
            title: newTitle,
            savedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (e) {
        console.warn("Sincronização offline de favoritos pendente:", e);
      }
    }
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
      upgradeToPro, downgradeFromPro, managedStudents, addStudent, removeStudent, updateYoutubeVideoTitle,
      updateStreak, unlockAchievement, checkAchievements, ACHIEVEMENT_DEFS, updateRank,
      notifPrefs, updateNotifPrefs
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
