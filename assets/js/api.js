// Ma'lumot qatlami: qidiruv, top ustalar, bitta profil.
// Firebase sozlanmagan bo'lsa, namunaviy (demo) ma'lumot qaytaradi — dizaynni sinash uchun.
import { firestore, isConfigured } from './firebase.js';

export const DEMO = !isConfigured;

const DAY = 864e5;
const toMs = (v) => (v == null ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : new Date(v).getTime());

// Kartochka uchun hisoblangan holatlar
export function decorate(e, now = Date.now()) {
  const count = e.ratingCount || 0;
  return {
    ...e,
    verified: e.status === 'verified',
    availableNow: toMs(e.availableUntil) > now,
    rating: count ? (e.ratingSum || 0) / count : 0,
    ratingCount: count,
  };
}

// Tartib: tasdiqlanganlar → hozir bo'shlar → mahalliylar (vaqtincha kelganlardan oldin) → baho
function rank(e) {
  return (e.verified ? 1000 : 0) + (e.availableNow ? 100 : 0) + (e.trip ? 0 : 10) + e.rating * 2 + Math.min(e.ratingCount, 50) / 50;
}

export async function searchElectricians({ viloyat = '', tuman = '', service = '', onlyAvailable = false } = {}) {
  const now = Date.now();
  let list = [];

  if (DEMO) {
    await new Promise((r) => setTimeout(r, 450)); // skeletonni ko'rish uchun
    const local = demoData.filter((e) => !viloyat || e.viloyat === viloyat);
    const visiting = viloyat
      ? demoData.filter((e) => e.trips?.some((t) => t.viloyat === viloyat && toMs(t.to) >= now) && e.viloyat !== viloyat)
          .map((e) => ({ ...e, trip: e.trips.find((t) => t.viloyat === viloyat) }))
      : [];
    list = [...local, ...visiting];
  } else {
    const fs = await firestore();
    const { db, collection, query, where, getDocs, limit, documentId } = fs;
    const base = [where('status', 'in', ['verified', 'pending'])];
    if (viloyat) base.push(where('viloyat', '==', viloyat));
    const snap = await getDocs(query(collection(db, 'electricians'), ...base, limit(300)));
    list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (viloyat) {
      const tripSnap = await getDocs(query(collection(db, 'trips'), where('viloyat', '==', viloyat), where('to', '>=', new Date(now - DAY / 2)), limit(100)));
      const trips = tripSnap.docs.map((d) => d.data()).filter((t) => !list.some((e) => e.id === t.uid));
      const ids = [...new Set(trips.map((t) => t.uid))];
      for (let i = 0; i < ids.length; i += 30) {
        const s = await getDocs(query(collection(db, 'electricians'), where(documentId(), 'in', ids.slice(i, i + 30))));
        s.docs.forEach((d) => {
          const e = { id: d.id, ...d.data() };
          if (e.status === 'blocked') return;
          list.push({ ...e, trip: trips.find((t) => t.uid === d.id) });
        });
      }
    }
  }

  return list
    .map((e) => decorate(e, now))
    .filter((e) => {
      if (!tuman) return true;
      // Vaqtincha kelayotgan usta tuman ko'rsatmagan bo'lsa — butun viloyat bo'ylab ishlaydi
      if (e.trip) return !e.trip.tuman || e.trip.tuman === tuman;
      return e.tuman === tuman;
    })
    .filter((e) => !service || (e.services || []).includes(service))
    .filter((e) => !onlyAvailable || e.availableNow)
    .sort((a, b) => rank(b) - rank(a));
}

export async function topRated(n = 6) {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 350));
    return demoData.map((e) => decorate(e)).filter((e) => e.verified).sort((a, b) => b.rating - a.rating).slice(0, n);
  }
  const { db, collection, query, where, orderBy, limit, getDocs } = await firestore();
  const snap = await getDocs(query(collection(db, 'electricians'), where('status', '==', 'verified'), orderBy('ratingAvg', 'desc'), limit(n)));
  return snap.docs.map((d) => decorate({ id: d.id, ...d.data() }));
}

export async function getElectrician(id) {
  if (DEMO) return demoData.find((e) => e.id === id) ? decorate(demoData.find((e) => e.id === id)) : null;
  const { db, doc, getDoc } = await firestore();
  const s = await getDoc(doc(db, 'electricians', id));
  if (!s.exists() || s.data().status === 'blocked') return null;
  return decorate({ id: s.id, ...s.data() });
}

// ---------- Namunaviy ma'lumot (faqat Firebase ulanmaganda) ----------
const soon = (days) => Date.now() + days * DAY;
const demoData = [
  { id: 'demo1', name: 'Bahodir Karimov', viloyat: 'toshkent-shahri', tuman: 'Chilonzor tumani', phone: '+998900000001', telegram: 'abuelectricuz_ooo', services: ['rozetka', 'avtomat', 'sim', 'avariya'], experience: 12, price: 'Chaqiruv 50 000 so\'mdan', status: 'verified', availableUntil: soon(0.5), ratingSum: 96, ratingCount: 20 },
  { id: 'demo2', name: 'Sardor Rahimov', viloyat: 'toshkent-shahri', tuman: 'Yunusobod tumani', phone: '+998900000002', telegram: '', services: ['yoritish', 'rozetka', 'kamera'], experience: 6, status: 'verified', availableUntil: null, ratingSum: 44, ratingCount: 10 },
  { id: 'demo3', name: 'Jasur Tursunov', viloyat: 'toshkent-shahri', tuman: 'Sergeli tumani', phone: '+998900000003', telegram: '', services: ['texnika', 'rozetka'], experience: 3, status: 'pending', availableUntil: soon(0.2), ratingSum: 0, ratingCount: 0 },
  { id: 'demo4', name: 'Ulug\'bek Saidov', viloyat: 'qoraqalpogiston', tuman: 'Amudaryo tumani', phone: '+998900000004', telegram: 'abuelectricuz_ooo', services: ['sim', 'avtomat', 'yoritish', 'avariya'], experience: 9, price: 'Kelishilgan holda', status: 'verified', availableUntil: null, ratingSum: 47, ratingCount: 10,
    trips: [{ viloyat: 'toshkent-shahri', tuman: '', from: soon(-1), to: soon(9) }] },
  { id: 'demo5', name: 'Akmal Yusupov', viloyat: 'samarqand', tuman: 'Samarqand shahri', phone: '+998900000005', telegram: '', services: ['kamera', 'boshqa'], experience: 5, status: 'verified', availableUntil: soon(0.8), ratingSum: 23, ratingCount: 5 },
  { id: 'demo6', name: 'Rustam Aliyev', viloyat: 'fargona', tuman: "Qo'qon shahri", phone: '+998900000006', telegram: '', services: ['avtomat', 'sim'], experience: 15, status: 'verified', availableUntil: null, ratingSum: 58, ratingCount: 12 },
  { id: 'demo7', name: 'Doston Ergashev', viloyat: 'andijon', tuman: 'Asaka tumani', phone: '+998900000007', telegram: '', services: ['rozetka', 'yoritish'], experience: 2, status: 'pending', availableUntil: null, ratingSum: 0, ratingCount: 0 },
  { id: 'demo8', name: 'Shoxrux Nazarov', viloyat: 'buxoro', tuman: 'Buxoro shahri', phone: '+998900000008', telegram: '', services: ['avariya', 'avtomat', 'texnika'], experience: 8, status: 'verified', availableUntil: soon(0.3), ratingSum: 39, ratingCount: 8 },
];
