/* Le mie leghe: elenco, creazione e ingresso con codice. */
import { codeChecked, freeCode, loadHome } from '../data.js';
import { DB } from '../db.js';
import { isAdmin, myMember, S } from '../state.js';
import { f1 } from '../stats.js';
import { empty, ic, leagueAvatar } from '../ui/components.js';
import { render } from '../ui/render.js';
import { $, esc, q, toast, uid } from '../utils.js';

export function viewLeagues() {
  const cards = S.leagues.map(l => `<div class="pl" onclick="enter(${q(l.id)})">${leagueAvatar(l)}<div class="nm"><b>${esc(l.name)}${isAdmin(l) ? '<span class="badge">ADMIN</span>' : ''}${myMember(l.id) ? '' : '<span class="badge r">DA COMPLETARE</span>'}</b><span class="mut">${S.cache[l.id].members.filter(m => !m.removed).length} giocatori · ${S.cache[l.id].matches.length} partite</span></div>${ic('next', 'chev')}</div>`).join('');
  return `<h1>Le mie leghe</h1>
   <div class="actions" style="margin:0 0 18px"><button class="btn" onclick="openModal('newLeague')">${ic('plus')}Crea lega</button><button class="btn sec" onclick="openModal('join')">${ic('link')}Unisciti con un codice</button></div>
   ${cards ? `<div class="list lgrid">${cards}</div>` : empty(ic('cup'), 'Crea una lega o unisciti con un codice invito.')}`;
}
export function newLeagueModal() {
  return `<h2>Nuova lega</h2><label>Nome</label><input id="f1" placeholder="Es. Calcetto del giovedì"><button class="btn" onclick="createLeague()">Crea</button>`;
}
export function joinModal() {
  return `<h2>Unisciti a una lega</h2><label>Codice invito</label><input id="f1" placeholder="ABC123" style="text-transform:uppercase"><button class="btn" onclick="joinLeague()">Entra</button>`;
}

/* Leghe */
window.createLeague = async () => {
  const name = $('#f1').value.trim(); if (!name) return;
  try {
    const l = { id: uid() + uid(), name: name.slice(0, 40), code: await freeCode(), admins: [S.user.uid], memberIds: [S.user.uid], created: Date.now() };
    await DB.saveLeague(l);
    await DB.setMember(l.id, { id: S.user.uid, uid: S.user.uid, name: S.me.name, guest: false, card: S.me.card });
    codeChecked.add(l.id);
    if (!(await DB.ensureCode(l))) { const c = await freeCode(); await DB.setCode(l.id, c); }
  } catch (e) { console.error(e); return toast('Creazione non riuscita, riprova'); }
  S.modal = null; await loadHome(); toast('Lega creata 🎉'); S.tab = 'lg'; render();
};
window.joinLeague = async () => {
  const code = $('#f1').value.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); if (!code) return;
  if (S.leagues.some(l => l.code === code && myMember(l.id))) return toast('Sei già in questa lega');
  let l;
  try { l = await DB.joinByCode(code, S.user.uid); } catch (e) { console.error(e); return toast('Ingresso non riuscito, riprova'); }
  if (!l) return toast('Codice non valido');
  S.modal = null; S.tab = 'lg'; await loadHome(); render();   /* se non hai ancora un giocatore parte la domanda */
};
