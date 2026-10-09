// Profil formasi: ro'yxatdan o'tish va kabinetda bir xil ishlatiladi.
import { REGIONS, SERVICES, regionBySlug } from './data.js';
import { esc, fillDistricts } from './ui.js';
import { compressImage } from './media.js';

export function profileFormHTML(p = {}, { withConsent = false } = {}) {
  const regionOpts = REGIONS.map((r) => `<option value="${r.slug}"${r.slug === p.viloyat ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
  const svc = SERVICES.map((s) => `<label class="pick"><input type="checkbox" name="services" value="${s.key}"${(p.services || []).includes(s.key) ? ' checked' : ''}><span>${s.icon} ${esc(s.name)}</span></label>`).join('');
  return `
  <div class="photo-pick">
    <div class="pf-avatar" id="avatarPreview">${p.photoURL ? `<img src="${esc(p.photoURL)}" alt="">` : '📷'}</div>
    <label class="btn btn-line btn-sm">Rasm tanlash<input type="file" name="photo" accept="image/*" hidden></label>
    <span class="muted hint">Yuzingiz aniq ko'rinadigan rasm. Ixtiyoriy, lekin mijozlar ko'proq ishonadi.</span>
  </div>
  <div class="field"><label for="f-name">Ism va familiya *</label><input id="f-name" name="name" maxlength="60" autocomplete="name" value="${esc(p.name || '')}" placeholder="Masalan: Bahodir Karimov"></div>
  <div class="row2">
    <div class="field"><label for="f-v">Viloyat *</label><select id="f-v" name="viloyat"><option value="">Tanlang</option>${regionOpts}</select></div>
    <div class="field"><label for="f-t">Tuman / shahar *</label><select id="f-t" name="tuman"></select></div>
  </div>
  <fieldset class="field"><legend>Qaysi ishlarni qilasiz? *</legend><div class="picks">${svc}</div></fieldset>
  <div class="row2">
    <div class="field"><label for="f-exp">Tajriba (yil) *</label><input id="f-exp" name="experience" type="number" inputmode="numeric" min="0" max="60" value="${p.experience ?? ''}" placeholder="Masalan: 5"></div>
    <div class="field"><label for="f-tg">Telegram (ixtiyoriy)</label><input id="f-tg" name="telegram" maxlength="33" autocapitalize="off" value="${esc(p.telegram ? '@' + p.telegram : '')}" placeholder="@username"></div>
  </div>
  <div class="field"><label for="f-price">Narx (ixtiyoriy)</label><input id="f-price" name="price" maxlength="80" value="${esc(p.price || '')}" placeholder="Masalan: chaqiruv 50 000 so'mdan"></div>
  <div class="field"><label for="f-about">O'zingiz haqingizda (ixtiyoriy)</label><textarea id="f-about" name="about" rows="4" maxlength="600" placeholder="Qanday ishlarni yaxshi bajarasiz, qaysi hududlarga borasiz…">${esc(p.about || '')}</textarea></div>
  ${withConsent ? `<label class="consent"><input type="checkbox" name="consent"><span>Telefon raqamim saytda ommaviy ko'rinishiga va mijozlar menga bog'lanishiga roziman.</span></label>` : ''}
  <p class="form-error" role="alert" hidden></p>`;
}

// Formani jonlantiradi: viloyat→tuman, rasm oldindan ko'rish
export function bindProfileForm(form, p = {}) {
  const v = form.elements.viloyat, t = form.elements.tuman;
  fillDistricts(t, v.value, p.tuman || '');
  t.options[0].textContent = v.value ? 'Tanlang' : 'Avval viloyatni tanlang';
  v.addEventListener('change', () => { fillDistricts(t, v.value); t.options[0].textContent = v.value ? 'Tanlang' : 'Avval viloyatni tanlang'; });

  let photoBlob = null;
  form.elements.photo.addEventListener('change', async () => {
    const file = form.elements.photo.files[0];
    if (!file) return;
    try {
      photoBlob = await compressImage(file, 512, 0.8);
      document.getElementById('avatarPreview').innerHTML = `<img src="${URL.createObjectURL(photoBlob)}" alt="">`;
    } catch { showError(form, "Bu faylni rasm sifatida o'qib bo'lmadi. Boshqa rasm tanlang."); }
  });
  return { getPhoto: () => photoBlob };
}

export function showError(form, msg) {
  const el = form.querySelector('.form-error');
  el.textContent = msg; el.hidden = !msg;
  if (msg) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

// Tekshiradi va Firestore'ga yoziladigan ma'lumotni qaytaradi (yoki xato matni)
export function readProfileForm(form, { withConsent = false } = {}) {
  const f = form.elements;
  const name = f.name.value.trim().replace(/\s+/g, ' ');
  const viloyat = f.viloyat.value;
  const tuman = f.tuman.value;
  const services = [...form.querySelectorAll('input[name=services]:checked')].map((i) => i.value);
  const expRaw = f.experience.value.trim();
  const experience = Number(expRaw);
  const telegram = f.telegram.value.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '');
  const price = f.price.value.trim();
  const about = f.about.value.trim();

  if (name.length < 2) return { error: "Ism va familiyangizni yozing." };
  if (!/^[\p{L}\s'ʻʼ‘’.-]+$/u.test(name)) return { error: "Ismda faqat harflar bo'lishi kerak." };
  if (!regionBySlug(viloyat)) return { error: 'Viloyatni tanlang.' };
  if (!tuman) return { error: 'Tuman yoki shaharni tanlang.' };
  if (!services.length) return { error: 'Kamida bitta xizmat turini belgilang.' };
  if (expRaw === '' || !Number.isInteger(experience) || experience < 0 || experience > 60) return { error: "Tajribani yillarda butun son bilan yozing (0 dan 60 gacha)." };
  if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) return { error: "Telegram username noto'g'ri. Masalan: @usta_bahodir" };
  if (withConsent && !f.consent.checked) return { error: "Ro'yxatdan o'tish uchun telefon raqamingiz saytda ko'rinishiga rozilik bering." };

  return { data: { name, viloyat, tuman, services, experience, telegram, price, about } };
}
