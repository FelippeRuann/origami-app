import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { AppProvider, useApp } from './src/context/AppContext';
import Auth from './src/screens/Auth';
import Discover from './src/screens/Discover';
import Library from './src/screens/Library';
import Profile from './src/screens/Profile';
import TeacherPro from './src/screens/TeacherPro';
import DetailScreen from './src/screens/DetailScreen';
import FoldingScreen from './src/screens/FoldingScreen';
import Layout from './src/components/Layout';

function MainNavigator() {
  const { user, isDarkMode, theme, currentDetail, foldingOrigami, currentRoute, setCurrentRoute, isAuthReady } = useApp();

  const renderContent = () => {
    // Se o Firebase ainda não terminou de checar se tem alguém logado, mostra uma tela vazia
    if (!isAuthReady) {
      return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
    }

    if (!user) {
      return <Auth />;
    }

    if (foldingOrigami) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <FoldingScreen />
        </View>
      );
    }

    if (currentDetail) {
      return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
          <DetailScreen />
        </View>
      );
    }

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
    </View>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync("hidden");
      NavigationBar.setBehaviorAsync("overlay-swipe");
    }
  }, []);

  return (
    <AppProvider>
      <MainNavigator />
    </AppProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  appWrapper: {
    width: '100%',
    maxWidth: 480,
    flex: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  }
});
