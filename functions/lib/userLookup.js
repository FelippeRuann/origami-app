import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

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
