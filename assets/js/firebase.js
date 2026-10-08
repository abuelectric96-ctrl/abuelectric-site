// Firebase ulanishi. Konsoldagi "Project settings → Your apps → Web app" dan olingan qiymatlarni shu yerga qo'ying.
// Bu kalitlar maxfiy emas: himoya Firestore qoidalari (firestore.rules) orqali bo'ladi.
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
let appPromise = null;

// SDK faqat kerak bo'lganda yuklanadi — bosh sahifa tezroq ochilishi uchun.
export function getApp() {
  if (!isConfigured) return Promise.resolve(null);
  if (!appPromise) {
    appPromise = import(SDK + 'firebase-app.js').then(({ initializeApp }) => initializeApp(firebaseConfig));
  }
  return appPromise;
}

export async function firestore() {
  const app = await getApp();
  if (!app) return null;
  const mod = await import(SDK + 'firebase-firestore.js');
  return { db: mod.getFirestore(app), ...mod };
}

export async function auth() {
  const app = await getApp();
  if (!app) return null;
  const mod = await import(SDK + 'firebase-auth.js');
  const a = mod.getAuth(app);
  a.languageCode = 'uz';
  return { auth: a, ...mod };
}

export async function storage() {
  const app = await getApp();
  if (!app) return null;
  const mod = await import(SDK + 'firebase-storage.js');
  return { storage: mod.getStorage(app), ...mod };
}
