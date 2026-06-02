import { OrigamiProject } from '../entities/OrigamiProject';
import { OrigamiProjectRepository } from '../../data/repositories/OrigamiProjectRepository';
/**
 * Use Case (Casos de Uso - Clean Architecture)
 * Contém a Lógica de Negócios da aplicação. Ele orquestra.
 * Ele diz o que precisa ser feito validando os dados antes de jogar para o Repositório.
 */
export class ManageProjectsUseCase {
  
  static async addYoutubeProject(title, url, videoId, userId = null) {
    // Regra de Negócio: Não permite salvar sem título.
    if (!title || title.trim() === '') {
      throw new Error("O título é obrigatório");
    }
    
    // Regra de Negócio: Configura um valor padrão de tempo de watch se for Youtube
    const newProject = {
      id: Date.now().toString(),
      title: title,
      url: url,
      videoId: videoId || 'dQw4w9WgXcQ',
      type: 'youtube', // Indica diferenciar de '.fold'
      progress: '0%',
      date: 'Agora'
    };
 
    return await OrigamiProjectRepository.save(newProject, userId);
  }
 
  static async addFoldProject(filename, foldData, userId = 'guest') {
    let finalData = foldData;
    let fileUrl = null;

    // Se o arquivo for muito grande (mais de 800KB)
    const jsonString = JSON.stringify(foldData);
    if (jsonString.length > 800000) { 
      try {
        const bucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
        if (!bucket) throw new Error("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET is not defined");
        const uploadPath = `users/${userId}/folds/${Date.now()}_${filename}`;
        
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodeURIComponent(uploadPath)}`;
        const response = await fetch(url, {
           method: 'POST',
           headers: {
              'Content-Type': 'application/json'
           },
           body: jsonString
        });
        
        if (!response.ok) {
           throw new Error("Erro REST API Firebase Storage: " + response.status);
        }
        
        const responseJson = await response.json();
        // Construct the download URL from the response token
        const token = responseJson.downloadTokens;
        fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(uploadPath)}?alt=media&token=${token}`;
        
        finalData = null; // Remove os dados gigantes para não estourar o limite de 1MB do Firestore
      } catch (err) {
        console.error("Erro ao subir arquivo grande para o Storage:", err);
        // Se falhar, vamos salvar localmente sem quebrar e não enviamos o data pro Firestore para não dar crash 
        finalData = { _error: 'Arquivo muito grande e upload falhou. Armazenado parcialmente.' };
      }
    }

    const newProject = {
      id: Date.now().toString(),
      title: foldData.title || filename.replace(/\.fold$/, ''),
      progress: '0%',
      date: 'Agora',
      data: finalData,
      url: fileUrl,
      type: 'fold'
    };
    return await OrigamiProjectRepository.save(newProject, userId);
  }

  static async getProjects(optionalUserId = null) {
    return await OrigamiProjectRepository.getAll(optionalUserId);
  }

  static async syncProjects(userId) {
    return await OrigamiProjectRepository.syncWithCloud(userId);
  }

  static async removeProject(id, userId = null) {
    return await OrigamiProjectRepository.delete(id, userId);
  }

  static async updateProjectTitle(projectId, newTitle, userId = null) {
    if (!newTitle || newTitle.trim() === '') {
      throw new Error("O título é obrigatório");
    }

    const projects = await OrigamiProjectRepository.getAll(userId);
    const pData = projects.find(p => p.id === projectId || p.id?.toString() === projectId?.toString());

    if (!pData) {
      throw new Error("Projeto não encontrado");
    }

    // Instancia a Entidade de Domínio OrigamiProject para encapsular a regra de negócio
    const origamiProject = new OrigamiProject(
      pData.id,
      pData.title,
      pData.url,
      pData.videoId,
      pData.type,
      pData.progress,
      pData.date,
      pData.data
    );

    // Executa a regra de negócio na entidade
    origamiProject.changeTitle(newTitle);

    // Salva no repositório
    return await OrigamiProjectRepository.save(origamiProject, userId);
  }
}
