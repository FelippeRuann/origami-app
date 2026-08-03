export class OrigamiProject {
  /**
   * Entidade de Domínio (Clean Architecture)
   * Representa a regra de negócios central do que é um projeto no aplicativo.
   * Não sabe nada sobre Firebase, Banco de Dados, ou React. Apenas dados puros.
   */
  constructor(id, title, url, videoId, type, progress, date, data = null, source = 'manual') {
    this.id = id;
    this.title = title;
    this.url = url;
    this.videoId = videoId;
    this.type = type; // 'youtube' ou '.fold'
    this.progress = progress;
    this.date = date;
    this.data = data; // conteúdo do arquivo .fold, se aplicável
    // 'converted' = veio da conversão de PDF pela IA; 'manual' = o usuário adicionou.
    // Serve para separar na Library o que a IA gerou (e pode ter saído errado) do
    // que o usuário curou. Projetos antigos, sem o campo, contam como 'manual'.
    this.source = source || 'manual';
  }

  get isConverted() {
    return this.source === 'converted';
  }

  changeTitle(newTitle) {
    if (!newTitle || newTitle.trim() === '') {
      throw new Error("O título do origami é obrigatório.");
    }
    this.title = newTitle.trim();
  }
}
