import { regionBySlug, serviceByKey } from '../data.js';
import { getElectrician, getReviews, getTrips } from '../api.js';
import { initPage, esc, fmtPhone, fmtRange, errorHTML } from '../ui.js';

initPage();

const root = document.getElementById('profile');
const id = new URLSearchParams(location.search).get('id') || '';

const MONTHS = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'];
const ms = (v) => (typeof v === 'number' ? v : v?.toMillis ? v.toMillis() : new Date(v).getTime());
const fmtDate = (v) => { const d = new Date(ms(v)); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
const stars = (n) => '★★★★★'.slice(0, Math.round(n)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(n));
const initials = (name) => esc(String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase());

function skeleton() {
  root.innerHTML = `<div class="pf-head skel"><div class="pf-avatar sk"></div><div style="flex:1">
    <div class="sk sk-line w60"></div><div class="sk sk-line w40"></div><div class="sk sk-line w80"></div></div></div>
    <div class="pf-card"><div class="sk sk-line w40"></div><div class="sk sk-line w80"></div><div class="sk sk-line w60"></div></div>`;
}

function setMeta(e, region) {
  const where = [e.tuman, region?.short].filter(Boolean).join(', ');
  const svc = (e.services || []).map((k) => serviceByKey(k)?.name.toLowerCase()).filter(Boolean).join(', ');
  const title = `${e.name} — elektrik, ${where} | AbuElectric`;
  const desc = `${e.name}: ${svc}. ${e.experience ? e.experience + ' yil tajriba. ' : ''}${e.ratingCount ? `Baho ${e.rating.toFixed(1)} (${e.ratingCount} sharh). ` : ''}To'g'ridan-to'g'ri qo'ng'iroq qiling.`;
  const url = `https://abuelectric.uz/usta/?id=${encodeURIComponent(e.id)}`;
  document.title = title;
  const set = (sel, attr, val) => { const el = document.querySelector(sel); if (el) el.setAttribute(attr, val); };
  set('meta[name="description"]', 'content', desc);
  set('link[rel="canonical"]', 'href', url);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', desc);
  if (e.photoURL) set('meta[property="og:image"]', 'content', e.photoURL);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Electrician', name: e.name, url, telephone: e.phone,
    image: e.photoURL || undefined,
    areaServed: where || undefined,
    aggregateRating: e.ratingCount ? { '@type': 'AggregateRating', ratingValue: e.rating.toFixed(1), reviewCount: e.ratingCount } : undefined,
  });
  document.head.appendChild(ld);
}

function render(e, trips, reviews) {
  const region = regionBySlug(e.viloyat);
  const tg = String(e.telegram || '').replace(/^@/, '');
  const back = document.referrer.includes('/qidiruv/') || document.referrer.includes('/viloyat/') ? 'javascript:history.back()' : '/qidiruv/?v=' + e.viloyat;
  const counts = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  root.innerHTML = `
  <a class="back" href="${back}">‹ Orqaga</a>
  <section class="pf-head${e.availableNow ? ' is-free' : ''}">
    <div class="pf-avatar">${e.photoURL ? `<img src="${esc(e.photoURL)}" alt="${esc(e.name)}" width="96" height="96">` : initials(e.name)}${e.availableNow ? '<i class="dot"></i>' : ''}</div>
    <div class="pf-info">
      <h1>${esc(e.name)}${e.verified ? ' <span class="badge-ok" title="Tasdiqlangan elektrik">✔</span>' : ''}</h1>
      <p class="place">📍 ${esc([e.tuman, region?.name].filter(Boolean).join(', '))}</p>
      <p class="phone-line"><a href="tel:${esc(e.phone)}">${esc(fmtPhone(e.phone))}</a></p>
      <div class="flags">
        ${e.verified ? '<span class="flag flag-ok">✔ Tasdiqlangan elektrik</span>' : '<span class="flag flag-pending">Hali tasdiqlanmagan</span>'}
        ${e.availableNow ? '<span class="flag flag-free">● Hozir bo\'sh</span>' : ''}
      </div>
      <div class="meta">
        ${e.ratingCount ? `<span class="stars">★ ${e.rating.toFixed(1)}</span><span class="muted">(${e.ratingCount} ta sharh)</span>` : '<span class="muted">Hali baho yo\'q</span>'}
        ${e.experience ? `<span class="muted">· ${esc(e.experience)} yil tajriba</span>` : ''}
      </div>
    </div>
  </section>

  <div class="actionbar">
    <a class="btn btn-call" href="tel:${esc(e.phone)}">📞 Qo'ng'iroq qilish</a>
    ${tg ? `<a class="btn btn-tg" href="https://t.me/${esc(tg)}" target="_blank" rel="noopener">✈ Telegram</a>` : ''}
  </div>

  <div class="pf-grid">
    <div class="pf-col">
      <section class="pf-card">
        <h2>Xizmatlar</h2>
        <ul class="svc-list">${(e.services || []).map((k) => { const s = serviceByKey(k); return s ? `<li><span>${s.icon}</span>${esc(s.name)}</li>` : ''; }).join('')}</ul>
        ${e.price ? `<p class="price">💰 <b>Narx:</b> ${esc(e.price)}</p>` : ''}
      </section>

      ${e.about ? `<section class="pf-card"><h2>O'zi haqida</h2><p class="about">${esc(e.about)}</p></section>` : ''}

      ${trips.length ? `<section class="pf-card"><h2>✈ Vaqtincha boradigan joylari</h2><ul class="trip-list">
        ${trips.map((t) => `<li><b>${esc(regionBySlug(t.viloyat)?.name || t.viloyat)}${t.tuman ? ', ' + esc(t.tuman) : ''}</b><span>${fmtRange(t.from, t.to)}</span></li>`).join('')}
      </ul></section>` : ''}

      ${(e.works || []).length ? `<section class="pf-card"><h2>Ish rasmlari</h2><div class="works">
        ${e.works.map((u, i) => `<button class="work" data-src="${esc(u)}" aria-label="${i + 1}-rasmni kattalashtirish"><img src="${esc(u)}" alt="Ish rasmi ${i + 1}" loading="lazy"></button>`).join('')}
      </div></section>` : ''}
    </div>

    <div class="pf-col">
      <section class="pf-card" id="sharhlar">
        <div class="pf-card-head"><h2>Sharhlar</h2><a class="btn btn-line btn-sm" href="/kirish/?next=${encodeURIComponent('/usta/?id=' + e.id + '#sharh')}">✍ Sharh yozish</a></div>
        ${reviews.length ? `
          <div class="rating-sum">
            <div class="big">${e.rating.toFixed(1)}<small>${stars(e.rating)}</small><span class="muted">${e.ratingCount} ta sharh</span></div>
            <div class="bars">${counts.map((c, i) => `<div><span>${5 - i}</span><i style="--w:${reviews.length ? (c / reviews.length) * 100 : 0}%"></i><span class="muted">${c}</span></div>`).join('')}</div>
          </div>
          <ul class="reviews">${reviews.map((r) => `<li>
            <div class="r-top"><b>${esc(r.name || 'Mijoz')}</b><span class="stars">${stars(r.rating)}</span></div>
            ${r.text ? `<p>${esc(r.text)}</p>` : ''}
            <span class="muted r-date">${fmtDate(r.createdAt)}</span>
          </li>`).join('')}</ul>`
        : `<p class="muted">Hali sharh yo'q. Bu ustaning xizmatidan foydalangan bo'lsangiz, birinchi bo'lib fikringizni yozing.</p>`}
      </section>
      <p class="report"><a href="/kirish/?next=${encodeURIComponent('/usta/?id=' + e.id + '#shikoyat')}">⚑ Shikoyat qilish</a> · <button class="linkbtn" id="shareBtn">↗ Ulashish</button></p>
    </div>
  </div>`;

  // Ish rasmlarini kattalashtirish
  const lb = document.getElementById('lightbox');
  root.querySelectorAll('.work').forEach((b) => b.addEventListener('click', () => {
    lb.querySelector('img').src = b.dataset.src;
    lb.showModal();
  }));
  lb.addEventListener('click', () => lb.close());

  document.getElementById('shareBtn').addEventListener('click', async () => {
    const data = { title: `${e.name} — elektrik`, text: `${e.name}, elektrik (${region?.short || ''})`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); document.getElementById('shareBtn').textContent = '✓ Havola nusxalandi'; }
    } catch {}
  });
}

async function load() {
  if (!id) {
    root.innerHTML = `<div class="state"><b>Usta ko'rsatilmagan</b><p>Qidiruv orqali kerakli elektrikni toping.</p><a class="btn btn-volt" href="/qidiruv/">Elektrik topish</a></div>`;
    return;
  }
  skeleton();
  try {
    const e = await getElectrician(id);
    if (!e) {
      root.innerHTML = `<div class="state"><b>Bu usta topilmadi</b><p>Profil o'chirilgan yoki havola noto'g'ri bo'lishi mumkin.</p><a class="btn btn-volt" href="/qidiruv/">Boshqa ustalarni ko'rish</a></div>`;
      return;
    }
    const [trips, reviews] = await Promise.all([getTrips(id).catch(() => []), getReviews(id).catch(() => [])]);
    setMeta(e, regionBySlug(e.viloyat));
    render(e, trips, reviews);
  } catch (err) {
    console.error(err);
    root.innerHTML = errorHTML(err);
    root.querySelector('[data-retry]')?.addEventListener('click', load);
  }
}
load();
