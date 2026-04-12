import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "CHAVE_REMOVIDA",
  authDomain: "origamiappteste.firebaseapp.com",
  projectId: "origamiappteste",
  storageBucket: "origamiappteste.firebasestorage.app",
  messagingSenderId: "1012273596746",
  appId: "1:1012273596746:web:418ee5234d89b423a959b3"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados e a Autenticação
export const db = getFirestore(app);
export const auth = getAuth(app);