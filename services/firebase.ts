import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const cfg = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

/** True quando o .env.local tem uma config Firebase válida. */
export const firebaseEnabled =
  !!cfg.apiKey && cfg.apiKey !== 'COLE_AQUI' && !!cfg.databaseURL;

const app = firebaseEnabled ? initializeApp(cfg) : null;
export const db = app ? getDatabase(app) : null;
const auth = app ? getAuth(app) : null;

/**
 * Login ANÔNIMO: cada aparelho recebe um uid estável do Firebase (persistido pelo
 * SDK). Esse uid vira a identidade do jogador no online — as regras do RTDB exigem
 * `auth != null` e restringem escrita aos membros da sala. Resolve com o uid (ou
 * null se o Firebase estiver desligado / falhar o login).
 */
export const authReady: Promise<string | null> = new Promise((resolve) => {
  if (!auth) return resolve(null);
  let done = false;
  const finish = (uid: string | null) => { if (!done) { done = true; resolve(uid); } };
  onAuthStateChanged(auth, (user) => { if (user) finish(user.uid); });
  signInAnonymously(auth).catch((e) => {
    console.error('[firebase] login anônimo falhou:', e);
    finish(null);
  });
  // rede de segurança: não trava a UI pra sempre se algo der errado
  setTimeout(() => finish(auth.currentUser?.uid ?? null), 6000);
});
