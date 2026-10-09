// /kirish/ — Telegram orqali raqamni tasdiqlash, so'ng (agar profil bo'lmasa) elektrik profilini to'ldirish.
// ?next=... bilan kelgan mijoz (sharh yozish uchun) faqat telefonni tasdiqlaydi va qaytariladi.
import { auth, firestore } from '../firebase.js';
import { initPage, esc, fmtPhone, friendlyError, storedRef } from '../ui.js';
import { currentUser, getMyProfile, safeNext } from '../session.js';
import { profileFormHTML, bindProfileForm, readProfileForm, showError } from '../profile-form.js';
import { blobToDataURL } from '../media.js';

initPage();

const root = document.getElementById('auth');
const params = new URLSearchParams(location.search);
const nextRaw = params.get('next');
const isCustomer = Boolean(nextRaw); // sharh/shikoyat uchun kelgan
const next = safeNext(nextRaw);

// Telegram orqali kirish serveri (Abu-Ustoz backend ichidagi alohida /ae modul)
const AE_API = 'https://abu-ustoz-backend.onrender.com/ae';
const POLL_MS = 2000;
const TG_KEY = 'ae_tg_login';

// Yangi usta haqida adminga Telegram xabari (xato bo'lsa ro'yxatdan o'tishga ta'sir qilmaydi)
async function notifyRegistered(user) {
  try {
    const idToken = await user.getIdToken();
    const ctl = new AbortController();
    setTimeout(() => ctl.abort(), 4000);
    await fetch(AE_API + '/notify/registered', { method: 'POST', headers: { Authorization: 'Bearer ' + idToken }, signal: ctl.signal });
  } catch {}
}

// Telefon raqami: Telegram custom token'dagi 'tel' (yoki eski SMS kirishdagi phoneNumber)
export async function userPhone(user) {
  if (user.phoneNumber) return user.phoneNumber;
  try { return (await user.getIdTokenResult()).claims.tel || ''; } catch { return ''; }
}

const TG_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M21.4 4.1 18.3 19c-.2 1-.9 1.3-1.8.8l-4.7-3.5-2.3 2.2c-.3.3-.5.5-1 .5l.3-4.8 8.7-7.9c.4-.3-.1-.5-.6-.2L6.2 12.9l-4.6-1.4c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.6 1Z"/></svg>';

// ---------- 1–2. Telegram orqali raqamni tasdiqlash ----------
function telegramStep() {
  root.innerHTML = `
  <div class="auth-card">
    <h1>${isCustomer ? 'Telefon raqamni tasdiqlang' : "Elektrik sifatida ro'yxatdan o'tish"}</h1>
    <p class="muted">${isCustomer ? "Sharh va shikoyatlar faqat tasdiqlangan raqamdan qabul qilinadi. Bu spamdan himoya qiladi." : "Bepul. Raqamingiz Telegram orqali tasdiqlanadi. Avval ro'yxatdan o'tgan bo'lsangiz, shu yerdan kabinetga kirasiz."}</p>
    <ol class="tg-steps">
      <li>Pastdagi tugmani bosing — Telegram ochiladi</li>
      <li>Botda <b>START</b>, keyin <b>«📱 Raqamni yuborish»</b> ni bosing</li>
      <li>Shu sahifaga qayting — kirish o'zi davom etadi</li>
    </ol>
    <a class="btn btn-tg btn-block btn-tg-login" id="tgBtn" aria-disabled="true">${TG_ICON} Tayyorlanmoqda…</a>
    <div class="tg-wait" id="tgWait" hidden><span class="spin"></span>Telegram'dan tasdiq kutilmoqda…</div>
    <p class="form-error" role="alert" hidden></p>
    <p class="muted center small">Telegram yo'qmi? <a href="https://telegram.org/apps" target="_blank" rel="noopener">O'rnatish</a> · Yordam: <a href="https://t.me/abuelectricuz_ooo" target="_blank" rel="noopener">@abuelectricuz_ooo</a></p>
  </div>`;
  const card = root.querySelector('.auth-card');
  const btn = document.getElementById('tgBtn');
  const wait = document.getElementById('tgWait');
  let code = '', timer = null, deadline = 0, busy = false;

  const fail = (msg) => { showError(card, msg); wait.hidden = true; stop(); };
  const stop = () => { clearInterval(timer); timer = null; };
  const startPolling = () => { wait.hidden = false; if (!timer) timer = setInterval(poll, POLL_MS); poll(); };

  // Telefon Telegram'ga o'tganda sahifani qayta yuklashi mumkin — kodni eslab qolamiz, kirish o'sha joydan davom etadi
  const saved = () => { try { return JSON.parse(sessionStorage.getItem(TG_KEY) || 'null'); } catch { return null; } };
  const remember = (o) => { try { sessionStorage.setItem(TG_KEY, JSON.stringify(o)); } catch {} };

  function useCode(d) {
    code = d.code;
    deadline = d.deadline;
    btn.href = `https://t.me/${d.bot}?start=${code}`;
    btn.target = '_blank';
    btn.rel = 'noopener';
    btn.removeAttribute('aria-disabled');
    btn.innerHTML = `${TG_ICON} Telegram orqali kirish`;
    showError(card, '');
  }

  async function prepare() {
    btn.setAttribute('aria-disabled', 'true');
    btn.removeAttribute('href');
    btn.innerHTML = `${TG_ICON} Tayyorlanmoqda…`;
    try {
      const r = await fetch(AE_API + '/login/start', { method: 'POST' });
      if (r.status === 503) return fail("Telegram orqali kirish hozircha sozlanmoqda. Birozdan keyin urinib ko'ring.");
      if (r.status === 429) return fail("Juda ko'p urinish bo'ldi. 10 daqiqadan keyin qayta urinib ko'ring.");
      const d = await r.json();
      if (!d.code || !d.bot) throw new Error('bad');
      const s = { code: d.code, bot: d.bot, deadline: Date.now() + (d.expiresIn || 600) * 1000 - 15000, clicked: false };
      remember(s);
      useCode(s);
    } catch (err) {
      console.error(err);
      fail("Server bilan bog'lanib bo'lmadi. Internetni tekshirib, sahifani yangilang.");
    }
  }

  // Tasdiq kelgach: kartani "Kirilmoqda" holatiga o'tkazamiz — eski tugmalar ko'rinib qolmasin
  function showSigningIn() {
    card.innerHTML = `<div class="tg-done"><span class="spin"></span><b>Raqam tasdiqlandi ✓</b><span class="muted">Kirilmoqda…</span></div>`;
  }

  async function poll() {
    if (busy || !code) return;
    if (Date.now() > deadline) { stop(); wait.hidden = true; return prepare(); }
    busy = true;
    try {
      const d = await (await fetch(`${AE_API}/login/poll?code=${code}`, { cache: 'no-store' })).json();
      if (d.status === 'done' && d.token) {
        stop();
        try { sessionStorage.removeItem(TG_KEY); } catch {}
        showSigningIn();
        const a = await auth();
        const res = await a.signInWithCustomToken(a.auth, d.token);
        await afterLogin(res.user);
      } else if (d.status === 'expired') {
        stop(); wait.hidden = true; prepare();
      }
    } catch (err) {
      console.error(err);
    } finally { busy = false; }
  }

  btn.addEventListener('click', (e) => {
    if (btn.getAttribute('aria-disabled')) { e.preventDefault(); return; }
    const s = saved();
    if (s) remember({ ...s, clicked: true });
    startPolling();
  });
  // Telegram'dan qaytganda darhol tekshiramiz
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && timer) { wait.innerHTML = '<span class="spin"></span>Tekshirilmoqda…'; poll(); }
  });

  const s = saved();
  if (s && s.code && Date.now() < s.deadline) {
    useCode(s);
    if (s.clicked) { wait.innerHTML = '<span class="spin"></span>Tekshirilmoqda…'; startPolling(); }
  } else {
    prepare();
  }
}

// ---------- 3. Kirgandan keyin ----------
async function afterLogin(user) {
  if (isCustomer) { location.replace(next); return; }
  root.innerHTML = '<div class="auth-card"><div class="sk sk-line w60"></div><div class="sk sk-line w80"></div></div>';
  try {
    const profile = await getMyProfile(user.uid);
    if (profile) { location.replace(next); return; }
    profileStep(user);
  } catch (err) {
    root.innerHTML = `<div class="auth-card"><p class="form-error">${esc(friendlyError(err))}</p></div>`;
  }
}

async function profileStep(user) {
  const phone = await userPhone(user);
  root.innerHTML = `
  <div class="auth-card wide">
    <h1>Profilingizni to'ldiring</h1>
    <p class="muted">Raqamingiz tasdiqlandi: <b>${esc(fmtPhone(phone))}</b>. Endi mijozlar ko'radigan ma'lumotlarni yozing.</p>
    <form id="profileForm" class="pform" novalidate>
      ${profileFormHTML({}, { withConsent: true })}
      <button class="btn btn-volt btn-block" type="submit">Ro'yxatdan o'tish</button>
    </form>
  </div>`;
  const form = document.getElementById('profileForm');
  const ctl = bindProfileForm(form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error } = readProfileForm(form, { withConsent: true });
    if (error) return showError(form, error);
    showError(form, '');
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saqlanmoqda…';

    let photoURL = '';
    let photoFailed = false;
    if (ctl.getPhoto()) {
      try { photoURL = await blobToDataURL(ctl.getPhoto()); }
      catch (err) { console.error(err); photoFailed = true; }
    }

    try {
      const fs = await firestore();
      await fs.setDoc(fs.doc(fs.db, 'electricians', user.uid), {
        ...data,
        photoURL,
        works: [],
        phone,
        status: 'pending',
        availableUntil: null,
        ratingSum: 0, ratingCount: 0, ratingAvg: 0,
        ref: storedRef(),
        consent: true,
        consentAt: fs.serverTimestamp(),
        createdAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp(),
      });
      await notifyRegistered(user);
      location.replace('/kabinet/?yangi=1' + (photoFailed ? '&rasm=0' : ''));
    } catch (err) {
      console.error(err);
      showError(form, friendlyError(err));
      btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish";
    }
  });
}

// Avval kirgan bo'lsa — to'g'ridan-to'g'ri davom etamiz
root.innerHTML = '<div class="auth-card"><div class="sk sk-line w60"></div><div class="sk sk-line w80"></div><div class="sk sk-btn"></div></div>';
currentUser().then((u) => (u ? afterLogin(u) : telegramStep())).catch(() => telegramStep());
