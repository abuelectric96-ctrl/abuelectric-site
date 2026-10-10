// Barcha brauzer JS fayllarini ES modul sifatida sintaksis tekshiruvidan o'tkazadi (node --check ESM'da xatoni o'tkazib yuborishi mumkin).
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
const dirs = ['assets/js', 'assets/js/pages'];
let bad = 0;
for (const d of dirs) for (const f of readdirSync(d).filter((x) => x.endsWith('.js'))) {
  const p = join(d, f);
  try { new vm.SourceTextModule(readFileSync(p, 'utf8'), { identifier: p }); }
  catch (e) { bad++; console.log('✗', p, '—', e.message); }
}
try { new vm.Script(readFileSync('sw.js', 'utf8')); } catch (e) { bad++; console.log('✗ sw.js —', e.message); }
console.log(bad ? `${bad} ta faylda xato` : 'Hamma JS fayllar toza ✓');
process.exit(bad ? 1 : 0);
