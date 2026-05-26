import { UserRepository } from '../../data/repositories/UserRepository';

export class AuthUseCase {
  
  static async login(email, password) {
    if (!email || !password) throw new Error("Preencha e-mail e senha");
    return await UserRepository.authenticate(email, password);
  }

  static async loginWithGoogle(idToken) {
    if (!idToken) throw new Error("Token do Google inválido");
    return await UserRepository.authenticateWithGoogle(idToken);
  }

  static async register(email, password, username, avatarIcon, nivel) {
    if (!email || !password || !username) throw new Error("Preencha os campos obrigatórios");
    
    return await UserRepository.registerUser(
      {
        name: username,
        email: email,
        photo: avatarIcon,
        rank: nivel,
        isPro: false,
        isTeacher: false
      },
      password
    );
  }

  static async checkActiveSession() {
    return await UserRepository.getSession();
  }

  static async logout() {
    return await UserRepository.clearSession();
  }

  static async updateAvatar(url) {
    return await UserRepository.updateUserSession({ photo: url });
  }

  static async updateUserSession(updates) {
    return await UserRepository.updateUserSession(updates);
  }

  static async updateWatchedCount() {
    const user = await UserRepository.getSession();
    if(user) {
      return await UserRepository.updateUserSession({ watchedVideos: user.watchedVideos + 1 });
    }
    return null;
  }
}
