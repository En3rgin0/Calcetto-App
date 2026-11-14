/* Accesso con Google (o demo), uscita e accettazione dell'informativa. */
import { FIREBASE_CONFIG, PRIVACY_URL, PRIVACY_V } from './config.js';
import { loadHome } from './data.js';
import { DB, fb, initFirebase } from './db.js';
import { defCard } from './model.js';
import { S } from './state.js';
import { render } from './ui/render.js';
import { $, toast, uid } from './utils.js';

/* ---------------- Auth ---------------- */
export async function boot() {
  if (FIREBASE_CONFIG) {
    await initFirebase();
    fb.auth.onAuthStateChanged(fb.au, async u => {
      if (u) await afterLogin({ uid: u.uid, name: u.displayName || 'Giocatore', email: u.email, photo: u.photoURL });
      else { S.user = null; S.ready = true; render(); }
    });
  } else {
    const s = localStorage.getItem('cc_session');
    if (s) await afterLogin(JSON.parse(s)); else { S.ready = true; render(); }
  }
}
window.login = async () => {
  const cb = $('#pv'); if (cb && !cb.checked) return toast("Per continuare accetta l'informativa sulla privacy");
  try { sessionStorage.setItem('cc_pv', '1'); } catch { }
  if (FIREBASE_CONFIG) {
    try { await fb.auth.signInWithPopup(fb.au, new fb.auth.GoogleAuthProvider()); }
    catch (e) { if (String(e.code).includes('popup')) await fb.auth.signInWithRedirect(fb.au, new fb.auth.GoogleAuthProvider()); else toast('Login non riuscito'); }
  } else {
    const name = prompt('Modalità demo: come ti chiami?'); if (!name) return;
    const u = { uid: 'u_' + name.toLowerCase().replace(/\W+/g, '') + uid().slice(0, 3), name, email: name + '@demo.local' };
    localStorage.setItem('cc_session', JSON.stringify(u)); await afterLogin(u);
  }
};
window.logout = async () => {
  if (FIREBASE_CONFIG) await fb.auth.signOut(fb.au); else localStorage.removeItem('cc_session');
  Object.assign(S, { user: null, me: null, leagues: [], cache: {}, league: null, tab: 'me', modal: null }); render();
};
export async function afterLogin(u) {
  S.user = u;
  let me = await DB.getUser(u.uid);
  if (!me) { me = { uid: u.uid, name: u.name, email: u.email, card: defCard(u.name) }; await DB.setUser(u.uid, me); }
  let acc = false; try { acc = sessionStorage.getItem('cc_pv') === '1'; sessionStorage.removeItem('cc_pv'); } catch { }
  if ((!me.privacy || me.privacy.v !== PRIVACY_V) && acc) { me.privacy = { v: PRIVACY_V, ts: Date.now() }; await DB.setUser(u.uid, { privacy: me.privacy }); }
  S.me = me; await loadHome();
  if (!me.privacy || me.privacy.v !== PRIVACY_V) S.modal = { type: 'privacy' };
  S.ready = true; render();
}
window.acceptPrivacy = async () => {
  const privacy = { v: PRIVACY_V, ts: Date.now() };
  try { await DB.setUser(S.user.uid, { privacy }); } catch (e) { console.error(e); return toast('Errore, riprova'); }
  S.me.privacy = privacy; S.modal = null; await loadHome(); render();
};

export function privacyModal() {
  return `<h2>Informativa sulla privacy</h2>
<p class="mut">${S.me.privacy ? 'Abbiamo aggiornato l\'informativa sulla privacy.' : 'Prima di continuare leggi e accetta l\'informativa sulla privacy.'} In breve: salviamo nome, email e i dati della tua carta; partite, statistiche, voti e commenti li vedono i membri delle tue leghe; niente pubblicità né vendita dei dati; puoi scaricare o far cancellare i tuoi dati.</p>
<p><a class="lnk" href="${PRIVACY_URL}" target="_blank" rel="noopener">Leggi l'informativa completa</a></p>
<button class="btn" onclick="acceptPrivacy()">Ho letto e accetto</button>
<button class="btn danger" onclick="logout()">Non accetto, esci</button>`;
}
