/* Utility: DOM, escape HTML, id, toast, date. */

/* ---------------- Utility ---------------- */
export const $ = s => document.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/* argomento sicuro dentro onclick="..." (stringa JS + escape HTML) */
export const q = v => esc(JSON.stringify(String(v ?? '')));
export const num = v => { const n = +v; return Number.isFinite(n) ? n : 0; };
export const uid = () => Math.random().toString(36).slice(2, 10);
export const mkCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
export const toast = t => { const e = document.createElement('div'); e.className = 'toast'; e.textContent = t; document.body.appendChild(e); setTimeout(() => e.remove(), 2600); };
export const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const fxTime = f => new Date(f.date + 'T' + (f.time || '00:00')).getTime();
export const isUpcoming = f => fxTime(f) >= Date.now() - 3 * 3600 * 1000;      /* resta "in programma" fino a 3 ore dopo il calcio d'inizio */
export function relDay(f) {
  const a = new Date(f.date + 'T12:00'), t = new Date(); t.setHours(12, 0, 0, 0); const n = Math.round((a - t) / 864e5);
  return n === 0 ? 'Oggi' : n === 1 ? 'Domani' : n > 1 ? `Tra ${n} giorni` : n === -1 ? 'Ieri' : `${-n} giorni fa`;
}

/* immagine scelta dall'utente → quadrato ritagliato al centro, in JPEG leggero (data URL) */
export function squareImage(file, size = 200, quality = .75) {
  return new Promise((ok, ko) => {
    const img = new Image(), r = new FileReader();
    r.onerror = ko;
    r.onload = () => {
      img.onerror = ko;
      img.onload = () => {
        const c = document.createElement('canvas'), sc = Math.max(size / img.width, size / img.height);
        c.width = c.height = size;
        c.getContext('2d').drawImage(img, (size - img.width * sc) / 2, (size - img.height * sc) / 2, img.width * sc, img.height * sc);
        ok(c.toDataURL('image/jpeg', quality));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}
