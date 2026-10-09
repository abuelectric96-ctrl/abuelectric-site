// /kabinet/ — elektrikning shaxsiy kabineti.
import { firestore } from '../firebase.js';
import { REGIONS, regionBySlug } from '../data.js';
import { initPage, esc, fmtPhone, fmtRange, friendlyError, fillDistricts } from '../ui.js';
import { currentUser, getMyProfile, signOut } from '../session.js';
import { profileFormHTML, bindProfileForm, readProfileForm, showError } from '../profile-form.js';
import { compressImage, uploadImage, deleteByUrl } from '../media.js';

initPage();

const root = document.getElementById('cabinet');
const params = new URLSearchParams(location.search);
const ms = (v) => (v == null ? 0 : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : new Date(v).getTime());
const H24 = 24 * 3600e3;
const MAX_WORKS = 8;

let fs, user, me, trips = [];

function toast(msg, bad = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

async function save(patch) {
  await fs.updateDoc(fs.doc(fs.db, 'electricians', user.uid), { ...patch, updatedAt: fs.serverTimestamp() });
  Object.assign(me, patch);
}

function statusBox() {
  if (me.status === 'verified') return `<div class="notice ok">✔ <b>Profilingiz tasdiqlangan.</b> Qidiruvda yuqorida chiqasiz.</div>`;
  if (me.status === 'blocked') return `<div class="notice bad">⛔ <b>Profilingiz bloklangan</b> va qidiruvda ko'rinmaydi. Savollar uchun: <a href="https://t.me/abuelectricuz_ooo" target="_blank" rel="noopener">@abuelectricuz_ooo</a></div>`;
  return `<div class="notice">⏳ <b>Profilingiz ko'rib chiqilmoqda.</b> Hozir ham qidiruvda ko'rinasiz, lekin "Tasdiqlangan" belgisi uchun pastda ish rasmi yoki sertifikat yuklang.</div>`;
}

function render() {
  const free = ms(me.availableUntil) > Date.now();
  const hoursLeft = free ? Math.max(1, Math.round((ms(me.availableUntil) - Date.now()) / 3600e3)) : 0;
  const region = regionBySlug(me.viloyat);
  const blocked = me.status === 'blocked';

  root.innerHTML = `
  <div class="cab-head">
    <div><h1>Salom, ${esc(me.name.split(' ')[0])}!</h1><p class="muted">${esc(fmtPhone(me.phone))} · ${esc([me.tuman, region?.short].filter(Boolean).join(', '))}</p></div>
    <a class="btn btn-line btn-sm" href="/usta/?id=${encodeURIComponent(user.uid)}">Profilimni ko'rish ›</a>
  </div>
  ${params.get('yangi') ? `<div class="notice ok">🎉 <b>Ro'yxatdan o'tdingiz!</b> Profilingiz saytda paydo bo'ldi.${params.get('rasm') === '0' ? ' Rasm yuklanmadi, uni pastdagi "Profilni tahrirlash" orqali qayta qo\'shing.' : ''}</div>` : ''}
  ${statusBox()}

  ${blocked ? '' : `
  <section class="pf-card free-card${free ? ' on' : ''}">
    <div>
      <h2>${free ? "🟢 Hozir bo'shsiz" : "Hozir bo'shmisiz?"}</h2>
      <p class="muted">${free ? `Qidiruvda yashil belgi bilan yuqorida chiqyapsiz. Yana ${hoursLeft} soatdan keyin o'zi o'chadi.` : "Yoqsangiz, 24 soat davomida qidiruvda yuqorida va yashil belgi bilan chiqasiz."}</p>
    </div>
    <button class="btn ${free ? 'btn-line' : 'btn-call'} big-toggle" id="freeBtn">${free ? "O'chirish" : "Hozir bo'shman"}</button>
  </section>

  <section class="pf-card">
    <h2>✈ Vaqtincha boraman</h2>
    <p class="muted">Boshqa viloyatga ishga borsangiz, sanalarni kiriting: o'sha yerdagi mijozlar sizni "Vaqtincha mavjud" belgisi bilan ko'radi. Muddat tugagach o'zi yo'qoladi.</p>
    <ul class="trip-list" id="tripList">${trips.length ? trips.map((t) => `<li><b>${esc(regionBySlug(t.viloyat)?.name || '')}${t.tuman ? ', ' + esc(t.tuman) : ''}</b><span>${fmtRange(t.from, t.to)}</span><button class="linkbtn danger" data-del-trip="${esc(t.id)}" aria-label="O'chirish">✕ O'chirish</button></li>`).join('') : '<li class="empty muted">Hozircha safar yo\'q</li>'}</ul>
    <form id="tripForm" class="trip-form" novalidate>
      <div class="row2">
        <div class="field"><label for="tv">Qaysi viloyatga?</label><select id="tv" name="v"><option value="">Tanlang</option>${REGIONS.map((r) => `<option value="${r.slug}">${esc(r.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="tt">Tuman (ixtiyoriy)</label><select id="tt" name="t"></select></div>
      </div>
      <div class="row2">
        <div class="field"><label for="tf">Qachondan</label><input id="tf" name="from" type="date"></div>
        <div class="field"><label for="tto">Qachongacha</label><input id="tto" name="to" type="date"></div>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button class="btn btn-dark btn-block" type="submit">+ Safarni qo'shish</button>
    </form>
  </section>

  <section class="pf-card">
    <div class="pf-card-head"><h2>Ish rasmlari</h2><span class="muted">${(me.works || []).length}/${MAX_WORKS}</span></div>
    <p class="muted">Bajargan ishlaringiz rasmi mijozlar ishonchini oshiradi.</p>
    <div class="works" id="works">
      ${(me.works || []).map((u, i) => `<div class="work"><img src="${esc(u)}" alt="Ish rasmi ${i + 1}" loading="lazy"><button class="work-del" data-del-work="${i}" aria-label="O'chirish">✕</button></div>`).join('')}
      ${(me.works || []).length < MAX_WORKS ? `<label class="work work-add"><input type="file" accept="image/*" multiple hidden id="workInput"><span>＋<br>Rasm qo'shish</span></label>` : ''}
    </div>
  </section>

  ${me.status !== 'verified' ? `
  <section class="pf-card">
    <h2>Tasdiqlash uchun hujjat</h2>
    <p class="muted">Elektrik sertifikati, diplom yoki ish joyidagi guvohnoma rasmini yuklang. Uni faqat admin ko'radi, saytda ko'rsatilmaydi.</p>
    ${me.verifyDocPath ? '<p class="notice ok">✔ Hujjat yuklandi. Admin ko\'rib chiqadi.</p>' : ''}
    <label class="btn btn-line">${me.verifyDocPath ? 'Boshqa hujjat yuklash' : '📄 Hujjat rasmini yuklash'}<input type="file" accept="image/*" hidden id="docInput"></label>
  </section>` : ''}

  <section class="pf-card">
    <details id="editBox"${params.get('tahrir') ? ' open' : ''}>
      <summary><h2>✏ Profilni tahrirlash</h2></summary>
      <form id="editForm" class="pform" novalidate>
        ${profileFormHTML(me)}
        <button class="btn btn-volt btn-block" type="submit">Saqlash</button>
      </form>
    </details>
  </section>`}

  <p class="cab-foot"><button class="linkbtn" id="logout">Chiqish</button> · <span class="muted">ID: ${esc(user.uid)}</span></p>`;

  bind();
}

function bind() {
  document.getElementById('logout').addEventListener('click', async () => { await signOut(); location.href = '/'; });
  if (me.status === 'blocked') return;

  // Hozir bo'shman
  document.getElementById('freeBtn').addEventListener('click', async (e) => {
    const on = !(ms(me.availableUntil) > Date.now());
    e.target.disabled = true;
    try {
      await save({ availableUntil: on ? fs.Timestamp.fromMillis(Date.now() + H24) : null });
      toast(on ? "Yoqildi: 24 soat davomida qidiruvda yuqoridasiz" : "O'chirildi");
      render();
    } catch (err) { console.error(err); toast(friendlyError(err), true); e.target.disabled = false; }
  });

  // Safarlar
  const tf = document.getElementById('tripForm');
  const tv = tf.elements.v, tt = tf.elements.t;
  const today = new Date().toISOString().slice(0, 10);
  tf.elements.from.min = today; tf.elements.to.min = today;
  fillDistricts(tt, '', '');
  tv.addEventListener('change', () => { fillDistricts(tt, tv.value); tt.options[0].textContent = 'Butun viloyat bo\'ylab'; });
  tf.elements.from.addEventListener('change', () => { tf.elements.to.min = tf.elements.from.value || today; });
  tf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = tv.value, t = tt.value, from = tf.elements.from.value, to = tf.elements.to.value;
    if (!v) return showError(tf, 'Qaysi viloyatga borishingizni tanlang.');
    if (!from || !to) return showError(tf, 'Boradigan va qaytadigan sanani tanlang.');
    const a = new Date(from + 'T00:00:00'), b = new Date(to + 'T23:59:00');
    if (b < a) return showError(tf, "Qaytish sanasi borish sanasidan oldin bo'lishi mumkin emas.");
    if (b < new Date()) return showError(tf, "Bu sanalar o'tib ketgan.");
    if ((b - a) / 864e5 > 61) return showError(tf, "Bir safar uzog'i bilan 2 oy bo'lishi mumkin.");
    if (trips.length >= 5) return showError(tf, "Bir vaqtda 5 tagacha safar qo'shish mumkin. Eskisini o'chiring.");
    showError(tf, '');
    const btn = tf.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await fs.addDoc(fs.collection(fs.db, 'trips'), { uid: user.uid, viloyat: v, tuman: t, from: fs.Timestamp.fromDate(a), to: fs.Timestamp.fromDate(b), createdAt: fs.serverTimestamp() });
      toast("Safar qo'shildi");
      await loadTrips(); render();
    } catch (err) { console.error(err); showError(tf, friendlyError(err)); btn.disabled = false; }
  });
  document.querySelectorAll('[data-del-trip]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm("Bu safarni o'chirasizmi?")) return;
    try { await fs.deleteDoc(fs.doc(fs.db, 'trips', b.dataset.delTrip)); await loadTrips(); render(); toast("O'chirildi"); }
    catch (err) { toast(friendlyError(err), true); }
  }));

  // Ish rasmlari
  document.getElementById('workInput')?.addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, MAX_WORKS - (me.works || []).length);
    if (!files.length) return;
    toast(`${files.length} ta rasm yuklanmoqda…`);
    const added = [];
    for (const f of files) {
      try { added.push((await uploadImage(`electricians/${user.uid}/work-${Date.now()}-${added.length}`, await compressImage(f))).url); }
      catch (err) { console.error(err); }
    }
    if (!added.length) return toast("Rasmlarni yuklab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.", true);
    try { await save({ works: [...(me.works || []), ...added] }); toast(`${added.length} ta rasm qo'shildi`); render(); }
    catch (err) { toast(friendlyError(err), true); }
  });
  document.querySelectorAll('[data-del-work]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm("Bu rasmni o'chirasizmi?")) return;
    const i = Number(b.dataset.delWork);
    const url = me.works[i];
    try { await save({ works: me.works.filter((_, j) => j !== i) }); deleteByUrl(url); render(); }
    catch (err) { toast(friendlyError(err), true); }
  }));

  // Tasdiqlash hujjati
  document.getElementById('docInput')?.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    toast('Hujjat yuklanmoqda…');
    try {
      const { path } = await uploadImage(`verification/${user.uid}/doc-${Date.now()}`, await compressImage(f, 1600, 0.82));
      await save({ verifyDocPath: path });
      toast('Hujjat yuklandi. Admin ko\'rib chiqadi.');
      render();
    } catch (err) { console.error(err); toast("Hujjatni yuklab bo'lmadi. Qayta urinib ko'ring.", true); }
  });

  // Profilni tahrirlash
  const form = document.getElementById('editForm');
  const ctl = bindProfileForm(form, me);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { data, error } = readProfileForm(form);
    if (error) return showError(form, error);
    showError(form, '');
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Saqlanmoqda…';
    try {
      if (ctl.getPhoto()) {
        const old = me.photoURL;
        data.photoURL = (await uploadImage(`electricians/${user.uid}/avatar-${Date.now()}`, ctl.getPhoto())).url;
        if (old) deleteByUrl(old);
      }
      await save(data);
      toast('Saqlandi ✓');
      render();
    } catch (err) {
      console.error(err);
      showError(form, friendlyError(err));
      btn.disabled = false; btn.textContent = 'Saqlash';
    }
  });
}

async function loadTrips() {
  const snap = await fs.getDocs(fs.query(fs.collection(fs.db, 'trips'), fs.where('uid', '==', user.uid)));
  trips = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => ms(t.to) >= Date.now()).sort((a, b) => ms(a.from) - ms(b.from));
}

async function start() {
  root.innerHTML = '<div class="pf-card"><div class="sk sk-line w60"></div><div class="sk sk-line w80"></div><div class="sk sk-line w40"></div></div>';
  user = await currentUser();
  if (!user) { location.replace('/kirish/'); return; } // kirgach /kabinet/ ga o'zi qaytadi
  fs = await firestore();
  try {
    me = await getMyProfile(user.uid);
    if (!me) { location.replace('/kirish/'); return; }
    await loadTrips().catch(() => { trips = []; });
    render();
  } catch (err) {
    console.error(err);
    root.innerHTML = `<div class="state state-error"><b>⚠ ${esc(friendlyError(err))}</b><button class="btn btn-line" onclick="location.reload()">Qayta urinish</button></div>`;
  }
}
start();
