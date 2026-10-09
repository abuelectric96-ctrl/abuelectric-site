// /admin/ — faqat admins/{uid} hujjati bor foydalanuvchi uchun.
import { firestore } from '../firebase.js';
import { REGIONS, regionBySlug } from '../data.js';
import { initPage, esc, fmtPhone, friendlyError } from '../ui.js';
import { currentUser, isAdmin, signOut } from '../session.js';

initPage();

const root = document.getElementById('admin');
const ms = (v) => (v == null ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : new Date(v).getTime());
const day = (t) => new Date(t).toISOString().slice(0, 10);
const STATUS = { pending: 'Tasdiqlanmagan', verified: 'Tasdiqlangan', blocked: 'Bloklangan' };

let fs, all = [], reports = [], tab = 'ustalar';
const filt = { q: '', status: '', v: '' };

function toast(msg, bad = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

async function loadAll() {
  const [es, rs] = await Promise.all([
    fs.getDocs(fs.query(fs.collection(fs.db, 'electricians'), fs.limit(2000))),
    fs.getDocs(fs.query(fs.collection(fs.db, 'reports'), fs.where('status', '==', 'open'), fs.limit(200))),
  ]);
  all = es.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  reports = rs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
}

function shell() {
  root.innerHTML = `
  <div class="cab-head"><h1>Admin panel</h1><button class="linkbtn" id="logout">Chiqish</button></div>
  <div class="tabs" role="tablist">
    <button role="tab" data-tab="ustalar">Ustalar <span class="cnt">${all.length}</span></button>
    <button role="tab" data-tab="shikoyat">Shikoyatlar <span class="cnt${reports.length ? ' hot' : ''}">${reports.length}</span></button>
    <button role="tab" data-tab="lead">Botga yozganlar <span class="cnt" id="leadCnt">…</span></button>
    <button role="tab" data-tab="stat">Statistika</button>
  </div>
  <div id="pane"></div>`;
  root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; draw(); }));
  document.getElementById('logout').addEventListener('click', async () => { await signOut(); location.href = '/'; });
  draw();
}

function draw() {
  root.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const pane = document.getElementById('pane');
  if (tab === 'ustalar') pane.innerHTML = listPane();
  if (tab === 'shikoyat') pane.innerHTML = reportsPane();
  if (tab === 'stat') pane.innerHTML = statPane();
  if (tab === 'lead') { pane.innerHTML = leadsPane(); if (!leads) loadLeads(); }
  bindPane(pane);
}

// ---------- Ustalar ----------
function filtered() {
  const q = filt.q.toLowerCase().replace(/\s+/g, '');
  return all.filter((e) => (!filt.status || e.status === filt.status) && (!filt.v || e.viloyat === filt.v) &&
    (!q || `${e.name}${e.phone}${e.ref || ''}${e.tuman}`.toLowerCase().replace(/\s+/g, '').includes(q)));
}

function listPane() {
  const rows = filtered();
  return `
  <div class="admin-filters">
    <input id="q" placeholder="Ism, telefon yoki ref bo'yicha qidirish" value="${esc(filt.q)}">
    <select id="fs"><option value="">Barcha holatlar</option>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${filt.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
    <select id="fv"><option value="">Barcha viloyatlar</option>${REGIONS.map((r) => `<option value="${r.slug}"${filt.v === r.slug ? ' selected' : ''}>${esc(r.short)}</option>`).join('')}</select>
  </div>
  <p class="muted">${rows.length} ta usta</p>
  <div class="admin-list">${rows.map((e) => `
    <article class="arow st-${e.status}">
      <div class="arow-main">
        <b><a href="/usta/?id=${encodeURIComponent(e.id)}" target="_blank">${esc(e.name)}</a></b>
        <span class="pill pill-${e.status}">${STATUS[e.status] || e.status}</span>
        <div class="muted">${esc(fmtPhone(e.phone))} · ${esc([e.tuman, regionBySlug(e.viloyat)?.short].filter(Boolean).join(', '))}</div>
        <div class="muted small">Ro'yxatdan: ${e.createdAt ? day(ms(e.createdAt)) : '—'}${e.ref ? ` · ref: <b>${esc(e.ref)}</b>` : ''} · ish rasmi: ${(e.works || []).length} · baho: ${e.ratingCount ? (e.ratingSum / e.ratingCount).toFixed(1) + ' (' + e.ratingCount + ')' : '—'}</div>
      </div>
      <div class="arow-act">
        ${e.verifyDocPath ? `<button class="btn btn-line btn-sm" data-doc="${esc(e.id)}">📄 Hujjat</button>` : ''}
        ${e.status !== 'verified' && e.status !== 'blocked' ? `<button class="btn btn-call btn-sm" data-act="verify" data-id="${e.id}">✔ Tasdiqlash</button>` : ''}
        ${e.status === 'verified' ? `<button class="btn btn-line btn-sm" data-act="unverify" data-id="${e.id}">Tasdiqni olish</button>` : ''}
        ${e.status !== 'blocked' ? `<button class="btn btn-line btn-sm" data-act="block" data-id="${e.id}">⛔ Bloklash</button>` : `<button class="btn btn-line btn-sm" data-act="unblock" data-id="${e.id}">Blokdan chiqarish</button>`}
        <button class="btn btn-line btn-sm danger" data-act="delete" data-id="${e.id}">🗑</button>
      </div>
    </article>`).join('') || '<div class="state"><b>Hech kim topilmadi</b></div>'}</div>`;
}

async function act(kind, id) {
  const ref = fs.doc(fs.db, 'electricians', id);
  const e = all.find((x) => x.id === id);
  if (kind === 'verify') await fs.updateDoc(ref, { status: 'verified', verifiedAt: fs.serverTimestamp() });
  if (kind === 'unverify') await fs.updateDoc(ref, { status: 'pending' });
  if (kind === 'block') { if (!confirm(`${e.name} bloklansinmi? Qidiruvda ko'rinmay qoladi.`)) return; await fs.updateDoc(ref, { status: 'blocked', availableUntil: null }); }
  if (kind === 'unblock') await fs.updateDoc(ref, { status: 'pending' });
  if (kind === 'delete') {
    if (!confirm(`${e.name} profilini BUTUNLAY o'chirasizmi? Safarlari va rasmlari ham o'chadi. Buni qaytarib bo'lmaydi.`)) return;
    const [trips, photos] = await Promise.all([
      fs.getDocs(fs.query(fs.collection(fs.db, 'trips'), fs.where('uid', '==', id))),
      fs.getDocs(fs.query(fs.collection(fs.db, 'photos'), fs.where('uid', '==', id))),
    ]);
    const batch = fs.writeBatch(fs.db);
    [...trips.docs, ...photos.docs].forEach((d) => batch.delete(d.ref));
    batch.delete(fs.doc(fs.db, 'verifications', id));
    batch.delete(ref);
    await batch.commit();
    all = all.filter((x) => x.id !== id);
    toast("O'chirildi");
    return;
  }
  const s = await fs.getDoc(ref);
  Object.assign(e, s.data());
  toast('Saqlandi ✓');
}

// ---------- Shikoyatlar ----------
function reportsPane() {
  if (!reports.length) return '<div class="state"><b>Ochiq shikoyat yo\'q 👍</b></div>';
  return `<div class="admin-list">${reports.map((r) => {
    const target = r.type === 'profile' ? all.find((e) => e.id === r.targetId) : null;
    return `<article class="arow">
      <div class="arow-main">
        <b>${r.type === 'profile' ? 'Profil' : 'Sharh'} haqida shikoyat</b> <span class="muted small">${r.createdAt ? day(ms(r.createdAt)) : ''}</span>
        <p>«${esc(r.reason)}»</p>
        <div class="muted small">${r.type === 'profile'
          ? `Usta: <a href="/usta/?id=${encodeURIComponent(r.targetId)}" target="_blank">${esc(target?.name || r.targetId)}</a>`
          : `Sharh ID: ${esc(r.targetId)} · <a href="/usta/?id=${encodeURIComponent(r.targetId.split('_')[0])}#sharhlar" target="_blank">ustani ochish</a>`}</div>
      </div>
      <div class="arow-act">
        ${r.type === 'review' ? `<button class="btn btn-line btn-sm danger" data-rep="delreview" data-id="${r.id}">Sharhni o'chirish</button>` : ''}
        ${r.type === 'profile' && target?.status !== 'blocked' ? `<button class="btn btn-line btn-sm danger" data-rep="block" data-id="${r.id}">⛔ Ustani bloklash</button>` : ''}
        <button class="btn btn-call btn-sm" data-rep="resolve" data-id="${r.id}">✔ Ko'rib chiqildi</button>
      </div>
    </article>`;
  }).join('')}</div>`;
}

async function repAct(kind, id) {
  const r = reports.find((x) => x.id === id);
  if (kind === 'delreview') {
    if (!confirm("Sharh o'chirilsinmi? Ustaning bahosi qayta hisoblanadi.")) return;
    const eid = r.targetId.split('_')[0];
    await fs.runTransaction(fs.db, async (tx) => {
      const rref = fs.doc(fs.db, 'reviews', r.targetId), eref = fs.doc(fs.db, 'electricians', eid);
      const rs = await tx.get(rref), es = await tx.get(eref);
      if (rs.exists() && es.exists()) {
        const d = es.data();
        const count = Math.max(0, (d.ratingCount || 0) - 1), sum = Math.max(0, (d.ratingSum || 0) - rs.data().rating);
        tx.update(eref, { ratingCount: count, ratingSum: sum, ratingAvg: count ? Math.round((sum / count) * 100) / 100 : 0 });
        tx.delete(rref);
      }
    });
  }
  if (kind === 'block') {
    if (!confirm('Usta bloklansinmi?')) return;
    await fs.updateDoc(fs.doc(fs.db, 'electricians', r.targetId), { status: 'blocked', availableUntil: null });
    const e = all.find((x) => x.id === r.targetId); if (e) e.status = 'blocked';
  }
  await fs.updateDoc(fs.doc(fs.db, 'reports', id), { status: 'resolved' });
  reports = reports.filter((x) => x.id !== id);
  toast('Bajarildi ✓');
}

// ---------- Statistika ----------
function statPane() {
  const now = Date.now();
  const by = (fn) => all.reduce((m, e) => { const k = fn(e); m[k] = (m[k] || 0) + 1; return m; }, {});
  const st = by((e) => e.status);
  const reg = by((e) => e.viloyat);
  const refs = Object.entries(by((e) => e.ref || '— (to\'g\'ridan-to\'g\'ri)')).sort((a, b) => b[1] - a[1]);
  const days = Array.from({ length: 14 }, (_, i) => day(now - (13 - i) * 864e5));
  const daily = by((e) => (e.createdAt ? day(ms(e.createdAt)) : ''));
  const maxReg = Math.max(1, ...Object.values(reg));
  const maxDay = Math.max(1, ...days.map((d) => daily[d] || 0));
  const free = all.filter((e) => ms(e.availableUntil) > now).length;

  return `
  <div class="stat-tiles">
    <div><b>${all.length}</b><span>Jami ustalar</span></div>
    <div><b>${st.verified || 0}</b><span>Tasdiqlangan</span></div>
    <div><b>${st.pending || 0}</b><span>Tasdiqlanmagan</span></div>
    <div><b>${st.blocked || 0}</b><span>Bloklangan</span></div>
    <div><b>${free}</b><span>Hozir bo'sh</span></div>
    <div><b>${daily[day(now)] || 0}</b><span>Bugun qo'shildi</span></div>
  </div>
  <section class="pf-card"><h2>Kunlik yangi ro'yxatdan o'tganlar (14 kun)</h2>
    <div class="daybars">${days.map((d) => `<div title="${d}: ${daily[d] || 0}"><i style="height:${((daily[d] || 0) / maxDay) * 100}%"></i><span>${(daily[d] || 0) || ''}</span><small>${d.slice(8)}</small></div>`).join('')}</div>
  </section>
  <section class="pf-card"><h2>Viloyatlar bo'yicha</h2>
    <div class="hbars">${REGIONS.map((r) => `<div><span>${esc(r.short)}</span><i style="--w:${((reg[r.slug] || 0) / maxReg) * 100}%"></i><b>${reg[r.slug] || 0}</b></div>`).join('')}</div>
  </section>
  <section class="pf-card"><h2>Hamkor havolalari (ref) bo'yicha</h2>
    <p class="muted small">Havola ko'rinishi: <code>https://abuelectric.uz/?ref=nom</code></p>
    <table class="reftable"><thead><tr><th>Manba</th><th>Ro'yxatdan o'tganlar</th></tr></thead>
    <tbody>${refs.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('') || '<tr><td colspan="2" class="muted">Hali yo\'q</td></tr>'}</tbody></table>
  </section>`;
}

function bindPane(pane) {
  const q = pane.querySelector('#q');
  if (q) {
    q.addEventListener('input', () => { filt.q = q.value; const pos = q.selectionStart; draw(); const n = document.getElementById('q'); n.focus(); n.setSelectionRange(pos, pos); });
    pane.querySelector('#fs').addEventListener('change', (e) => { filt.status = e.target.value; draw(); });
    pane.querySelector('#fv').addEventListener('change', (e) => { filt.v = e.target.value; draw(); });
  }
  pane.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { await act(b.dataset.act, b.dataset.id); shell(); } catch (err) { console.error(err); toast(friendlyError(err), true); b.disabled = false; }
  }));
  pane.querySelectorAll('[data-rep]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try { await repAct(b.dataset.rep, b.dataset.id); shell(); } catch (err) { console.error(err); toast(friendlyError(err), true); b.disabled = false; }
  }));
  pane.querySelectorAll('[data-doc]').forEach((b) => b.addEventListener('click', async () => {
    try {
      const s = await fs.getDoc(fs.doc(fs.db, 'verifications', b.dataset.doc));
      if (!s.exists()) return toast('Hujjat topilmadi', true);
      const d = document.getElementById('docView');
      d.querySelector('img').src = s.data().data;
      d.showModal();
    } catch (err) { console.error(err); toast("Hujjatni ochib bo'lmadi", true); }
  }));
}

// ---------- Botga yozganlar (raqam yuborgan, lekin anketani to'ldirmaganlar) ----------
const AE_API = 'https://abu-ustoz-backend.onrender.com/ae';
let leads = null, leadsErr = '';
async function loadLeads() {
  try {
    const u = await currentUser();
    const r = await fetch(AE_API + '/admin/leads', { headers: { Authorization: 'Bearer ' + (await u.getIdToken()) } });
    if (!r.ok) throw new Error(r.status === 403 ? "Bu ro'yxat faqat asosiy admin uchun." : 'Server javob bermadi.');
    leads = (await r.json()).leads || [];
  } catch (err) { leads = []; leadsErr = err.message || 'Xato'; }
  const c = document.getElementById('leadCnt');
  if (c) c.textContent = leads.filter((l) => !isRegistered(l)).length;
  if (tab === 'lead') draw();
}
const isRegistered = (l) => l.registered || all.some((e) => e.id === 'p' + l.phone.replace(/\D/g, ''));
function leadsPane() {
  if (!leads) return '<div class="pf-card"><div class="sk sk-line w60"></div><div class="sk sk-line w80"></div></div>';
  if (leadsErr) return `<div class="state state-error"><b>⚠ ${esc(leadsErr)}</b></div>`;
  const rows = [...leads].sort((a, b) => isRegistered(a) - isRegistered(b) || b.lastAt - a.lastAt);
  if (!rows.length) return '<div class="state"><b>Hali hech kim botga raqam yubormagan</b></div>';
  return `<p class="muted">Botga raqam yuborgan odamlar. Anketani to'ldirmaganlarga qo'ng'iroq qilib, ro'yxatdan o'tishga taklif qilsangiz bo'ladi.</p>
  <div class="admin-list">${rows.map((l) => {
    const reg = isRegistered(l);
    const tg = l.username ? `https://t.me/${encodeURIComponent(l.username)}` : '';
    return `<article class="arow ${reg ? 'st-verified' : ''}">
      <div class="arow-main">
        <b>${esc(l.name || 'Ismsiz')}</b> ${reg ? '<span class="pill pill-verified">Ro'yxatdan o'tgan</span>' : '<span class="pill">Anketa to'ldirilmagan</span>'}
        <div class="muted">${esc(fmtPhone(l.phone))}${l.username ? ' · @' + esc(l.username) : ''}</div>
        <div class="muted small">Oxirgi marta: ${day(l.lastAt)}${l.count > 1 ? ` · ${l.count} marta` : ''}</div>
      </div>
      <div class="arow-act">
        <a class="btn btn-call btn-sm" href="tel:${esc(l.phone)}">📞 Qo'ng'iroq</a>
        ${tg ? `<a class="btn btn-tg btn-sm" href="${tg}" target="_blank" rel="noopener">✈ Yozish</a>` : ''}
        ${reg ? `<a class="btn btn-line btn-sm" href="/usta/?id=p${esc(l.phone.replace(/\D/g, ''))}" target="_blank">Profil</a>` : ''}
      </div>
    </article>`;
  }).join('')}</div>`;
}

async function start() {
  root.innerHTML = '<div class="pf-card"><div class="sk sk-line w40"></div><div class="sk sk-line w80"></div></div>';
  const u = await currentUser();
  if (!u) { location.replace('/kirish/?next=' + encodeURIComponent('/admin/')); return; }
  if (!(await isAdmin(u.uid))) {
    root.innerHTML = `<div class="state"><b>Bu sahifa faqat admin uchun</b>
      <p>Admin qilish uchun Firebase konsolida <code>admins</code> kolleksiyasiga quyidagi ID bilan hujjat qo'shing:</p>
      <code class="uid">${esc(u.uid)}</code><a class="btn btn-line" href="/">Bosh sahifa</a></div>`;
    return;
  }
  fs = await firestore();
  try { await loadAll(); shell(); loadLeads(); }
  catch (err) { console.error(err); root.innerHTML = `<div class="state state-error"><b>⚠ ${esc(friendlyError(err))}</b></div>`; }
}
start();
