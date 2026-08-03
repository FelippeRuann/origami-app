import { db } from '../../firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

// Repositório dos favoritos do Discover (users/{uid}/favorites).
// Única porta de saída para o Firestore — o AppContext nunca fala com o banco direto.
export class FavoritesRepository {

  static _docRef(userId, favoriteId) {
    if (!userId) throw new Error('Usuário não autenticado para acessar favoritos!');
    return doc(db, 'users', userId, 'favorites', favoriteId.toString());
  }

  static async save(userId, origami) {
    await setDoc(this._docRef(userId, origami.id), {
      ...origami,
      savedAt: origami.savedAt || new Date().toISOString(),
    });
  }

  static async remove(userId, favoriteId) {
    await deleteDoc(this._docRef(userId, favoriteId));
  }

  static async updateTitle(userId, favorite, newTitle) {
    const docId = favorite.id?.toString() || favorite.videoId || 'unknown';
    await setDoc(this._docRef(userId, docId), {
      ...favorite,
      title: newTitle,
      savedAt: new Date().toISOString(),
    }, { merge: true });
  }
}
