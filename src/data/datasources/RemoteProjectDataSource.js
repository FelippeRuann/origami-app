import { OrigamiProject } from '../../domain/entities/OrigamiProject';
import { db } from '../../firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

export class RemoteProjectDataSource {

  static getCollectionRef(userId) {
    if (!userId) throw new Error("Usuário não autenticado para acessar a biblioteca no Firestore!");
    return collection(db, 'users', userId, 'projects');
  }

  static async save(userId, project) {
    try {
      const colRef = this.getCollectionRef(userId);
      const docRef = doc(colRef, project.id);
      
      const dataToSave = {
        id: project.id,
        title: project.title || "Sem título",
        url: project.url || null,
        videoId: project.videoId || null,
        type: project.type,
        progress: project.progress,
        date: project.date || new Date().toISOString(),
        data: project.data || null
      };

      await setDoc(docRef, dataToSave, { merge: true });
      return project;
    } catch (e) {
      console.error("Erro ao salvar projeto no Firestore:", e);
      throw e;
    }
  }

  // Atualiza campos pontuais de um projeto (ex: posição do vídeo para retomar depois)
  static async saveProgress(userId, projectId, fields) {
    const docRef = doc(this.getCollectionRef(userId), projectId.toString());
    await setDoc(docRef, fields, { merge: true });
  }

  static async getAll(userId) {
    try {
      if (!userId) return [];
      
      const colRef = this.getCollectionRef(userId);
      const q = query(colRef, orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const projects = [];
      snapshot.forEach(docSnap => {
        const item = docSnap.data();
        projects.push(new OrigamiProject(
          item.id, item.title, item.url, item.videoId, item.type, item.progress, item.date, item.data
        ));
      });
      return projects;
    } catch (e) {
      console.error("Erro ao buscar projetos remotamente:", e);
      return [];
    }
  }

  static async delete(userId, projectId) {
    try {
      const colRef = this.getCollectionRef(userId);
      const docRef = doc(colRef, projectId);
      await deleteDoc(docRef);
      return true;
    } catch (e) {
      console.error("Erro ao deletar remotamente:", e);
      return false;
    }
  }
}
