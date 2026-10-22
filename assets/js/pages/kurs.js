// /kurs/ — kursga ro'yxatdan o'tish formasi. Arizalar Firestore'ga (course_apps) yoziladi, admin panelda ko'rinadi.
// Hujjat ID = telefon raqami (998901234567) → bitta raqamdan bitta ariza.
import { firestore } from '../firebase.js';

const form = document.getElementById('applyForm');
const errEl = form.querySelector('.af-error');
const phoneEl = form.elements.phone;
const MOBILE = /^(20|33|50|55|77|88|90|91|93|94|95|97|98|99)\d{7}$/;
const PLANS = { kurs_2h: "2 haftalik kurs (1 800 000 so'm)", kurs_1m: "1 oylik kurs (2 100 000 so'm)" };

const showError = (m) => { errEl.textContent = m; errEl.hidden = !m; if (m) errEl.scrollIntoView({ block: 'center', behavior: 'smooth' }); };

// Tarif kartasidagi tugma → formada shu tarif tanlansin
document.querySelectorAll('[data-plan]').forEach((a) => a.addEventListener('click', () => {
  const r = form.querySelector(`input[name=plan][value="${a.dataset.plan}"]`);
  if (r) r.checked = true;
  setTimeout(() => form.elements.name.focus({ preventScroll: true }), 400);
}));
const fromUrl = new URLSearchParams(location.search).get('tarif');
if (PLANS[fromUrl]) form.querySelector(`input[name=plan][value="${fromUrl}"]`).checked = true;

phoneEl.addEventListener('input', () => {
  const d = phoneEl.value.replace(/\D/g, '').slice(0, 9);
  phoneEl.value = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
});

function done(name, phone, plan, already) {
  form.innerHTML = `<div class="af-done">
    <div class="af-done-ico">✅</div>
    <h3>${already ? 'Siz allaqachon yozilgansiz' : 'Arizangiz qabul qilindi!'}</h3>
    <p>${already ? 'Bu raqamdan ariza oldin yuborilgan. Administrator siz bilan bog\'lanadi.' : `Rahmat, ${escapeHtml(name.split(' ')[0])}! Administrator tez orada <b>+998 ${escapeHtml(phone)}</b> raqamiga qo'ng'iroq qiladi.`}</p>
    ${plan ? `<p class="muted">Tanlangan kurs: <b>${escapeHtml(PLANS[plan])}</b></p>` : ''}
    <a class="btn btn-line" href="https://t.me/abuelectricuz_ooo" target="_blank" rel="noopener">Savol bo'lsa — Telegram</a>
  </div>`;
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = form.elements;
  if (f.website.value) return; // bot
  const name = f.name.value.trim().replace(/\s+/g, ' ');
  const digits = f.phone.value.replace(/\D/g, '');
  const viloyat = f.viloyat.value;
  const address = f.address.value.trim().replace(/\s+/g, ' ');
  const plan = (form.querySelector('input[name=plan]:checked') || {}).value;

  if (name.length < 3 || !/^[\p{L}\s'ʻʼ‘’.-]+$/u.test(name)) return showError('Ism va familiyangizni harflar bilan yozing.');
  if (!MOBILE.test(digits)) return showError("Telefon raqamni to'liq yozing. Masalan: 90 123 45 67");
  if (!viloyat) return showError('Viloyatni tanlang.');
  if (address.length < 3) return showError('Yashash manzilingizni yozing (tuman, mahalla).');
  if (!PLANS[plan]) return showError('Qaysi kursga yozilishingizni tanlang.');
  showError('');

  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
  try {
    const fs = await firestore();
    await fs.setDoc(fs.doc(fs.db, 'course_apps', '998' + digits), {
      name, phone: '+998' + digits, viloyat, address, plan,
      status: 'new', source: new URLSearchParams(location.search).get('ref') || '', createdAt: fs.serverTimestamp(),
    });
    done(name, f.phone.value, plan, false);
  } catch (err) {
    console.error(err);
    // Ruxsat yo'q = shu raqamdan ariza allaqachon bor (qayta yozib bo'lmaydi)
    if (err?.code === 'permission-denied') { done(name, f.phone.value, plan, true); return; }
    showError(!navigator.onLine ? "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring." : "Yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring yoki Telegram orqali yozing.");
    btn.disabled = false; btn.textContent = "Ro'yxatdan o'tish";
  }
});
