// /kirish/ — telefon raqam + SMS kod, so'ng (agar profil bo'lmasa) elektrik profilini to'ldirish.
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

const MOBILE = /^(20|33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/;
const SMS_KEY = 'ae_sms_log';

// Spamga qarshi: 15 daqiqada 3 tadan ko'p SMS yubormaymiz (Firebase'ning o'z cheklovlari ham bor)
function smsAllowed() {
  try {
    const log = JSON.parse(localStorage.getItem(SMS_KEY) || '[]').filter((t) => Date.now() - t < 15 * 60e3);
    return log.length < 3 ? { ok: true, log } : { ok: false, wait: Math.ceil((15 * 60e3 - (Date.now() - log[0])) / 60e3) };
  } catch { return { ok: true, log: [] }; }
}
function logSms(log) { try { localStorage.setItem(SMS_KEY, JSON.stringify([...log, Date.now()])); } catch {} }

function authError(err) {
  const c = err?.code || '';
  const map = {
    'auth/invalid-phone-number': "Telefon raqam noto'g'ri. Masalan: 90 123 45 67",
    'auth/too-many-requests': "Juda ko'p urinish bo'ldi. 15–30 daqiqadan keyin qayta urinib ko'ring.",
    'auth/quota-exceeded': "Bugun SMS yuborish chegarasi tugadi. Ertaga urinib ko'ring.",
    'auth/invalid-verification-code': "Kod noto'g'ri. SMS'dagi 6 xonali kodni tekshiring.",
    'auth/code-expired': "Kodning muddati o'tdi. Yangi kod so'rang.",
    'auth/operation-not-allowed': "SMS orqali kirish hali yoqilmagan. Birozdan keyin urinib ko'ring.",
    'auth/billing-not-enabled': "SMS xizmati vaqtincha ishlamayapti. Birozdan keyin urinib ko'ring.",
    'auth/captcha-check-failed': "Xavfsizlik tekshiruvi o'tmadi. Sahifani yangilab, qayta urinib ko'ring.",
    'auth/network-request-failed': "Internet aloqasi yo'q. Ulanishni tekshiring.",
  };
  return map[c] || friendlyError(err);
}

// ---------- 1. Telefon raqam ----------
function phoneStep() {
  root.innerHTML = `
  <div class="auth-card">
    <h1>${isCustomer ? 'Telefon raqamni tasdiqlang' : "Elektrik sifatida ro'yxatdan o'tish"}</h1>
    <p class="muted">${isCustomer ? "Sharh va shikoyatlar faqat tasdiqlangan raqamdan qabul qilinadi. Bu spamdan himoya qiladi." : "Bepul. Telefon raqamingizga SMS kod keladi. Avval ro'yxatdan o'tgan bo'lsangiz, shu yerdan kabinetga kirasiz."}</p>
    <form id="phoneForm" novalidate>
      <div class="field"><label for="phone">Telefon raqam</label>
        <div class="phone-input"><span>+998</span><input id="phone" inputmode="numeric" autocomplete="tel-national" placeholder="90 123 45 67" maxlength="12"></div>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-volt btn-block" type="submit">SMS kod olish</button>
    </form>
    <div id="recaptcha"></div>
  </div>`;
  const form = document.getElementById('phoneForm');
  const input = document.getElementById('phone');
  input.addEventListener('input', () => {
    const d = input.value.replace(/\D/g, '').slice(0, 9);
    input.value = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
  });
  input.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const digits = input.value.replace(/\D/g, '');
    if (!MOBILE.test(digits)) return showError(form, "Mobil raqamni to'liq yozing. Masalan: 90 123 45 67");
    const lim = smsAllowed();
    if (!lim.ok) return showError(form, `SMS ko'p so'raldi. ${lim.wait} daqiqadan keyin qayta urinib ko'ring.`);
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
    showError(form, '');
    try {
      const a = await auth();
      if (!window.__recaptcha) window.__recaptcha = new a.RecaptchaVerifier(a.auth, 'recaptcha', { size: 'invisible' });
      const confirmation = await a.signInWithPhoneNumber(a.auth, '+998' + digits, window.__recaptcha);
      logSms(lim.log);
      codeStep('+998' + digits, confirmation);
    } catch (err) {
      console.error(err);
      showError(form, authError(err));
      btn.disabled = false; btn.textContent = 'SMS kod olish';
      try { window.__recaptcha?.clear(); } catch {}
      window.__recaptcha = null;
      document.getElementById('recaptcha').innerHTML = '';
    }
  });
}

// ---------- 2. SMS kod ----------
function codeStep(phone, confirmation) {
  root.innerHTML = `
  <div class="auth-card">
    <h1>SMS kodni kiriting</h1>
    <p class="muted"><b>${esc(fmtPhone(phone))}</b> raqamiga 6 xonali kod yuborildi.</p>
    <form id="codeForm" novalidate>
      <div class="field"><label for="code">Kod</label>
        <input id="code" class="code-input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="• • • • • •"></div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-volt btn-block" type="submit">Tasdiqlash</button>
    </form>
    <p class="muted center"><button class="linkbtn" id="resend" disabled>Qayta yuborish (60)</button> · <button class="linkbtn" id="change">Raqamni o'zgartirish</button></p>
  </div>`;
  const form = document.getElementById('codeForm');
  const code = document.getElementById('code');
  code.focus();
  code.addEventListener('input', () => {
    code.value = code.value.replace(/\D/g, '').slice(0, 6);
    if (code.value.length === 6) form.requestSubmit();
  });

  let left = 60;
  const resend = document.getElementById('resend');
  const timer = setInterval(() => {
    left -= 1;
    resend.textContent = left > 0 ? `Qayta yuborish (${left})` : 'Qayta yuborish';
    if (left <= 0) { resend.disabled = false; clearInterval(timer); }
  }, 1000);
  resend.addEventListener('click', () => { clearInterval(timer); phoneStep(); document.getElementById('phone').value = phone.slice(4).replace(/(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4'); });
  document.getElementById('change').addEventListener('click', () => { clearInterval(timer); phoneStep(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.value)) return showError(form, '6 xonali kodni kiriting.');
    const btn = form.querySelector('button');
    btn.disabled = true; btn.textContent = 'Tekshirilmoqda…';
    try {
      const res = await confirmation.confirm(code.value);
      clearInterval(timer);
      await afterLogin(res.user);
    } catch (err) {
      console.error(err);
      showError(form, authError(err));
      btn.disabled = false; btn.textContent = 'Tasdiqlash';
    }
  });
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

function profileStep(user) {
  root.innerHTML = `
  <div class="auth-card wide">
    <h1>Profilingizni to'ldiring</h1>
    <p class="muted">Raqamingiz tasdiqlandi: <b>${esc(fmtPhone(user.phoneNumber))}</b>. Endi mijozlar ko'radigan ma'lumotlarni yozing.</p>
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
        phone: user.phoneNumber,
        status: 'pending',
        availableUntil: null,
        ratingSum: 0, ratingCount: 0, ratingAvg: 0,
        ref: storedRef(),
        consent: true,
        consentAt: fs.serverTimestamp(),
        createdAt: fs.serverTimestamp(),
        updatedAt: fs.serverTimestamp(),
      });
      location.replace('/kabinet/?yangi=1' + (photoFailed ? '&rasm=0' : ''));
    } catch (err) {
      console.error(err);
      showError(form, friendlyError(err));
      btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish";
    }
  });
}

// Avval kirgan bo'lsa — to'g'ridan-to'g'ri davom etamiz
currentUser().then((u) => (u ? afterLogin(u) : phoneStep())).catch(() => phoneStep());
