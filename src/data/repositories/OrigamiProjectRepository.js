import { OrigamiProject } from '../../domain/entities/OrigamiProject';
import { auth, db } from '../../firebase';
import { LocalProjectDataSource } from '../datasources/LocalProjectDataSource';
import { RemoteProjectDataSource } from '../datasources/RemoteProjectDataSource';

export class OrigamiProjectRepository {

  // [CREATE] / [UPDATE] Salvar novo projeto
  static async save(project, optionalUserId = null) {
    try {
      const user = optionalUserId ? { uid: optionalUserId } : auth.currentUser;
      if (!user) throw new Error("Usuário não autenticado para acessar a biblioteca!");
      
      const userId = user.uid;
      
      // Save locally first for immediate persistence/offline capability
      await LocalProjectDataSource.save(userId, project);
      
      // Then attempt to save to cloud
      // Se não tiver internet, pode falhar mas o local já está salvo
      try {
        await RemoteProjectDataSource.save(userId, project);
      } catch (cloudErr) {
        console.warn("Aviso: Projeto salvo localmente, mas não foi possível sincronizar com a nuvem no momento.", cloudErr);
      }
      
      return project;
    } catch (e) {
      console.error("Erro ao salvar projeto:", e);
      throw e;
    }
  }

  // [READ] Buscar todos os projetos
  static async getAll(optionalUserId = null) {
    try {
      const user = optionalUserId ? { uid: optionalUserId } : auth.currentUser;
      if (!user) return []; 
      
      const userId = user.uid;
      
      // Carrega local IMEDIATAMENTE (Offline first)
      return await LocalProjectDataSource.getAll(userId);
    } catch (e) {
      console.error("Erro ao buscar projetos:", e);
      return [];
    }
  }

  static async syncWithCloud(userId) {
    try {
      const remoteProjects = await RemoteProjectDataSource.getAll(userId);
      for (const p of remoteProjects) {
        await LocalProjectDataSource.save(userId, p);
      }
      // Retorna a lista atualizada para que o Contexto possa atualizar o estado
      return await LocalProjectDataSource.getAll(userId);
    } catch (e) {
      console.warn("Erro ao sincronizar projetos com a nuvem:", e);
      throw e;
    }
  }

  // [UPDATE] Criar ou Atualizar (upsert)
  static async update(project) {
    return this.save(project);
  }

  // [DELETE] Deletar projeto
  static async delete(id, optionalUserId = null) {
    try {
      const user = optionalUserId ? { uid: optionalUserId } : auth.currentUser;
      if (!user) return false;
      
      const userId = user.uid;
      
      // Delete locally
      await LocalProjectDataSource.delete(userId, id);
      
      // Delete from cloud (Don't await fully to avoid blocking UI if offline/slow)
      RemoteProjectDataSource.delete(userId, id).catch(cloudErr => {
        console.warn("Aviso: Falha ao deletar da nuvem (Sync pendente).", cloudErr);
      });
      
      return true;
    } catch (e) {
      console.error("Erro ao deletar:", e);
      return false;
    }
  }
}
