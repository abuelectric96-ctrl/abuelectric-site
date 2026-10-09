// Qidiruv sahifasi, 14 ta viloyat sahifasi va sitemap.xml ni yaratadi.
// Ishga tushirish: node tools/build-pages.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { REGIONS, SERVICES } from '../assets/js/data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://abuelectric.uz';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function page({ path, title, description, h1, intro, bodyAttr = '', extra = '' }) {
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#0b1526">
<link rel="canonical" href="${SITE}${path}">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/assets/img/app-192.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/img/app-180.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="AbuElectric">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/assets/img/og-katalog.png">
<meta property="og:locale" content="uz_UZ">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap">
<link rel="stylesheet" href="/assets/css/app.css?v=2">
</head>
<body${bodyAttr}>
<header class="top">
  <div class="wrap">
    <a class="logo" href="/" aria-label="AbuElectric bosh sahifa"><i><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M13.2 2.5 4.8 13.2c-.4.5 0 1.3.6 1.3H11l-1.2 7c-.1.7.8 1.1 1.3.5l8.4-10.7c.4-.5 0-1.3-.6-1.3H13l1.2-7c.1-.7-.8-1.1-1.3-.5Z"/></svg></i><b>Abu<span>Electric</span></b></a>
    <button class="menu-btn" id="menuBtn" aria-label="Menyu" aria-expanded="false" aria-controls="nav">☰</button>
    <nav class="nav" id="nav">
      <a href="/qidiruv/">Elektrik topish</a>
      <a href="/kabinet/">Kabinet</a>
      <a class="cta" href="/kirish/">Usta bo'lib qo'shilish</a>
    </nav>
  </div>
</header>
<main class="wrap">
  <form class="search-card search-compact" id="searchForm" role="search">
    <div class="search-grid">
      <div class="field"><label for="v">Viloyat</label><select id="v" name="v"></select></div>
      <div class="field"><label for="t">Tuman</label><select id="t" name="t"></select></div>
      <div class="field"><label for="x">Xizmat turi</label><select id="x" name="x"></select></div>
      <button class="btn btn-volt" type="submit">🔍 Qidirish</button>
    </div>
    <label class="toggle"><input type="checkbox" name="bosh"><span class="sw"></span>Faqat hozir bo'sh ustalar</label>
  </form>
  <div class="results-head">
    <h1 id="title">${esc(h1)}</h1>
    <span class="muted" id="count"></span>
  </div>
  ${intro ? `<p class="muted" style="margin:-6px 0 16px">${esc(intro)}</p>` : ''}
  <div class="list" id="results" aria-live="polite"></div>
  ${extra}
</main>
<footer class="foot">
  <div class="wrap">
    <span>© 2026 AbuElectric · ABUELECTRIC MCHJ</span>
    <nav>
      <a href="/biz-haqimizda/">Biz haqimizda</a>
      <a href="/kirish/">Ustalar uchun</a>
      <a href="https://t.me/abuelectricuz_ooo" target="_blank" rel="noopener">Telegram</a>
    </nav>
  </div>
</footer>
<script type="module" src="/assets/js/pages/search.js?v=1"></script>
</body>
</html>
`;
}

function write(rel, html) {
  const file = join(ROOT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

// Qidiruv sahifasi
write('qidiruv/index.html', page({
  path: '/qidiruv/',
  title: "Elektrik qidirish — O'zbekiston bo'ylab ustalar | AbuElectric",
  description: "Viloyat, tuman va xizmat turi bo'yicha elektrik toping. Hozir bo'sh ustalar va vaqtincha shahringizga kelayotgan elektriklar.",
  h1: 'Elektriklar',
}));

// Viloyat sahifalari
const serviceList = SERVICES.filter((s) => s.key !== 'boshqa').map((s) => s.name.toLowerCase()).join(', ');
for (const r of REGIONS) {
  const districts = r.districts.join(', ');
  write(`viloyat/${r.slug}/index.html`, page({
    path: `/viloyat/${r.slug}/`,
    title: `${r.name} elektriklari — usta toping | AbuElectric`,
    description: `${r.name}da elektrik kerakmi? ${serviceList} bo'yicha ustalar. Hozir bo'sh elektriklar va to'g'ridan-to'g'ri qo'ng'iroq.`,
    h1: `${r.name} elektriklari`,
    intro: `${r.name}dagi ustalar: ${serviceList}. Tumanni tanlab qidiruvni aniqlashtiring.`,
    bodyAttr: ` data-v="${r.slug}"`,
    extra: `<section class="section"><div class="section-head"><h2>${esc(r.name)} tumanlari</h2></div>
  <div class="regions">${r.districts.map((d) => `<a href="/qidiruv/?v=${r.slug}&amp;t=${encodeURIComponent(d)}">${esc(d)}</a>`).join('')}</div></section>
  <p class="muted" style="margin-top:20px;font-size:15px">Hududlar: ${esc(districts)}.</p>`,
  }));
}

// sitemap.xml (ustalar profillari keyingi bosqichda qo'shiladi)
const urls = ['/', '/qidiruv/', '/kirish/', '/biz-haqimizda/', '/privacy-policy.html', ...REGIONS.map((r) => `/viloyat/${r.slug}/`)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);

console.log(`Tayyor: qidiruv + ${REGIONS.length} viloyat sahifasi + sitemap (${urls.length} manzil)`);
