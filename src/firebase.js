import { initializeApp } from 'firebase/app';
// 1. Importe o initializeAuth e o getReactNativePersistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// 2. Importe o AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "CHAVE_REMOVIDA",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "origamiappteste.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "origamiappteste",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "origamiappteste.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1012273596746",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1012273596746:web:418ee5234d89b423a959b3"
};

const app = initializeApp(firebaseConfig);

// 3. Substitua o antigo const auth = getAuth(app) por isso:
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
