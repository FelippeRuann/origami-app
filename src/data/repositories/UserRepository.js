import { User } from '../../domain/entities/User';
import { auth, db } from '../../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

export class UserRepository {

  // [CREATE] Registrar novo usuário no Firebase Auth e Firestore
  static async registerUser(userData, password) {
    // 1. Cria no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, password);
    const user = userCredential.user;

    // 2. Atualiza profile com nome e foto (ícone)
    await updateProfile(user, {
      displayName: userData.name,
      photoURL: userData.photo
    });

    // 3. Salva os extras no Firestore
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      rank: userData.rank || 'Iniciante',
      isPro: false,
      isTeacher: false,
      watchedVideos: 0,
      photo: userData.photo || 'user',
      createdAt: new Date().toISOString()
    });

    return new User({ ...userData, id: user.uid });
  }

  // [READ] Buscar na "tabela" e autentica no Firebase Auth
  static async authenticate(email, password) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // 2. Busca dados extras no Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    let extraData = {};
    if (userDoc.exists()) {
      extraData = userDoc.data();
    }

    return new User({
      id: user.uid,
      name: user.displayName || 'Usuário',
      email: user.email,
      photo: user.photoURL || 'star',
      rank: extraData.rank || 'Iniciante',
      isPro: extraData.isPro || false,
      isTeacher: extraData.isTeacher || false,
      watchedVideos: extraData.watchedVideos || 0,
      username: extraData.username || null,
      teacherCode: extraData.teacherCode || null,
      streak: extraData.streak || 0,
      lastStreakDate: extraData.lastStreakDate || null,
      achievements: extraData.achievements || [],
    });
  }

  // [READ] Autenticar com Google usando credencial (Token)
  static async authenticateWithGoogle(idToken) {
    try {
      const credential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      let extraData = {};
      if (userDoc.exists()) {
        extraData = userDoc.data();
      } else {
        // Primeiro login com Google, cria o registro inicial
        extraData = { rank: 'Iniciante', isPro: false, isTeacher: false, watchedVideos: 0, createdAt: new Date().toISOString() };
        await setDoc(userDocRef, extraData);
      }

      return new User({
        id: user.uid,
        name: user.displayName || 'Usuário Google',
        email: user.email,
        photo: user.photoURL || 'star',
        rank: extraData.rank || 'Iniciante',
        isPro: extraData.isPro || false,
        isTeacher: extraData.isTeacher || false,
        watchedVideos: extraData.watchedVideos || 0,
        username: extraData.username || null,
        teacherCode: extraData.teacherCode || null,
        streak: extraData.streak || 0,
        lastStreakDate: extraData.lastStreakDate || null,
        achievements: extraData.achievements || [],
      });
    } catch (error) {
      console.error("Erro authenticateWithGoogle", error);
      throw error;
    }
  }

  // [READ] Busca Sessão Ativa (o AppContext chama para ver se o Firebase lembrou a sessão)
  static async getSession() {
    return new Promise((resolve) => {
      // Usamos onAuthStateChanged que é o padrão ouro do Firebase para sessões persistentes
      const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
        unsubscribe(); 
        if (firebaseUser) {
          try {
            // Tenta pegar dados extras do Firestore (com cache offline ativado no firebase.js)
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            let extraData = {};
            if (userDoc && userDoc.exists()) {
              extraData = userDoc.data();
            }

            resolve(new User({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email,
              photo: firebaseUser.photoURL || 'star',
              rank: extraData.rank || 'Iniciante',
              isPro: extraData.isPro || false,
              isTeacher: extraData.isTeacher || false,
              watchedVideos: extraData.watchedVideos || 0,
              username: extraData.username || null,
              teacherCode: extraData.teacherCode || null,
              streak: extraData.streak || 0,
              lastStreakDate: extraData.lastStreakDate || null,
              achievements: extraData.achievements || [],
            }));
          } catch (e) {
            console.warn("Firestore inacessível (provavelmente offline), retornando dados básicos do Auth:", e);
            // Se o Firestore falhar (offline e sem cache ainda), não desloga o usuário!
            // Retorna o básico que o Firebase Auth já tem guardado
            resolve(new User({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário',
              email: firebaseUser.email,
              photo: firebaseUser.photoURL || 'star',
              rank: 'Iniciante', // Fallback
              isPro: false,
              isTeacher: false,
              watchedVideos: 0,
              username: null,
              teacherCode: null
            }));
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  // [DELETE] Limpa Sessão (Logout no firebase)
  static async clearSession() {
    await signOut(auth);
  }

  // [UPDATE] Atualização direta de campos no documento do usuário.
  // Para fluxos otimistas (o estado local já foi atualizado) — não re-busca a sessão.
  static async updateFields(userId, fields) {
    if (!userId) throw new Error('Usuário não autenticado!');
    await updateDoc(doc(db, 'users', userId), fields);
  }

  // [UPDATE] Atualiza dados do Usuário (ex: foto, rank)
  static async updateUserSession(updates) {
    const currentUser = auth.currentUser;
    if (currentUser) {
      // Se tiver mudando o displayName ou photo:
      const authUpdates = {};
      if (updates.name) authUpdates.displayName = updates.name;
      if (updates.photo) authUpdates.photoURL = updates.photo;
      
      if (Object.keys(authUpdates).length > 0) {
        await updateProfile(currentUser, authUpdates);
      }

      // Se tiver mudando algo no Firestore (isPro, rank, watchedVideos, etc)
      // O name vai para os DOIS lados: displayName no Auth (que e a fonte lida
      // pela sessao) e o doc do Firestore, de onde findTeacherByCode le o nome
      // do origamista para mostrar a quem segue.
      const firestoreUpdates = { ...updates };
      delete firestoreUpdates.email;
      delete firestoreUpdates.id;

      if (Object.keys(firestoreUpdates).length > 0) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, firestoreUpdates);
      }

      // Puxa a nova sessão limpinha
      return await this.getSession();
    }
    throw new Error("Nenhum usuário logado para atualizar");
  }
}

