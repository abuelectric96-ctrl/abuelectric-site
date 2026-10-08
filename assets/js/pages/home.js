import { REGIONS, SERVICES } from '../data.js';
import { topRated } from '../api.js';
import { initPage, bindSearchForm, cardHTML, skeletonCards, errorHTML, esc } from '../ui.js';

initPage();

const form = document.getElementById('searchForm');
bindSearchForm(form);

// Xizmat turi bo'yicha tezkor havolalar: tanlangan viloyat bo'lsa, shuni saqlaydi
const svcGrid = document.getElementById('svcGrid');
svcGrid.innerHTML = SERVICES.map((s) => `<a class="svc" href="/qidiruv/?x=${s.key}" data-x="${s.key}"><span>${s.icon}</span>${esc(s.name)}</a>`).join('');
svcGrid.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-x]');
  const v = form.elements.v.value;
  if (a && v) { e.preventDefault(); location.href = `/qidiruv/?v=${v}&x=${a.dataset.x}`; }
});

document.getElementById('regions').innerHTML = REGIONS.map((r) => `<a href="/viloyat/${r.slug}/">${esc(r.name)}</a>`).join('');

const top = document.getElementById('top');
async function loadTop() {
  top.innerHTML = skeletonCards(4);
  try {
    const list = await topRated(6);
    top.innerHTML = list.length
      ? list.map(cardHTML).join('')
      : `<div class="state"><b>Hozircha baholangan ustalar yo'q</b><p>Birinchi ustalar ro'yxatdan o'tmoqda. Qidiruv orqali barcha ustalarni ko'ring.</p><a class="btn btn-volt" href="/qidiruv/">Ustalarni ko'rish</a></div>`;
  } catch (err) {
    console.error(err);
    top.innerHTML = errorHTML(err);
  }
}
top.addEventListener('click', (e) => { if (e.target.closest('[data-retry]')) loadTop(); });
loadTop();
