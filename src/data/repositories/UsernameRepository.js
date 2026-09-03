import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

/**
 * Nome de usuario (@handle). Tudo passa pelas Cloud Functions: a reserva
 * precisa ser transacional, e a colecao `usernames` fica fechada para o
 * cliente justamente para ninguem reservar um handle que nao e seu.
 */
export class UsernameRepository {

  // Retorno da tela enquanto a pessoa digita. Nao reserva: entre o "disponivel"
  // e o "salvar" outro pode levar o handle — quem decide e o set().
  static async check(username) {
    const fn = httpsCallable(functions, 'checkUsername');
    const { data } = await fn({ username });
    return data;
  }

  static async set(username) {
    const fn = httpsCallable(functions, 'setUsername');
    const { data } = await fn({ username });
    return data;
  }

  static async findStudent(username) {
    const fn = httpsCallable(functions, 'findStudentByUsername');
    const { data } = await fn({ username });
    return data;
  }
}
