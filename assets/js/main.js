(function () {
  var root = document.documentElement;
  var header = document.querySelector('.header');
  var nav = document.getElementById('nav');
  var menuBtn = document.getElementById('menuBtn');
  var themeBtn = document.getElementById('themeBtn');

  // Header fon — sahifa pastga surilganda
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 24 || nav.classList.contains('open')); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobil menyu
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    onScroll();
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Yorug' / qorong'i mavzu
  themeBtn.addEventListener('click', function () {
    var dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });

  // Paydo bo'lish animatsiyasi
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();

// Hamkor havolasi: abuelectric.uz/?ref=nom — katalogda ro'yxatdan o'tishda hisobga olinadi (ui.js bilan bir xil format)
(function () {
  try {
    var ref = new URLSearchParams(location.search).get('ref');
    if (ref && /^[a-z0-9_-]{2,32}$/i.test(ref)) localStorage.setItem('ae_ref', JSON.stringify({ ref: ref.toLowerCase(), at: Date.now() }));
  } catch (e) {}
})();
