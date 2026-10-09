import { regionBySlug, serviceByKey } from '../data.js';
import { getElectrician, getReviews, getTrips, DEMO } from '../api.js';
import { firestore } from '../firebase.js';
import { initPage, esc, fmtPhone, fmtRange, errorHTML, friendlyError } from '../ui.js';

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
        <div class="pf-card-head"><h2>Sharhlar</h2><button class="btn btn-line btn-sm" id="reviewBtn">✍ Sharh yozish</button></div>
        ${reviews.length ? `
          <div class="rating-sum">
            <div class="big">${e.rating.toFixed(1)}<small>${stars(e.rating)}</small><span class="muted">${e.ratingCount} ta sharh</span></div>
            <div class="bars">${counts.map((c, i) => `<div><span>${5 - i}</span><i style="--w:${reviews.length ? (c / reviews.length) * 100 : 0}%"></i><span class="muted">${c}</span></div>`).join('')}</div>
          </div>
          <ul class="reviews">${reviews.map((r) => `<li>
            <div class="r-top"><b>${esc(r.name || 'Mijoz')}</b><span class="stars">${stars(r.rating)}</span></div>
            ${r.text ? `<p>${esc(r.text)}</p>` : ''}
            <span class="muted r-date">${fmtDate(r.createdAt)}</span>
            ${r.id ? `<button class="linkbtn r-report" data-report-review="${esc(r.id)}">⚑ Shikoyat</button>` : ''}
          </li>`).join('')}</ul>`
        : `<p class="muted">Hali sharh yo'q. Bu ustaning xizmatidan foydalangan bo'lsangiz, birinchi bo'lib fikringizni yozing.</p>`}
      </section>
      <p class="report"><button class="linkbtn" id="reportBtn">⚑ Shikoyat qilish</button> · <button class="linkbtn" id="shareBtn">↗ Ulashish</button></p>
    </div>
  </div>`;

  // Ish rasmlarini kattalashtirish
  const lb = document.getElementById('lightbox');
  root.querySelectorAll('.work').forEach((b) => b.addEventListener('click', () => {
    lb.querySelector('img').src = b.dataset.src;
    lb.showModal();
  }));
  lb.addEventListener('click', () => lb.close());

  document.getElementById('reviewBtn').addEventListener('click', () => openReview(e));
  document.getElementById('reportBtn').addEventListener('click', () => openReport('profile', e.id));
  root.querySelectorAll('[data-report-review]').forEach((b) => b.addEventListener('click', () => openReport('review', b.dataset.reportReview)));
  if (location.hash === '#sharh') openReview(e);
  if (location.hash === '#shikoyat') openReport('profile', e.id);

  document.getElementById('shareBtn').addEventListener('click', async () => {
    const data = { title: `${e.name} — elektrik`, text: `${e.name}, elektrik (${region?.short || ''})`, url: location.href };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(location.href); document.getElementById('shareBtn').textContent = '✓ Havola nusxalandi'; }
    } catch {}
  });
}

// ---------- Sharh va shikoyat (telefon tasdiqlangan foydalanuvchi uchun) ----------
async function requireUser(hash) {
  if (DEMO) { alert("Namuna rejimida sharh yozib bo'lmaydi."); return null; }
  const { currentUser, loginUrl } = await import('../session.js');
  const u = await currentUser();
  if (!u) { location.href = loginUrl(location.pathname + location.search + hash); return null; }
  return u;
}

function sheet(html) {
  const d = document.getElementById('sheet');
  d.innerHTML = `<form method="dialog" class="sheet-close"><button aria-label="Yopish">✕</button></form>${html}`;
  d.showModal();
  return d;
}

async function openReview(e) {
  const u = await requireUser('#sharh');
  if (!u) return;
  if (u.uid === e.id) { sheet(`<h2>O'zingizga sharh yozib bo'lmaydi</h2><p class="muted">Sharhlarni faqat mijozlar qoldiradi.</p>`); return; }
  const d = sheet(`
    <h2>${esc(e.name)} haqida sharh</h2>
    <form id="reviewForm" novalidate>
      <div class="field"><label>Baho</label><div class="star-pick" role="radiogroup">
        ${[1, 2, 3, 4, 5].map((n) => `<label><input type="radio" name="rating" value="${n}"><span aria-label="${n} yulduz">★</span></label>`).join('')}
      </div></div>
      <div class="field"><label for="rv-name">Ismingiz</label><input id="rv-name" name="name" maxlength="40" placeholder="Masalan: Dilshod"></div>
      <div class="field"><label for="rv-text">Sharh (ixtiyoriy)</label><textarea id="rv-text" name="text" rows="3" maxlength="500" placeholder="Usta qanday ishladi?"></textarea></div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-volt btn-block" type="submit">Yuborish</button>
    </form>`);
  const form = d.querySelector('#reviewForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const rating = Number(form.elements.rating.value);
    const name = form.elements.name.value.trim();
    const text = form.elements.text.value.trim();
    const err = (m) => { const p = form.querySelector('.form-error'); p.textContent = m; p.hidden = !m; };
    if (!rating) return err('Yulduzchalardan birini tanlang.');
    if (!name) return err('Ismingizni yozing.');
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Yuborilmoqda…';
    try {
      const fs = await firestore();
      await fs.runTransaction(fs.db, async (tx) => {
        const eref = fs.doc(fs.db, 'electricians', e.id);
        const rref = fs.doc(fs.db, 'reviews', `${e.id}_${u.uid}`);
        const [es, rs] = [await tx.get(eref), await tx.get(rref)];
        if (rs.exists()) throw Object.assign(new Error('already'), { code: 'ae/already' });
        const cur = es.data();
        const count = (cur.ratingCount || 0) + 1, sum = (cur.ratingSum || 0) + rating;
        tx.update(eref, { ratingSum: sum, ratingCount: count, ratingAvg: Math.round((sum / count) * 100) / 100 });
        tx.set(rref, { electricianId: e.id, uid: u.uid, name, rating, text, createdAt: fs.serverTimestamp() });
        tx.set(fs.doc(fs.db, 'meta', u.uid), { lastReviewAt: fs.serverTimestamp() }, { merge: true });
      });
      d.innerHTML = `<h2>Rahmat! ✓</h2><p class="muted">Sharhingiz qo'shildi.</p><form method="dialog"><button class="btn btn-volt btn-block">Yopish</button></form>`;
      d.addEventListener('close', () => location.replace(location.pathname + location.search), { once: true });
    } catch (ex) {
      console.error(ex);
      err(ex.code === 'ae/already' ? "Siz bu ustaga allaqachon sharh yozgansiz." :
        ex.code === 'permission-denied' ? "Sharh qabul qilinmadi. Ketma-ket sharhlar orasida 5 daqiqa bo'lishi kerak." : friendlyError(ex));
      btn.disabled = false; btn.textContent = 'Yuborish';
    }
  });
}

async function openReport(type, targetId) {
  const u = await requireUser('#shikoyat');
  if (!u) return;
  const d = sheet(`
    <h2>Shikoyat qilish</h2>
    <p class="muted">${type === 'review' ? 'Bu sharhda nima noto\'g\'ri?' : 'Bu profilda nima noto\'g\'ri? Masalan: elektrik emas, raqam ishlamaydi, aldagan.'}</p>
    <form id="reportForm" novalidate>
      <div class="field"><textarea name="reason" rows="3" maxlength="300" placeholder="Qisqacha yozing"></textarea></div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-dark btn-block" type="submit">Yuborish</button>
    </form>`);
  const form = d.querySelector('#reportForm');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const reason = form.elements.reason.value.trim();
    const p = form.querySelector('.form-error');
    if (reason.length < 3) { p.textContent = 'Sababini qisqacha yozing.'; p.hidden = false; return; }
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const fs = await firestore();
      const batch = fs.writeBatch(fs.db);
      batch.set(fs.doc(fs.collection(fs.db, 'reports')), { type, targetId, reason, uid: u.uid, status: 'open', createdAt: fs.serverTimestamp() });
      batch.set(fs.doc(fs.db, 'meta', u.uid), { lastReportAt: fs.serverTimestamp() }, { merge: true });
      await batch.commit();
      d.innerHTML = `<h2>Qabul qilindi ✓</h2><p class="muted">Admin ko'rib chiqadi. Rahmat!</p><form method="dialog"><button class="btn btn-volt btn-block">Yopish</button></form>`;
    } catch (ex) {
      console.error(ex);
      p.textContent = ex.code === 'permission-denied' ? "Ketma-ket shikoyatlar orasida 2 daqiqa bo'lishi kerak." : friendlyError(ex);
      p.hidden = false; btn.disabled = false;
    }
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
