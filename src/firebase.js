import { initializeApp } from 'firebase/app';
// 1. Importe o initializeAuth e o getReactNativePersistence
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// 2. Importe o AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  // ... suas chaves do firebase continuam iguais aqui ...
  // Your web app's Firebase configuration
  apiKey: "CHAVE_REMOVIDA",
  authDomain: "origamiappteste.firebaseapp.com",
  projectId: "origamiappteste",
  storageBucket: "origamiappteste.firebasestorage.app",
  messagingSenderId: "1012273596746",
  appId: "1:1012273596746:web:418ee5234d89b423a959b3"
};


const app = initializeApp(firebaseConfig);

// 3. Substitua o antigo const auth = getAuth(app) por isso:
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { auth, db };