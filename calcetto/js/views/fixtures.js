/* Partite in programma: sezione Partite e bacheca della lega, con le presenze. */
import { allFixtures, loadHome, refresh } from '../data.js';
import { DB } from '../db.js';
import { byName, dispName, isAdmin, myMember, S } from '../state.js';
import { avatar, empty, ic, paged } from '../ui/components.js';
import { keepScroll, render } from '../ui/render.js';
import { esc, isUpcoming, q, relDay, toast, uid } from '../utils.js';
import { placesList } from './matches.js';

/* ---------- Presenze ----------
   fixture.rsvp = { chiave: 'yes' | 'maybe' | 'no' }; la chiave è l'uid per chi ha un account
   (così ognuno risponde per sé) e l'id del giocatore per chi non ce l'ha (lo segna l'admin). */
export const rkey = m => m.uid || m.id;
const RSVP = { yes: { label: 'Ci sono', icon: 'ok' }, maybe: { label: 'Forse', icon: 'maybe' }, no: { label: 'No', icon: 'x' } };
const activeMembers = lid => (S.cache[lid] ? S.cache[lid].members : []).filter(m => !m.removed);
export function rsvpGroups(f) {
  const r = f.rsvp || {}, g = { yes: [], maybe: [], no: [] };
  for (const m of activeMembers(f.lid).sort(byName)) { const v = r[rkey(m)]; if (g[v]) g[v].push(m); }
  return g;
}
export const presentIds = f => rsvpGroups(f).yes.map(m => m.id);

/* ---------- Scheda di una partita programmata ---------- */
export function fxCard(f, inLeague) {
  const dt = new Date(f.date + 'T12:00'), d = dt.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const me = myMember(f.lid), mine = me && (f.rsvp || {})[rkey(me)], g = rsvpGroups(f), size = +f.size || 10, up = isUpcoming(f);
  const pct = Math.min(100, Math.round(100 * g.yes.length / size));
  const names = k => g[k].length ? `<div class="rs-names"><b>${ic(RSVP[k].icon, 'xs')} ${RSVP[k].label}</b> ${g[k].map(m => esc(dispName(m))).join(', ')}</div>` : '';
  return `<div class="box fx">
   <div class="row sp">${inLeague ? `<span class="tl" style="margin:0">${up ? 'Prossima partita' : 'Da chiudere'}</span>` : `<button class="badge" style="margin:0;flex:0;border:0;cursor:pointer" onclick="enter(${q(f.lid)})">${ic('cup', 'xs')} ${esc(f.lname)}</button>`}<span class="mut" style="text-align:right;font-weight:600">${relDay(f)}</span></div>
   <div class="next" style="background:none;border:0;padding:0;margin-top:12px"><div class="day"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString('it-IT', { month: 'short' })}</span></div>
   <div style="min-width:0"><div class="fxd" style="margin:0 0 2px">${d}</div><div class="mut">${ic('clock', 'sm')} ${esc(f.time)}${f.place ? ` · ${ic('pin', 'sm')} ${esc(f.place)}` : ''}</div></div></div>
   ${f.note ? `<p class="fxn">${esc(f.note)}</p>` : ''}
   ${up ? `<div class="rs">
     <div class="rs-head"><b>${g.yes.length}/${size}</b> presenti${g.maybe.length ? ` · ${g.maybe.length} forse` : ''}${g.no.length ? ` · ${g.no.length} no` : ''}</div>
     <div class="rs-bar"><i style="width:${pct}%"></i></div>
     ${me ? `<div class="rs-btns" role="group" aria-label="La tua presenza">${Object.entries(RSVP).map(([k, x]) => `<button class="${mine === k ? 'on ' + k : ''}" onclick="setRsvp(${q(f.lid)},${q(f.id)},${q(k)})">${ic(x.icon, 'sm')} ${x.label}</button>`).join('')}</div>` : ''}
     ${g.yes.length || g.maybe.length || g.no.length ? `<details class="more"><summary>Chi ha risposto</summary>${names('yes')}${names('maybe')}${names('no')}</details>` : ''}
   </div>` : ''}
   ${f.admin ? `<div class="actions"><button class="btn sm" onclick="playFixture(${q(f.lid)},${q(f.id)})">${ic('users', 'sm')}Inserisci formazioni</button>${up ? `<button class="btn sec sm" style="flex:0 1 auto" onclick="openRsvp(${q(f.lid)},${q(f.id)})">${ic('pitch', 'sm')}Presenze</button>` : ''}<button class="btn sec sm" style="flex:0" onclick="editFixture(${q(f.lid)},${q(f.id)})" aria-label="Modifica">${ic('edit', 'sm')}</button><button class="btn danger sm" style="flex:0" onclick="delFixture(${q(f.lid)},${q(f.id)})" aria-label="Elimina">${ic('trash', 'sm')}</button></div>` : ''}</div>`;
}
/* le partite programmate di una lega, per la bacheca */
export function leagueFixtures(lid) {
  const l = S.leagues.find(x => x.id === lid), admin = isAdmin(l);
  const all = (S.cache[lid].fixtures || []).map(f => ({ ...f, lid, lname: l.name, admin })).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { up: all.filter(isUpcoming), past: admin ? all.filter(f => !isUpcoming(f)).reverse() : [] };
}
export function viewFixtures() {
  const all = allFixtures(), up = all.filter(isUpcoming), past = all.filter(f => !isUpcoming(f) && f.admin).reverse(), canCreate = S.leagues.some(isAdmin);
  const pp = paged('fx-past', past, f => fxCard(f), 6);
  return `<h1>Partite</h1><p class="mut" style="margin-top:-8px">Le partite in programma nelle tue leghe, con la lega che le organizza.</p>
   ${canCreate ? `<div class="actions" style="margin:0 0 18px"><button class="btn" style="flex:0 1 auto" onclick="newFixture()">${ic('plus')}Programma una partita</button></div>` : ''}
   ${up.length ? `<div class="fxgrid">${up.map(f => fxCard(f)).join('')}</div>` : empty(ic('cal'), 'Nessuna partita in programma.' + (canCreate ? '' : ' Quando un admin ne programma una la vedrai qui.'))}
   ${past.length ? `<h2>Passate da chiudere</h2><p class="mut">Programmate e già trascorse: inserisci le formazioni oppure eliminale. Le vedono solo gli admin.</p><div class="fxgrid">${pp.html}</div>${pp.more}` : ''}`;
}

/* ---------- Presenze: la mia risposta e la gestione dell'admin ---------- */
const findFx = (lid, id) => (S.cache[lid].fixtures || []).find(x => x.id === id);
async function saveRsvp(lid, id, key, val) {
  const f = findFx(lid, id); if (!f) return false;
  try { await DB.setRsvp(lid, id, key, val); } catch (e) { console.error(e); toast('Non salvato: hai aggiornato le regole Firebase?'); return false; }
  f.rsvp = { ...(f.rsvp || {}), [key]: val };
  return true;
}
window.setRsvp = async (lid, id, val) => {
  const me = myMember(lid); if (!me) return;
  if (await saveRsvp(lid, id, rkey(me), val)) { toast(val === 'yes' ? 'Ci sei ✅' : val === 'maybe' ? 'Segnato come forse 🤔' : 'Segnato: non ci sei'); render(); }
};
window.openRsvp = (lid, id) => { S.modal = { type: 'rsvp', lid, id }; render(); };
window.adminRsvp = async (lid, id, key, val) => { if (await saveRsvp(lid, id, key, val)) keepScroll(); };
export function rsvpModal(md) {
  const f = findFx(md.lid, md.id); if (!f) return '<p class="mut">Partita non trovata.</p>';
  const r = f.rsvp || {}, g = rsvpGroups({ ...f, lid: md.lid });
  return `<h2>Presenze</h2><p class="mut" style="margin-top:-6px">${new Date(f.date + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })} · ${esc(f.time)} · <b>${g.yes.length}/${+f.size || 10}</b> presenti</p>
   <p class="mut">Chi ha un account risponde da solo; qui puoi segnare anche chi non ce l'ha.</p>
   <div class="list">${activeMembers(md.lid).sort(byName).map(m => {
    const k = rkey(m), v = r[k];
    return `<div class="pl rsrow">${avatar(m)}<div class="nm"><b>${esc(dispName(m))}</b><span class="mut">${m.uid ? 'con account' : 'senza account'}</span></div>
     <div class="rs-btns sm">${Object.entries(RSVP).map(([x, o]) => `<button class="${v === x ? 'on ' + x : ''}" onclick="adminRsvp(${q(md.lid)},${q(md.id)},${q(k)},${q(x)})" aria-label="${o.label}">${ic(o.icon, 'sm')}</button>`).join('')}</div></div>`;
  }).join('')}</div>`;
}

/* ---------- Programmare, modificare, chiudere ---------- */
/* lid: la lega da cui si parte (pulsante dentro la lega); altrimenti la prima lega di cui sono admin */
window.newFixture = lid => {
  const mine = S.leagues.filter(isAdmin); if (!mine.length) return;
  const l = mine.find(x => x.id === lid) || mine[0], last = (S.cache[l.id].matches || [])[0];
  const t = new Date(); t.setDate(t.getDate() + 1);
  S.draft = { id: uid() + uid(), lid: l.id, date: `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`, time: last ? last.time : '21:00', place: last ? last.place || '' : '', note: '', size: last ? last.A.length + last.B.length : 10 };
  S.modal = { type: 'fixture', edit: false }; render();
};
window.editFixture = (lid, id) => {
  const f = findFx(lid, id);
  S.draft = { id, lid, date: f.date, time: f.time, place: f.place || '', note: f.note || '', size: +f.size || 10 }; S.modal = { type: 'fixture', edit: true }; render();
};
export function fixtureForm() {
  const d = S.draft, mine = S.leagues.filter(isAdmin);
  return `<h2>${S.modal.edit ? 'Modifica partita programmata' : 'Programma una partita'}</h2>
   <label>Lega che organizza</label><select ${S.modal.edit ? 'disabled' : ''} onchange="S.draft.lid=this.value">${mine.map(l => `<option value="${esc(l.id)}" ${l.id === d.lid ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select>
   <div class="row"><div><label>Giorno</label><input type="date" value="${esc(d.date)}" oninput="S.draft.date=this.value"></div><div><label>Ora</label><input type="time" value="${esc(d.time)}" oninput="S.draft.time=this.value"></div></div>
   <label>Luogo</label><input value="${esc(d.place)}" list="places" placeholder="Campo / centro sportivo" oninput="S.draft.place=this.value">${placesList(d.lid)}
   <div class="row"><div><label>Giocatori previsti</label><input type="number" inputmode="numeric" min="2" max="30" value="${esc(d.size)}" oninput="S.draft.size=this.value"></div><div style="flex:2"><label>Note (facoltative)</label><input value="${esc(d.note)}" maxlength="140" placeholder="Es. portate le maglie chiare" oninput="S.draft.note=this.value"></div></div>
   <button class="btn" onclick="saveFixture()">Salva</button>`;
}
window.saveFixture = async () => {
  const d = S.draft; if (!d.date || !d.time) return toast('Inserisci giorno e ora');
  const old = S.modal.edit ? findFx(d.lid, d.id) : null;
  const f = { id: d.id, date: d.date, time: d.time, place: d.place.trim(), note: d.note.trim(), size: Math.max(2, Math.min(30, parseInt(d.size) || 10)), rsvp: (old && old.rsvp) || {}, ts: Date.now(), by: S.user.uid };
  try { await DB.saveFixture(d.lid, f); } catch (e) { console.error(e); return toast('Salvataggio non riuscito: hai aggiornato le regole Firebase?'); }
  S.modal = null; S.draft = null; await afterFixtureChange(); toast('Partita programmata 📅'); render();
};
window.delFixture = async (lid, id) => {
  if (!confirm('Eliminare la partita programmata?')) return;
  try { await DB.delFixture(lid, id); } catch (e) { console.error(e); return toast('Eliminazione non riuscita'); }
  await afterFixtureChange(); render();
};
/* dentro una lega ricarica solo quella (e resta lì), altrimenti tutto */
async function afterFixtureChange() { if (S.league) await refresh(S.league.id); else await loadHome(); }
/* apre il modulo partita già compilato: data, ora, luogo e, se ci sono presenze, i presenti già divisi in squadre bilanciate.
   Salvando, la partita programmata sparisce. */
window.playFixture = (lid, id) => {
  const f = findFx(lid, id);
  S.league = S.leagues.find(l => l.id === lid); S.ltab = 'matches';
  newMatch({ date: f.date, time: f.time, place: f.place || '', fx: id, ids: presentIds({ ...f, lid }) });
};
