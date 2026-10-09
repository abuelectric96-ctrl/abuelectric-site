// Kirish holati va foydalanuvchining o'z profili.
import { auth, firestore } from './firebase.js';

let userPromise = null;

// Joriy foydalanuvchi (kirmagan bo'lsa null). Firebase holatni tiklaguncha kutadi.
export function currentUser() {
  if (!userPromise) {
    userPromise = auth().then((a) => {
      if (!a) return null;
      return new Promise((resolve) => {
        const off = a.onAuthStateChanged(a.auth, (u) => { off(); resolve(u); });
      });
    });
  }
  return userPromise;
}

export async function signOut() {
  const a = await auth();
  if (a) await a.signOut(a.auth);
  userPromise = null;
}

export async function getMyProfile(uid) {
  const fs = await firestore();
  const s = await fs.getDoc(fs.doc(fs.db, 'electricians', uid));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function isAdmin(uid) {
  const fs = await firestore();
  try {
    const s = await fs.getDoc(fs.doc(fs.db, 'admins', uid));
    return s.exists();
  } catch { return false; }
}

// Faqat o'z saytimiz ichidagi manzillarga qaytaramiz (ochiq redirect'dan himoya)
export function safeNext(raw, fallback = '/kabinet/') {
  return raw && /^\/(?!\/)[^\s]*$/.test(raw) ? raw : fallback;
}

export function loginUrl(next) {
  return '/kirish/?next=' + encodeURIComponent(next || location.pathname + location.search + location.hash);
}
