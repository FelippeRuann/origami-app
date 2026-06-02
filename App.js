// Importações principais do React e React Native
import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import * as Linking from 'expo-linking';

// Importação do Contexto Global (onde ficam os dados do usuário e funções do Firebase)
import { AppProvider, useApp } from './src/context/AppContext';

// Importação de todas as telas do aplicativo
import Auth from './src/screens/Auth';
import Discover from './src/screens/Discover';
import Library from './src/screens/Library';
import Profile from './src/screens/Profile';
import TeacherPro from './src/screens/TeacherPro';
import AdminDiscovery from './src/screens/AdminDiscovery';
import DetailScreen from './src/screens/DetailScreen';
import FoldingScreen from './src/screens/FoldingScreen';
import Layout from './src/components/Layout';
import AchievementToast from './src/components/AchievementToast';

/**
 * MainNavigator: Componente responsável por decidir qual tela mostrar.
 * Ele escuta o estado global (useApp) e renderiza a tela correta.
 */
function MainNavigator() {
  // Pegando os estados globais do AppContext
  const { user, isDarkMode, theme, currentDetail, foldingOrigami, currentRoute, setCurrentRoute, isAuthReady, setResetOobCode } = useApp();

  useEffect(() => {
    const parseUrl = (url) => {
      if (!url) return;
      const m = url.match(/[?&]oobCode=([^&\s]+)/);
      if (m) setResetOobCode(decodeURIComponent(m[1]));
    };
    Linking.getInitialURL().then(parseUrl);
    const sub = Linking.addEventListener('url', ({ url }) => parseUrl(url));
    return () => sub.remove();
  }, []);

  // Função que decide o que renderizar na tela
  const renderContent = () => {
    // 1. Se o Firebase ainda não terminou de checar se tem alguém logado, mostra uma tela vazia (Loading)
    if (!isAuthReady) {
      return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
    }

    // 2. Se não tem usuário logado, mostra a tela de Login/Cadastro (Auth)
    if (!user) {
      return <Auth />;
    }

    // 3. Se o usuário clicou em "Start Folding", mostra a tela de dobradura (passo a passo)
    if (foldingOrigami) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <FoldingScreen />
        </View>
      );
    }

    // 4. Se o usuário clicou em um origami para ver os detalhes, mostra a tela de Detalhes
    if (currentDetail) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <DetailScreen />
        </View>
      );
    }

    // 5. Tela de Administração de Vídeos (Scan AI)
    if (currentRoute === 'AdminDiscovery') {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <AdminDiscovery onBack={() => setCurrentRoute('Profile')} />
        </View>
      );
    }

    // 6. Se nenhuma das opções acima for verdadeira, mostra as telas principais com a barra de navegação (Layout)
    const screens = {
      Discover: <Discover />,
      Library: <Library />,
      TeacherPro: <TeacherPro />,
      Profile: <Profile />
    };

    return (
      <Layout currentRoute={currentRoute} setCurrentRoute={setCurrentRoute} screens={screens} />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#E2E8F0' }]}>
      <StatusBar hidden={true} />
      <View style={[styles.appWrapper, { backgroundColor: theme.bg }]}>
        {renderContent()}
      </View>
      <AchievementToast />
    </View>
  );
}

/**
 * App: Componente raiz do aplicativo.
 * Ele envolve tudo com o AppProvider (para o estado global funcionar)
 * e faz configurações iniciais (como esconder a barra do Android).
 */
export default function App() {
  // useEffect roda uma vez quando o app inicia
  useEffect(() => {
    // Esconde a barra de navegação padrão do Android para deixar o app em tela cheia (imersivo)
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
    }
  }, []);

  return (
    // AppProvider permite que qualquer tela acesse os dados do usuário e o tema
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  appWrapper: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  }
});
