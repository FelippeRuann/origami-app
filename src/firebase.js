import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth, browserLocalPersistence, getReactNativePersistence } from 'firebase/auth';
import { initializeFirestore, CACHE_SIZE_UNLIMITED, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET?.replace(/^gs:\/\//i, ''),
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

// 1. Configuração do Auth com Persistência
let auth;
if (Platform.OS === 'web') {
  // No Navegador, usamos browserLocalPersistence
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  });
} else {
  // No Mobile (Expo), usamos AsyncStorage
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// 2. Configuração do Firestore (Offline Cache via AsyncStorage manual)
const db = initializeFirestore(app, {});

// Nota: A persistência nativa do Firestore no Expo Go pode ser instável.
// Por isso, mantemos nossa estratégia de Cache Manual via AsyncStorage no AppContext.

const storage = getStorage(app);
const functions = getFunctions(app);

export { auth, db, storage, functions };
