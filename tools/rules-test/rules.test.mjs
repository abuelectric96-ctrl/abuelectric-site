// Firestore xavfsizlik qoidalari testlari (emulyatorda, haqiqiy bazaga tegmaydi).
// Ishga tushirish: cd tools/rules-test && npm test
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import {
  doc, setDoc, updateDoc, getDoc, getDocs, addDoc, deleteDoc, collection, query, where,
  serverTimestamp, runTransaction, writeBatch, Timestamp,
} from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-abuelectric',
  firestore: { rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8'), host: '127.0.0.1', port: 8080 },
});

const usta = env.authenticatedContext('usta1', { phone_number: '+998900000001' }).firestore();
const mijoz = env.authenticatedContext('mijoz1', { phone_number: '+998900000002' }).firestore();
const begona = env.authenticatedContext('begona', { phone_number: '+998900000003' }).firestore();
const admin = env.authenticatedContext('admin1', { phone_number: '+998900000009' }).firestore();
const mehmon = env.unauthenticatedContext().firestore();

await env.withSecurityRulesDisabled(async (c) => { await setDoc(doc(c.firestore(), 'admins', 'admin1'), {}); });

const img = (n) => 'data:image/webp;base64,' + 'A'.repeat(n);
const profile = (extra = {}) => ({
  name: 'Baxram Ashirov', viloyat: 'qoraqalpogiston', tuman: 'Amudaryo tumani', services: ['rozetka', 'sim'],
  experience: 6, telegram: 'abuelectricuz', price: '80000', about: "Hamma ishni qilamiz", photoURL: img(7000), works: [],
  phone: '+998900000001', status: 'pending', availableUntil: null, ratingSum: 0, ratingCount: 0, ratingAvg: 0, ref: 'tg_guruh',
  consent: true, consentAt: serverTimestamp(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
});

let pass = 0, fail = 0;
async function t(name, fn) {
  try { await fn(); pass++; console.log('  ✓', name); }
  catch (e) { fail++; console.log('  ✗', name, '\n     ', e.message?.split('\n')[0]); }
}

console.log('\nProfil');
await t("rozilik bo'lmasa — rad", () => assertFails(setDoc(doc(usta, 'electricians', 'usta1'), profile({ consent: false }))));
await t("o'zini tasdiqlangan qilib yaratish — rad", () => assertFails(setDoc(doc(usta, 'electricians', 'usta1'), profile({ status: 'verified' }))));
await t("boshqa telefon raqam bilan — rad", () => assertFails(setDoc(doc(usta, 'electricians', 'usta1'), profile({ phone: '+998901111111' }))));
await t("boshqa birovning ID'si bilan — rad", () => assertFails(setDoc(doc(begona, 'electricians', 'usta1'), profile({ phone: '+998900000003' }))));
await t("kirmasdan — rad", () => assertFails(setDoc(doc(mehmon, 'electricians', 'x'), profile())));
await t("juda katta profil rasmi — rad", () => assertFails(setDoc(doc(usta, 'electricians', 'usta1'), profile({ photoURL: img(30000) }))));
await t("noto'g'ri formatdagi rasm — rad", () => assertFails(setDoc(doc(usta, 'electricians', 'usta1'), profile({ photoURL: 'data:text/html;base64,AAAA' }))));
await t("to'g'ri profil (rasm bilan) — ruxsat", () => assertSucceeds(setDoc(doc(usta, 'electricians', 'usta1'), profile())));
await t("profilni tahrirlash — ruxsat", () => assertSucceeds(updateDoc(doc(usta, 'electricians', 'usta1'), { about: 'Yangi matn', updatedAt: serverTimestamp() })));
await t("Hozir bo'shman (24 soat) — ruxsat", () => assertSucceeds(updateDoc(doc(usta, 'electricians', 'usta1'), { availableUntil: Timestamp.fromMillis(Date.now() + 864e5), updatedAt: serverTimestamp() })));
await t("Hozir bo'shman 3 kunga — rad", () => assertFails(updateDoc(doc(usta, 'electricians', 'usta1'), { availableUntil: Timestamp.fromMillis(Date.now() + 3 * 864e5), updatedAt: serverTimestamp() })));
await t("o'zini tasdiqlash — rad", () => assertFails(updateDoc(doc(usta, 'electricians', 'usta1'), { status: 'verified', updatedAt: serverTimestamp() })));
await t("o'z bahosini oshirish — rad", () => assertFails(updateDoc(doc(usta, 'electricians', 'usta1'), { ratingSum: 50, ratingCount: 10, updatedAt: serverTimestamp() })));
await t("begona profilni tahrirlash — rad", () => assertFails(updateDoc(doc(begona, 'electricians', 'usta1'), { about: 'buzdim', updatedAt: serverTimestamp() })));
await t("hamma profilni o'qiy oladi", () => assertSucceeds(getDoc(doc(mehmon, 'electricians', 'usta1'))));
await t("qidiruv (status bilan) — ruxsat", () => assertSucceeds(getDocs(query(collection(mehmon, 'electricians'), where('status', 'in', ['verified', 'pending']), where('viloyat', '==', 'qoraqalpogiston')))));

console.log('\nIsh rasmlari va hujjat');
await t("ish rasmi 110 KB — ruxsat", () => assertSucceeds(addDoc(collection(usta, 'photos'), { uid: 'usta1', data: img(110000), createdAt: serverTimestamp() })));
await t("ish rasmi 390 KB — ruxsat", () => assertSucceeds(addDoc(collection(usta, 'photos'), { uid: 'usta1', data: img(390000), createdAt: serverTimestamp() })));
await t("ish rasmi 450 KB — rad", () => assertFails(addDoc(collection(usta, 'photos'), { uid: 'usta1', data: img(450000), createdAt: serverTimestamp() })));
await t("birovning nomidan rasm — rad", () => assertFails(addDoc(collection(begona, 'photos'), { uid: 'usta1', data: img(1000), createdAt: serverTimestamp() })));
await t("profili yo'q odam rasm qo'shishi — rad", () => assertFails(addDoc(collection(mijoz, 'photos'), { uid: 'mijoz1', data: img(1000), createdAt: serverTimestamp() })));
await t("tasdiqlash hujjati — ruxsat", () => assertSucceeds(setDoc(doc(usta, 'verifications', 'usta1'), { data: img(300000), createdAt: serverTimestamp() })));
await t("hujjatni begona o'qishi — rad", () => assertFails(getDoc(doc(begona, 'verifications', 'usta1'))));
await t("hujjatni admin o'qishi — ruxsat", () => assertSucceeds(getDoc(doc(admin, 'verifications', 'usta1'))));
await t("verifyDocPath yozish — ruxsat", () => assertSucceeds(updateDoc(doc(usta, 'electricians', 'usta1'), { verifyDocPath: 'verifications/usta1', updatedAt: serverTimestamp() })));

console.log('\nVaqtincha boraman');
const now = Date.now();
await t("safar 10 kunga — ruxsat", () => assertSucceeds(addDoc(collection(usta, 'trips'), { uid: 'usta1', viloyat: 'toshkent-shahri', tuman: '', from: Timestamp.fromMillis(now), to: Timestamp.fromMillis(now + 10 * 864e5), createdAt: serverTimestamp() })));
await t("safar 3 oyga — rad", () => assertFails(addDoc(collection(usta, 'trips'), { uid: 'usta1', viloyat: 'toshkent-shahri', tuman: '', from: Timestamp.fromMillis(now), to: Timestamp.fromMillis(now + 90 * 864e5), createdAt: serverTimestamp() })));
await t("o'tib ketgan safar — rad", () => assertFails(addDoc(collection(usta, 'trips'), { uid: 'usta1', viloyat: 'toshkent-shahri', tuman: '', from: Timestamp.fromMillis(now - 20 * 864e5), to: Timestamp.fromMillis(now - 10 * 864e5), createdAt: serverTimestamp() })));
await t("safar qidiruvi — ruxsat", () => assertSucceeds(getDocs(query(collection(mehmon, 'trips'), where('viloyat', '==', 'toshkent-shahri'), where('to', '>=', new Date())))));

async function review(db, uid, rating, eid = 'usta1') {
  await runTransaction(db, async (tx) => {
    const eref = doc(db, 'electricians', eid);
    const es = await tx.get(eref);
    const d = es.data();
    const count = d.ratingCount + 1, sum = d.ratingSum + rating;
    tx.update(eref, { ratingSum: sum, ratingCount: count, ratingAvg: Math.round((sum / count) * 100) / 100 });
    tx.set(doc(db, 'reviews', `${eid}_${uid}`), { electricianId: eid, uid, name: 'Dilshod', rating, text: 'Zo\'r', createdAt: serverTimestamp() });
    tx.set(doc(db, 'meta', uid), { lastReviewAt: serverTimestamp() }, { merge: true });
  });
}

console.log('\nSharhlar');
await t("mijoz sharhi (baho bilan birga) — ruxsat", () => assertSucceeds(review(mijoz, 'mijoz1', 5)));
await t("ikkinchi marta sharh — rad", () => assertFails(review(mijoz, 'mijoz1', 1)));
await t("usta o'ziga sharh — rad", () => assertFails(review(usta, 'usta1', 5)));
await t("bahoni sharhsiz o'zgartirish — rad", () => assertFails(updateDoc(doc(begona, 'electricians', 'usta1'), { ratingSum: 99, ratingCount: 2, ratingAvg: 4.9 })));
let bahoOk;
await env.withSecurityRulesDisabled(async (c) => { bahoOk = (await getDoc(doc(c.firestore(), 'electricians', 'usta1'))).data(); });
await t("baho to'g'ri hisoblandi (5.0, 1 ta)", async () => { if (bahoOk.ratingCount !== 1 || bahoOk.ratingSum !== 5) throw new Error(JSON.stringify(bahoOk)); });

console.log('\nShikoyat va admin');
const report = (db, uid) => { const b = writeBatch(db); b.set(doc(collection(db, 'reports')), { type: 'profile', targetId: 'usta1', reason: 'Raqam ishlamaydi', uid, status: 'open', createdAt: serverTimestamp() }); b.set(doc(db, 'meta', uid), { lastReportAt: serverTimestamp() }, { merge: true }); return b.commit(); };
await t("shikoyat — ruxsat", () => assertSucceeds(report(begona, 'begona')));
await t("darhol ikkinchi shikoyat (spam) — rad", () => assertFails(report(begona, 'begona')));
await t("shikoyatlarni oddiy odam o'qishi — rad", () => assertFails(getDocs(collection(begona, 'reports'))));
await t("admin shikoyatlarni o'qiydi — ruxsat", () => assertSucceeds(getDocs(query(collection(admin, 'reports'), where('status', '==', 'open')))));
await t("admin tasdiqlaydi — ruxsat", () => assertSucceeds(updateDoc(doc(admin, 'electricians', 'usta1'), { status: 'verified', verifiedAt: serverTimestamp() })));
await t("admin bloklaydi — ruxsat", () => assertSucceeds(updateDoc(doc(admin, 'electricians', 'usta1'), { status: 'blocked', availableUntil: null })));
await t("bloklangan usta tahrirlay olmaydi — rad", () => assertFails(updateDoc(doc(usta, 'electricians', 'usta1'), { about: 'qaytdim', updatedAt: serverTimestamp() })));
await t("bloklangan qidiruvda ko'rinmaydi (bloklanganni so'rash rad)", () => assertFails(getDocs(query(collection(mehmon, 'electricians'), where('status', '==', 'blocked')))));
await t("o'zini admin qilish — rad", () => assertFails(setDoc(doc(begona, 'admins', 'begona'), {})));
await t("oddiy odam profilni o'chirishi — rad", () => assertFails(deleteDoc(doc(begona, 'electricians', 'usta1'))));
await t("admin profilni o'chiradi — ruxsat", () => assertSucceeds(deleteDoc(doc(admin, 'electricians', 'usta1'))));

console.log(`\n${pass} ta o'tdi, ${fail} ta xato\n`);
await env.cleanup();
process.exit(fail ? 1 : 0);
