import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrigamiProject } from '../../domain/entities/OrigamiProject';

const PROJECTS_STORAGE_KEY = '@origami_projects_';

export class LocalProjectDataSource {
  
  static async save(userId, project) {
    try {
      const allProjects = await this.getAll(userId);
      const existingIdx = allProjects.findIndex(p => p.id === project.id);
      
      if (existingIdx >= 0) {
        allProjects[existingIdx] = project;
      } else {
        allProjects.push(project);
      }
      
      await AsyncStorage.setItem(`${PROJECTS_STORAGE_KEY}${userId}`, JSON.stringify(allProjects));
      return project;
    } catch (e) {
      console.error("Erro ao salvar projeto localmente:", e);
      throw e;
    }
  }

  static async getAll(userId) {
    try {
      const jsonValue = await AsyncStorage.getItem(`${PROJECTS_STORAGE_KEY}${userId}`);
      if (jsonValue != null) {
        const parsed = JSON.parse(jsonValue);
        return parsed.map(item => new OrigamiProject(
          item.id, item.title, item.url, item.videoId, item.type, item.progress, item.date, item.data
        ));
      }
      return [];
    } catch(e) {
      console.error("Erro ao ler projetos locais:", e);
      return [];
    }
  }

  static async delete(userId, projectId) {
    try {
      const allProjects = await this.getAll(userId);
      const filtered = allProjects.filter(p => p.id !== projectId);
      await AsyncStorage.setItem(`${PROJECTS_STORAGE_KEY}${userId}`, JSON.stringify(filtered));
      return true;
    } catch(e) {
      console.error("Erro ao deletar projeto localmente:", e);
      return false;
    }
  }
}
