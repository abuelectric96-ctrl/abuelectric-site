// Umumiy UI yordamchilari: kartochka, skeleton, xato xabari, select ro'yxatlari, ref, PWA.
import { REGIONS, SERVICES, regionBySlug, serviceByKey } from './data.js';
import { DEMO } from './api.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function fmtPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length !== 12) return p || '';
  return `+${d.slice(0, 3)} ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8, 10)} ${d.slice(10)}`;
}

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
const ms = (v) => (typeof v === 'number' ? v : v?.toMillis ? v.toMillis() : new Date(v).getTime());
export function fmtRange(from, to) {
  const a = new Date(ms(from)), b = new Date(ms(to));
  return a.getMonth() === b.getMonth()
    ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
    : `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`;
}

const initials = (name) => esc(String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase());

export function cardHTML(e) {
  const region = regionBySlug(e.viloyat);
  const place = e.trip
    ? `${esc(region?.short || '')} → vaqtincha ${esc(regionBySlug(e.trip.viloyat)?.short || '')}`
    : [e.tuman, region?.short].filter(Boolean).map(esc).join(', ');
  const services = (e.services || []).slice(0, 3).map((k) => `<span class="chip">${esc(serviceByKey(k)?.name || k)}</span>`).join('');
  const more = (e.services || []).length > 3 ? `<span class="chip chip-more">+${e.services.length - 3}</span>` : '';
  const tg = String(e.telegram || '').replace(/^@/, '');

  return `<article class="ecard${e.availableNow ? ' is-free' : ''}">
    <a class="ecard-main" href="/usta/?id=${encodeURIComponent(e.id)}">
      <div class="avatar">${e.photoURL ? `<img src="${esc(e.photoURL)}" alt="" loading="lazy" width="64" height="64">` : initials(e.name)}${e.availableNow ? '<i class="dot" title="Hozir bo\'sh"></i>' : ''}</div>
      <div class="ecard-info">
        <h3>${esc(e.name)}${e.verified ? ' <span class="badge-ok" title="Tasdiqlangan elektrik">✔</span>' : ''}</h3>
        <p class="place">📍 ${place}</p>
        <div class="flags">
          ${e.availableNow ? '<span class="flag flag-free">● Hozir bo\'sh</span>' : ''}
          ${e.trip ? `<span class="flag flag-trip">✈ Vaqtincha mavjud: ${fmtRange(e.trip.from, e.trip.to)}</span>` : ''}
          ${!e.verified ? '<span class="flag flag-pending">Tasdiqlanmagan</span>' : ''}
        </div>
        <div class="meta">
          ${e.ratingCount ? `<span class="stars">★ ${e.rating.toFixed(1)}</span><span class="muted">(${e.ratingCount})</span>` : '<span class="muted">Hali baho yo\'q</span>'}
          ${e.experience ? `<span class="muted">· ${esc(e.experience)} yil tajriba</span>` : ''}
        </div>
        <div class="chips">${services}${more}</div>
      </div>
    </a>
    <div class="ecard-actions">
      <a class="btn btn-call" href="tel:${esc(e.phone)}">📞 Qo'ng'iroq</a>
      ${tg ? `<a class="btn btn-tg" href="https://t.me/${esc(tg)}" target="_blank" rel="noopener">✈ Telegram</a>` : ''}
    </div>
  </article>`;
}

export function skeletonCards(n = 4) {
  return Array.from({ length: n }, () => `<div class="ecard skel" aria-hidden="true">
    <div class="ecard-main"><div class="avatar sk"></div><div class="ecard-info">
    <div class="sk sk-line w60"></div><div class="sk sk-line w40"></div><div class="sk sk-line w80"></div></div></div>
    <div class="ecard-actions"><div class="sk sk-btn"></div><div class="sk sk-btn"></div></div></div>`).join('');
}

// Texnik xatoni oddiy o'zbekcha xabarga aylantiradi
export function friendlyError(err) {
  const code = err?.code || '';
  if (!navigator.onLine || code === 'unavailable') return "Internet aloqasi yo'q. Ulanishni tekshirib, qayta urinib ko'ring.";
  if (code === 'permission-denied') return "Bu amalga ruxsat yo'q. Tizimga qayta kirib ko'ring.";
  if (code === 'failed-precondition') return "Qidiruv hozircha sozlanmoqda. Birozdan keyin urinib ko'ring.";
  if (code.startsWith('auth/')) return "Kirishda xatolik. Telefon raqam va kodni tekshirib, qayta urinib ko'ring.";
  return "Nimadir noto'g'ri ketdi. Sahifani yangilab, qayta urinib ko'ring.";
}

export function errorHTML(err, retry = true) {
  return `<div class="state state-error"><b>⚠ ${esc(friendlyError(err))}</b>${retry ? '<button class="btn btn-line" data-retry>Qayta urinish</button>' : ''}</div>`;
}

export function fillRegions(select, value = '') {
  select.innerHTML = '<option value="">Butun O\'zbekiston</option>' +
    REGIONS.map((r) => `<option value="${r.slug}"${r.slug === value ? ' selected' : ''}>${esc(r.name)}</option>`).join('');
}

export function fillDistricts(select, regionSlug, value = '') {
  const r = regionBySlug(regionSlug);
  select.disabled = !r;
  select.innerHTML = `<option value="">${r ? 'Barcha tumanlar' : 'Avval viloyatni tanlang'}</option>` +
    (r ? r.districts.map((d) => `<option${d === value ? ' selected' : ''}>${esc(d)}</option>`).join('') : '');
}

export function fillServices(select, value = '') {
  select.innerHTML = '<option value="">Barcha xizmatlar</option>' +
    SERVICES.map((s) => `<option value="${s.key}"${s.key === value ? ' selected' : ''}>${s.icon} ${esc(s.name)}</option>`).join('');
}

// Qidiruv formasini ulaydi (bosh sahifa va natijalar sahifasi uchun umumiy)
export function bindSearchForm(form, initial = {}) {
  const v = form.elements.v, t = form.elements.t, x = form.elements.x, bosh = form.elements.bosh;
  fillRegions(v, initial.v || '');
  fillDistricts(t, initial.v || '', initial.t || '');
  fillServices(x, initial.x || '');
  if (bosh) bosh.checked = Boolean(initial.bosh);
  v.addEventListener('change', () => fillDistricts(t, v.value));
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const p = new URLSearchParams();
    if (v.value) p.set('v', v.value);
    if (t.value) p.set('t', t.value);
    if (x.value) p.set('x', x.value);
    if (bosh?.checked) p.set('bosh', '1');
    location.href = '/qidiruv/' + (p.toString() ? '?' + p : '');
  });
}

// Hamkor havolasi: ?ref=nom — 30 kun eslab qolinadi va ro'yxatdan o'tishda profilga yoziladi
export function captureRef() {
  const ref = new URLSearchParams(location.search).get('ref');
  if (!ref || !/^[a-z0-9_-]{2,32}$/i.test(ref)) return;
  try { localStorage.setItem('ae_ref', JSON.stringify({ ref: ref.toLowerCase(), at: Date.now() })); } catch {}
}
export function storedRef() {
  try {
    const r = JSON.parse(localStorage.getItem('ae_ref') || 'null');
    return r && Date.now() - r.at < 30 * 864e5 ? r.ref : '';
  } catch { return ''; }
}

export function demoBanner() {
  if (!DEMO) return;
  const b = document.createElement('div');
  b.className = 'demo-banner';
  b.textContent = "Namuna rejimi: Firebase hali ulanmagan, ko'rsatilgan ustalar haqiqiy emas.";
  document.body.prepend(b);
}

export function initPage() {
  captureRef();
  demoBanner();
  const menuBtn = document.getElementById('menuBtn'), nav = document.getElementById('nav');
  menuBtn?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  if ('serviceWorker' in navigator && location.hostname !== 'localhost') {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
}
