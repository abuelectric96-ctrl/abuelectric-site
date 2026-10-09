// Rasmlarni brauzerda siqish va Firestore'da saqlash uchun data-URL ga aylantirish.
// (Firebase Storage pullik tarifda — hozircha rasmlar kichik hajmda bazaning o'zida saqlanadi.)

// Telefon kamerasidagi 4–8 MB rasm → bir necha o'n KB WebP (WebP ishlamasa JPEG)
export async function compressImage(file, maxSide = 1024, quality = 0.72) {
  // iPhone (HEIC) va ba'zi ilova ichidagi brauzerlarda file.type bo'sh keladi — shunday fayllarni ham ochib ko'ramiz
  if (file.type && !file.type.startsWith('image/')) throw Object.assign(new Error('not-image'), { code: 'media/not-image' });
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff'; // shaffof PNG → JPEG bo'lganda qora fon chiqmasin
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return blob;
}

// Profil rasmi (kartochka va profil uchun) — juda kichik, qidiruv tez ochilishi uchun
export const compressAvatar = (file) => compressImage(file, 112, 0.7);

// Ish rasmi yoki hujjat: bazadagi bitta yozuv 1 MB dan oshmasligi uchun hajmni nazorat qiladi
export async function compressForDb(file, maxBytes = 280000) {
  for (const [side, q] of [[1024, 0.72], [880, 0.66], [720, 0.6], [560, 0.55]]) {
    const blob = await compressImage(file, side, q);
    if (blob.size * 1.37 < maxBytes) return blob;
  }
  throw Object.assign(new Error('too-big'), { code: 'media/too-big' });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => loadViaImg(file));
  }
  return loadViaImg(file);
}

function loadViaImg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(img.src); resolve(img); };
    img.onerror = () => reject(Object.assign(new Error('bad-image'), { code: 'media/bad-image' }));
    img.src = URL.createObjectURL(file);
  });
}
