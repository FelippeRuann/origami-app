import React, { createContext, useState, useContext } from 'react';
import { lightTheme, darkTheme } from '../theme';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true); // Default to dark mode as requested
  const [currentRoute, setCurrentRoute] = useState('Discover');
  const [currentDetail, setCurrentDetail] = useState(null);
  
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

  const login = (type) => {
    setUser({
      id: '1',
      name: 'Rafael Silva',
      email: 'rafael@example.com',
      photo: 'https://picsum.photos/seed/rafael/200/200',
      isPro: true,
      isTeacher: true,
      rank: 'Expert',
      folds: 128
    });
  };

  const logout = () => setUser(null);

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
      user, login, logout,
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
