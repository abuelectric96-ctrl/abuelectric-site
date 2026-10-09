// Rasmlarni brauzerda siqish va Firebase Storage'ga yuklash.
import { storage } from './firebase.js';

// Telefon kamerasidagi 4–8 MB rasm → ~100–250 KB WebP (WebP ishlamasa JPEG)
export async function compressImage(file, maxSide = 1280, quality = 0.78) {
  if (!file.type.startsWith('image/')) throw Object.assign(new Error('not-image'), { code: 'media/not-image' });
  const bmp = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
  let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality));
  if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return blob;
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

// Yuklaydi va ochiq havolani qaytaradi
export async function uploadImage(path, blob) {
  const st = await storage();
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const ref = st.ref(st.storage, `${path}.${ext}`);
  await st.uploadBytes(ref, blob, { contentType: blob.type, cacheControl: 'public, max-age=31536000' });
  return { url: await st.getDownloadURL(ref), path: ref.fullPath };
}

export async function deleteByUrl(url) {
  const st = await storage();
  try { await st.deleteObject(st.ref(st.storage, url)); } catch {}
}
