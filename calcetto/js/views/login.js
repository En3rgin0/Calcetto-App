/* Schermata di accesso. */
import { FIREBASE_CONFIG, KOFI_URL, PRIVACY_URL } from '../config.js';
import { esc } from '../utils.js';

export function viewLogin() {
  return `<div class="login"><div class="login-card">
<div class="logo"><img src="assets/icon-192.png" alt="" width="88" height="88" onerror="this.replaceWith('⚽')"></div>
<h1>Calcetto Club</h1>
<p class="lead">Il registro delle vostre partite: statistiche, carte e overall da 64 a 99.</p>
<div class="box"><b>La tua privacy in breve</b>
  <ul><li>Salviamo nome, email e i dati della tua carta (la foto del profilo Google no).</li>
    <li>Partite, statistiche, voti e commenti li vedono i membri delle tue leghe.</li>
    <li>Niente pubblicità né vendita dei dati.</li>
    <li>Puoi scaricare o far cancellare i tuoi dati quando vuoi.</li></ul></div>
<label class="chk"><input type="checkbox" id="pv" onchange="document.getElementById('lgbtn').disabled=!this.checked"><span>Ho letto e accetto l'<a href="${PRIVACY_URL}" target="_blank" rel="noopener">Informativa sulla privacy</a>.</span></label>
<button class="btn" id="lgbtn" disabled onclick="login()">Accedi con Google</button>
${KOFI_URL ? `<p class="mut"><a class="lnk" href="${esc(KOFI_URL)}" target="_blank" rel="noopener">☕ Sostieni il progetto su Ko-fi</a></p>` : ''}
${FIREBASE_CONFIG ? '' : '<div class="demo">Modalità demo: Firebase non è configurato, i dati restano su questo dispositivo.</div>'}</div></div>`;
}
