export class User {
  /**
   * Entidade de Domínio - Representa o Usuário
   */
  constructor({ id, name, email, photo, isPro = false, isTeacher = false, rank = 'Iniciante', folds = 0, watchedVideos = 0 }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.photo = photo || 'user';
    this.isPro = isPro;
    this.isTeacher = isTeacher;
    this.rank = rank;
    this.folds = folds;
    this.watchedVideos = watchedVideos;
  }
}
