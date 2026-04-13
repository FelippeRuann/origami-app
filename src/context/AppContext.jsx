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

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode as requested
  const [currentRoute, setCurrentRoute] = useState('Discover');
  const [currentDetail, setCurrentDetail] = useState(null);
  
  // Adicionando um estado para saber se o Firebase já checou o login
  const [isAuthReady, setIsAuthReady] = useState(false);
  
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

  // Efeito para escutar se o usuário está logado ou não
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Busca os dados adicionais do usuário no Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              name: userData.username || firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              photo: userData.avatarIcon || 'user',
              isPro: userData.isPro || false,
              isTeacher: userData.isTeacher || false,
              rank: userData.nivel || 'Iniciante',
              folds: userData.folds || 0
            });
          } else {
            // Fallback caso o documento não exista
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.email.split('@')[0],
              email: firebaseUser.email,
              photo: 'user',
              isPro: false,
              isTeacher: false,
              rank: 'Iniciante',
              folds: 0
            });
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
        }
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password, username, avatarIcon, nivel) => {
    try {
      // 1. Cria a conta no Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Salva os dados extras no Firestore
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        username: username,
        email: email,
        avatarIcon: avatarIcon,
        nivel: nivel,
        isPro: false,
        isTeacher: false,
        folds: 0,
        createdAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error("Erro no cadastro:", error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

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

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const saveOrigami = (origami) => {
    if (!user?.isPro && savedOrigamis.length >= 7) {
      alert("Limite atingido! Assine o Pro para salvar mais origamis.");
      return false;
    }
    if (!savedOrigamis.find(o => o.id === origami.id)) {
      setSavedOrigamis([...savedOrigamis, origami]);
    }
    return true;
  };

  const upgradeToPro = (asTeacher = false) => {
    setUser({ ...user, isPro: true, isTeacher: asTeacher });
  };

  return (
    <AppContext.Provider value={{
      user, login, register, logout, isAuthReady, resetPassword, updateAvatar, removeAvatar,
      isDarkMode, toggleTheme, theme,
      currentDetail, setCurrentDetail,
      currentRoute, setCurrentRoute,
      savedOrigamis, saveOrigami,
      projects, documents, activities,
      upgradeToPro
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
