import { regionBySlug, serviceByKey } from '../data.js';
import { searchElectricians } from '../api.js';
import { initPage, bindSearchForm, cardHTML, skeletonCards, errorHTML, esc } from '../ui.js';

initPage();

// Viloyat sahifalarida (/viloyat/<slug>/) viloyat body[data-v] dan olinadi
const params = new URLSearchParams(location.search);
const q = {
  v: params.get('v') || document.body.dataset.v || '',
  t: params.get('t') || '',
  x: params.get('x') || '',
  bosh: params.get('bosh') === '1',
};
if (!regionBySlug(q.v)) { q.v = ''; q.t = ''; }
if (!serviceByKey(q.x)) q.x = '';

bindSearchForm(document.getElementById('searchForm'), q);

const region = regionBySlug(q.v);
const service = serviceByKey(q.x);
const where = q.t || region?.name || "O'zbekiston bo'ylab";
const title = `${where}: ${service ? service.name.toLowerCase() : 'elektriklar'}`;
const h1 = document.getElementById('title');
if (!document.body.dataset.v) {
  h1.textContent = title;
  document.title = `${title} — AbuElectric`;
}

const box = document.getElementById('results');
const count = document.getElementById('count');

function emptyState() {
  const tips = [];
  if (q.bosh) tips.push(`<a class="btn btn-line" href="${link({ ...q, bosh: false })}">Barcha ustalarni ko'rsatish</a>`);
  if (q.t) tips.push(`<a class="btn btn-line" href="${link({ ...q, t: '' })}">Butun ${esc(region?.short || 'viloyat')} bo'yicha</a>`);
  if (q.x) tips.push(`<a class="btn btn-line" href="${link({ ...q, x: '' })}">Barcha xizmatlar</a>`);
  return `<div class="state"><b>Bu yerda hozircha usta topilmadi</b>
    <p>Qidiruvni kengaytirib ko'ring. Ustalar har kuni qo'shilmoqda.</p>${tips.join('')}</div>`;
}

function link(o) {
  const p = new URLSearchParams();
  if (o.v) p.set('v', o.v);
  if (o.t) p.set('t', o.t);
  if (o.x) p.set('x', o.x);
  if (o.bosh) p.set('bosh', '1');
  return '/qidiruv/' + (p.toString() ? '?' + p : '');
}

async function run() {
  box.innerHTML = skeletonCards(6);
  count.textContent = 'Qidirilmoqda…';
  try {
    const list = await searchElectricians({ viloyat: q.v, tuman: q.t, service: q.x, onlyAvailable: q.bosh });
    const free = list.filter((e) => e.availableNow).length;
    count.textContent = list.length ? `${list.length} ta usta${free ? ` · ${free} tasi hozir bo'sh` : ''}` : '';
    box.innerHTML = list.length ? list.map(cardHTML).join('') : emptyState();
  } catch (err) {
    console.error(err);
    count.textContent = '';
    box.innerHTML = errorHTML(err);
  }
}
box.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) run(); });
run();
