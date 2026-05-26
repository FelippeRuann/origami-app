export class User {
  constructor({ id, name, email, photo, isPro = false, isTeacher = false, rank = 'Iniciante', folds = 0, watchedVideos = 0, teacherCode = null, streak = 0, lastStreakDate = null, achievements = [] }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.photo = photo || 'user';
    this.isPro = isPro;
    this.isTeacher = isTeacher;
    this.rank = rank;
    this.folds = folds;
    this.watchedVideos = watchedVideos;
    this.teacherCode = teacherCode;
    this.streak = streak;
    this.lastStreakDate = lastStreakDate;
    this.achievements = Array.isArray(achievements) ? achievements : [];
  }
}
