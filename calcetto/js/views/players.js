/* Giocatori: scheda, collegamento all'account e modifica da admin. */
import { leagueStats, loadHome, loadLeague, playerStatsOf, refresh } from '../data.js';
import { DB } from '../db.js';
import { POS } from '../model.js';
import { dispName, isAdmin, lm, S } from '../state.js';
import { ADJ, calcOverall, clampOv, OV_MIN } from '../stats.js';
import { avatar, cardHTML, ic, statGrid } from '../ui/components.js';
import { keepScroll, render } from '../ui/render.js';
import { esc, num, q, toast } from '../utils.js';

export function playerView() {
  const mem = lm().members.find(x => x.id === S.modal.id), st = leagueStats(S.league.id)[mem.id], admin = isAdmin(S.league);
  const nick = dispName(mem);
  return `<h2>${esc(nick)}${mem.uid ? '' : '<span class="badge g">SENZA ACCOUNT</span>'}</h2>${nick !== mem.name ? `<p class="mut" style="margin-top:-6px">${esc(mem.name)}</p>` : ''}${cardHTML(mem, st)}${statGrid(st, mem.id)}
   ${admin ? `<button class="btn" style="margin-top:14px" onclick="editPlayer(${q(mem.id)})">${ic('edit')}Modifica giocatore, statistiche e overall</button>` : ''}`;
}

/* ---------- Collegamento giocatore ↔ account ---------- */
window.claim = async (lid, mid) => {
  await loadLeague(lid);
  const m = S.cache[lid].members.find(x => x.id === mid);
  if (!m || m.uid) { toast('Questo giocatore è già stato collegato'); S.modal = { type: 'claimPick', lid }; return render(); }
  if (!confirm(`Collegare “${m.name}” al tuo account? Statistiche e overall diventeranno tuoi.`)) return;
  try { await DB.patchMember(lid, mid, { uid: S.user.uid, guest: false, removed: false, name: S.me.name, card: S.me.card }); }
  catch (e) { console.error(e); toast('Impossibile collegare: riprova'); return; }
  S.modal = null; await loadHome(); toast('Giocatore collegato al tuo account ✅'); S.tab = 'lg'; render();
};
window.createSelf = async lid => {
  try {
    const old = S.cache[lid].members.find(x => x.id === S.user.uid);   /* record di una vecchia iscrizione (rimosso): lo riattiva */
    if (old && !old.uid) await DB.patchMember(lid, old.id, { uid: S.user.uid, guest: false, removed: false, name: S.me.name, card: S.me.card });
    else await DB.setMember(lid, { id: S.user.uid, uid: S.user.uid, name: S.me.name, guest: false, card: S.me.card });
  } catch (e) { console.error(e); return toast('Errore nella creazione'); }
  S.modal = null; await loadHome(); toast('Nuovo giocatore creato ⚽'); S.tab = 'lg'; render();
};
export function claimAskModal(m) {
  const l = S.leagues.find(x => x.id === m.lid);
  return `<h2>Vuoi selezionare un giocatore già esistente?</h2>
  <p class="mut">Nella lega “${esc(l.name)}” l'admin potrebbe aver già registrato le tue partite. Se uno di quei giocatori sei tu, collegalo al tuo account: ti porti dietro statistiche e overall.</p>
  <button class="btn" onclick="goModal('claimPick',${q(m.lid)})">Sì, selezionalo</button>
  <button class="btn sec" onclick="createSelf(${q(m.lid)})">No, crea un nuovo giocatore da zero</button>`;
}
export function claimPickModal(m) {
  const ms =S.cache[m.lid].members.filter(x => !x.uid && (!x.removed || x.formerUid === S.user.uid)), st = leagueStats(m.lid);
  return `<h2>Chi sei?</h2><p class="mut">Scegli il giocatore che sei tu.</p>
  ${ms.map(x => `<div class="pl" onclick="claim(${q(m.lid)},${q(x.id)})">${avatar(x)}<div class="nm"><b>${esc(x.name)}</b><span class="mut">${st[x.id].played} partite · ${st[x.id].goals} gol · ${st[x.id].assists} assist</span></div><div class="ov">${st[x.id].ovr}</div></div>`).join('') || '<p class="mut">Non ci sono giocatori disponibili da collegare.</p>'}
  <br><button class="btn sec" onclick="createSelf(${q(m.lid)})">Nessuno di questi: crea un nuovo giocatore</button>
  <button class="btn sec" onclick="goModal('claimAsk',${q(m.lid)})">‹ Indietro</button>`;
}

/* ---------- Admin: modifica totale di un giocatore ---------- */
window.editPlayer = id => {
  const mem = lm().members.find(x => x.id === id), st = playerStatsOf(id), c = mem.card;
  S.draft = {
    lnick: mem.lnick || '', pos: c.pos || 'ATT', num: c.num || 10,
    wins: st.wins, draws: st.draws, losses: st.losses, goals: st.goals, assists: st.assists, ovr: st.ovr, ovrTouched: false
  };
  S.modal = { type: 'editPlayer', id }; render();
};
/* L'admin decide soprannome di lega, statistiche e overall. Carta (colore, icona, foto) e nome restano del giocatore;
   ruolo e numero li sceglie l'admin solo per chi non ha un account, perché nessun altro potrebbe farlo. */
export function playerEditor() {
  const d = S.draft, l = S.league, mem = lm().members.find(x => x.id === S.modal.id);
  const used = lm().matches.some(m => [...m.A, ...m.B].some(p => p.id === mem.id));
  const nf = (k, lab) => `<div><label>${lab}</label><input type="number" inputmode="numeric" min="0" value="${esc(d[k])}" oninput="ed(${q(k)},this.value)"></div>`;
  const tot = ['wins', 'draws', 'losses'].reduce((t, k) => t + (parseInt(d[k]) || 0), 0);
  const fallback = (mem.card && mem.card.nick) || mem.name;
  return `<h2>Modifica ${esc(dispName(mem))}</h2>
   <p class="mut" style="margin-top:-6px">${esc(mem.name)} · ${mem.uid ? 'registrato con Google' : 'senza account'}</p>
   <label>Soprannome nella lega</label><input maxlength="20" value="${esc(d.lnick)}" placeholder="${esc(fallback)}" oninput="ed('lnick',this.value)">
   <p class="mut" style="margin-top:-6px">Si vede solo in questa lega: classifica, partite, resoconti. Se lo lasci vuoto si usa “${esc(fallback)}”.</p>
   ${mem.uid ? '' : `<div class="row"><div><label>Ruolo</label><select onchange="ed('pos',this.value)">${POS.map(p => `<option ${p === d.pos ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
   <div><label>Numero</label><input type="number" min="1" max="99" value="${esc(d.num)}" oninput="ed('num',this.value)"></div></div>`}
   <h2>Statistiche</h2>
   <div class="demo">I numeri qui sotto sono i <b>totali finali</b>: le partite future si sommeranno a questi.</div>
   <div class="row">${nf('wins', 'Vittorie')}${nf('draws', 'Pareggi')}${nf('losses', 'Sconfitte')}</div>
   <div class="row">${nf('goals', 'Gol')}${nf('assists', 'Assist')}<div><label>Overall (64-99)</label><input type="number" inputmode="numeric" min="64" max="99" value="${esc(d.ovr)}" oninput="ed('ovr',this.value);S.draft.ovrTouched=true"></div></div>
   <p class="mut">Partite totali: <b>${tot}</b> (vittorie + pareggi + sconfitte). Se non tocchi l'overall, si ricalcola da solo con le statistiche; se lo cambi, resta la tua correzione e continua ad aggiornarsi con le prossime partite.</p>
   <button class="btn" onclick="savePlayer()">Salva modifiche</button>
   <button class="btn sec" onclick="resetPlayer()">↺ Ripristina calcolo automatico</button>
   ${mem.uid && !l.admins.includes(mem.uid) ? `<button class="btn sec" onclick="makeAdmin(${q(mem.uid)})">👑 Nomina co-admin</button>` : ''}
   ${mem.uid !== S.user.uid ? `<button class="btn danger" onclick="removePlayer(${q(mem.id)})">🚫 Rimuovi dalla lega</button>
   <p class="mut">${used ? 'Sparisce da classifica e giocatori; le partite già giocate restano nello storico con il suo nome.' : 'Viene eliminato dalla lega.'}${mem.uid ? ' Perde anche l’accesso alla lega.' : ''}</p>` : ''}`;
}
window.ed = (k, v, re) => { S.draft[k] = v; if (re) keepScroll(); };
window.savePlayer = async () => {
  const d = S.draft, lid = S.league.id, mem = lm().members.find(x => x.id === S.modal.id), st = playerStatsOf(mem.id), b = st.base;
  const n = k => Math.max(0, parseInt(d[k]) || 0);
  const adj = {}; for (const k of ADJ) adj[k] = n(k) - (b[k] || 0);
  const s = { wins: n('wins'), draws: n('draws'), losses: n('losses'), goals: n('goals'), assists: n('assists') }; s.played = s.wins + s.draws + s.losses;
  let ovrAdj = mem.ovrAdj || 0;
  if (d.ovrTouched) ovrAdj = clampOv(parseInt(d.ovr) || OV_MIN) - calcOverall(s);
  const patch = { lnick: (d.lnick || '').trim().slice(0, 20), adj, ovrAdj };
  if (!mem.uid) patch.card = { ...mem.card, pos: d.pos, num: Math.max(1, Math.min(99, parseInt(d.num) || 10)) };
  try { await DB.patchMember(lid, mem.id, patch); }
  catch (e) { console.error(e); return toast('Salvataggio non riuscito'); }
  S.modal = null; S.draft = null; await refresh(lid); toast('Giocatore aggiornato ✅'); render();
};
window.resetPlayer = async () => {
  if (!confirm('Annullare tutte le correzioni manuali di statistiche e overall di questo giocatore?')) return;
  const lid = S.league.id, id = S.modal.id, adj = {}; for (const k of ADJ) adj[k] = 0;
  await DB.patchMember(lid, id, { adj, ovrAdj: 0 }); S.modal = null; S.draft = null; await refresh(lid); toast('Ripristinato'); render();
};
window.removePlayer = async id => {
  const lid = S.league.id, mem = lm().members.find(x => x.id === id); if (!mem) return;
  if (mem.uid === S.user.uid) return toast('Non puoi rimuovere te stesso');
  const used = lm().matches.some(m => [...m.A, ...m.B].some(p => p.id === id));
  if (!confirm(`Rimuovere ${mem.name} dalla lega?` + (used ? '\nLe partite già giocate restano nello storico con il suo nome.' : '') + (mem.uid ? '\nPerderà l\'accesso alla lega.' : ''))) return;
  try {
    if (mem.uid) {
      const fresh = await DB.getLeague(lid); if (!fresh) return toast('Lega non trovata');
      const admins = fresh.admins.filter(x => x !== mem.uid); if (!admins.length) return toast('Deve esserci almeno un admin');
      await DB.kick(lid, mem.uid);   /* arrayRemove: non sovrascrive chi entra nello stesso momento */
    }
    if (used) await DB.patchMember(lid, id, { removed: true, uid: null, guest: true, formerUid: mem.uid || null });
    else await DB.delMember(lid, id);
  } catch (e) { console.error(e); return toast('Rimozione non riuscita'); }
  S.modal = null; S.draft = null; await refresh(lid); toast('Giocatore rimosso'); render();
};
