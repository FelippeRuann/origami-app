import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

if (getApps().length === 0) initializeApp();

// Buscas de usuário no servidor (Admin SDK ignora as regras do Firestore).
// Objetivo: permitir trocar "allow list: if isSignedIn()" por "if false" nas regras,
// impedindo que qualquer usuário logado enumere e-mails de todos os usuários.
// Retornam APENAS os campos necessários — nunca o documento inteiro.

// Aluno procura o professor pelo código de convite (fluxo "Seguir origamista")
export const findTeacherByCode = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login primeiro.');
  }

  const code = (request.data?.code || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    throw new HttpsError('invalid-argument', 'Código inválido. Formato esperado: XXXX-XXXX.');
  }

  const db = getFirestore();
  const snap = await db.collection('users')
    .where('isTeacher', '==', true)
    .where('teacherCode', '==', code)
    .limit(1)
    .get();

  if (snap.empty) return { found: false };

  const teacherDoc = snap.docs[0];
  const data = teacherDoc.data();
  return {
    found: true,
    teacherId: teacherDoc.id,
    teacherName: data.name || null,
    teacherPhoto: data.photo || null,
  };
});

// Professor vincula aprendiz pelo e-mail (fluxo "Vincular por E-mail" da aba Pro)
export const findStudentByEmail = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Faça login primeiro.');
  }

  const email = (request.data?.email || '').trim().toLowerCase();
  if (!email.includes('@') || email.length < 5) {
    throw new HttpsError('invalid-argument', 'E-mail inválido.');
  }

  const db = getFirestore();
  const snap = await db.collection('users')
    .where('email', '==', email)
    .limit(1)
    .get();

  if (snap.empty) return { found: false };

  const studentDoc = snap.docs[0];
  const data = studentDoc.data();
  return {
    found: true,
    studentId: studentDoc.id,
    name: data.name || null,
    watchedVideos: data.watchedVideos || 0,
  };
});


// ---------------------------------------------------------------------------
// NOME DE USUARIO (@handle)
//
// A unicidade vem do ID do documento em `usernames/{handle}`: o Firestore nao
// deixa dois documentos com o mesmo ID, entao nao existe corrida possivel. A
// colecao guarda so o mapeamento handle -> uid.
//
// Tudo passa por aqui de proposito. O Admin SDK ignora as regras, entao a
// colecao `usernames` pode ficar fechada para o cliente (`if false`), e ninguem
// consegue reservar um handle que nao seja seu nem varrer a lista.
// ---------------------------------------------------------------------------

const USERNAME_RE = /^[a-z0-9](?:[a-z0-9_]|\.(?!\.)){1,18}[a-z0-9]$/;

const RESERVADOS = new Set([
  'admin', 'administrador', 'suporte', 'support', 'ajuda', 'help', 'contato',
  'origami', 'origamiapp', 'oficial', 'official', 'root', 'sistema', 'system',
  'null', 'undefined', 'anonimo', 'eu', 'me',
]);

function normalizar(valor) {
  const handle = (valor || '').trim().toLowerCase();

  if (handle.length < 3 || handle.length > 20) {
    throw new HttpsError('invalid-argument', 'O nome de usuário precisa ter de 3 a 20 caracteres.');
  }
  if (!USERNAME_RE.test(handle)) {
    throw new HttpsError(
      'invalid-argument',
      'Use apenas letras minúsculas, números, ponto e underline. Não pode começar nem terminar com ponto, nem ter dois pontos seguidos.'
    );
  }
  if (RESERVADOS.has(handle)) {
    throw new HttpsError('invalid-argument', 'Esse nome de usuário é reservado.');
  }
  return handle;
}

// Consulta de disponibilidade, para a tela dar retorno enquanto a pessoa digita.
// Nao reserva nada: entre o "disponivel" e o "salvar", outro pode ter levado.
// Quem decide de verdade e a transacao do setUsername.
export const checkUsername = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.');

  let handle;
  try {
    handle = normalizar(request.data?.username);
  } catch (e) {
    return { available: false, reason: e.message };
  }

  const snap = await getFirestore().collection('usernames').doc(handle).get();
  if (snap.exists && snap.data().uid !== request.auth.uid) {
    return { available: false, reason: 'Esse nome de usuário já está em uso.' };
  }
  return { available: true, username: handle };
});

// Reserva o handle e libera o anterior, numa transacao so.
export const setUsername = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.');

  const uid = request.auth.uid;
  const handle = normalizar(request.data?.username);
  const db = getFirestore();
  const handleRef = db.collection('usernames').doc(handle);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (tx) => {
    // Todas as leituras antes de qualquer escrita: exigencia do Firestore.
    const handleSnap = await tx.get(handleRef);
    const userSnap = await tx.get(userRef);

    if (handleSnap.exists) {
      if (handleSnap.data().uid === uid) return; // ja e dele, nada a fazer
      throw new HttpsError('already-exists', 'Esse nome de usuário já está em uso.');
    }

    const anterior = userSnap.exists ? userSnap.data().username : null;
    if (anterior && anterior !== handle) {
      tx.delete(db.collection('usernames').doc(anterior));
    }

    tx.set(handleRef, { uid, createdAt: FieldValue.serverTimestamp() });
    tx.set(userRef, { username: handle }, { merge: true });
  });

  return { username: handle };
});

// Professor vincula aprendiz pelo nome de usuario (substitui a busca por e-mail)
export const findStudentByUsername = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Faça login primeiro.');

  const handle = normalizar(request.data?.username);
  const db = getFirestore();

  const handleSnap = await db.collection('usernames').doc(handle).get();
  if (!handleSnap.exists) return { found: false };

  const studentId = handleSnap.data().uid;
  const studentSnap = await db.collection('users').doc(studentId).get();
  if (!studentSnap.exists) return { found: false };

  const data = studentSnap.data();
  return {
    found: true,
    studentId,
    username: handle,
    name: data.name || null,
    photo: data.photo || null,
    watchedVideos: data.watchedVideos || 0,
  };
});
