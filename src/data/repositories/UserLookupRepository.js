import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

/**
 * Buscas de usuario que antes eram feitas direto no Firestore pelo cliente.
 *
 * Passaram para Cloud Functions para que as regras possam negar `list` na
 * coleção `users`: com list liberado, qualquer pessoa logada consegue varrer
 * os dados de todos os usuarios. A function roda com Admin SDK e devolve
 * apenas os campos que a tela precisa.
 */
export class UserLookupRepository {

  static async findTeacherByCode(code) {
    const fn = httpsCallable(functions, 'findTeacherByCode');
    const { data } = await fn({ code });
    return data;
  }
}
