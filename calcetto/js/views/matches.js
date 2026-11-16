/* Partite: inserimento e modifica di formazioni, gol, assist, nomi e colori delle squadre. */
import { leagueStats, refresh } from '../data.js';
import { DB } from '../db.js';
import { newGuest } from '../model.js';
import { byName, dispName, lm, S } from '../state.js';
import { balanceTeams } from '../stats.js';
import { guessColor, TEAM_COLORS, teamColors, tooSimilar } from '../teams.js';
import { ic } from '../ui/components.js';
import { keepScroll, render } from '../ui/render.js';
import { esc, num, q, toast, todayStr, uid } from '../utils.js';

/* ---------- Admin: partite (anche vecchie) ---------- */
/* pre: dati già noti (da una partita programmata): data, ora, luogo, fx = id programmata, ids = presenti */
window.newMatch = pre => {
  pre = (pre && pre.date) ? pre : {};
  const last = lm().matches[0] || {};   /* nomi e colori delle squadre di solito restano gli stessi: si riparte dagli ultimi */
  S.draft = { id: uid() + uid(), date: pre.date || todayStr(), time: pre.time || '21:00', place: pre.place || '', nameA: last.nameA || '', nameB: last.nameB || '', colorA: last.colorA || '', colorB: last.colorB || '', rows: {}, fx: pre.fx || null };
  if (pre.ids && pre.ids.length >= 2) { for (const id of pre.ids) S.draft.rows[id] = { t: 'A', g: 0, a: 0 }; balance(true); }
  S.modal = { type: 'match' }; render();
  if (pre.ids && pre.ids.length >= 2) toast(`${pre.ids.length} presenti divisi in squadre bilanciate ⚖️`);
};
/* elenco dei campi già usati, per suggerirli e scriverli sempre uguali */
export const placesList = (lid = S.league && S.league.id) => `<datalist id="places">${[...new Set(((S.cache[lid] || {}).matches || []).map(m => (m.place || '').trim()).filter(Boolean))].map(p => `<option value="${esc(p)}">`).join('')}</datalist>`;
window.editMatch = id => {
  const m = lm().matches.find(x => x.id === id), rows = {};
  m.A.forEach(p => rows[p.id] = { t: 'A', g: num(p.g), a: num(p.a) }); m.B.forEach(p => rows[p.id] = { t: 'B', g: num(p.g), a: num(p.a) });
  S.draft = { id: m.id, date: m.date, time: m.time, place: m.place, nameA: m.nameA || '', nameB: m.nameB || '', colorA: m.colorA || '', colorB: m.colorB || '', rows }; S.modal = { type: 'match' }; render();
};
window.delMatch = async id => {
  if (!confirm('Eliminare la partita? Le statistiche verranno ricalcolate.')) return;
  const lid = S.league.id; await DB.delMatch(lid, id); S.modal = null; await refresh(lid); toast('Partita eliminata'); render();
};

/* colori: i pallini simili al colore dell'altra squadra sono disattivati */
function colorPicker(t, keys) {
  const other = keys[t === 'A' ? 'B' : 'A'];
  return `<div class="tcolors" role="radiogroup" aria-label="Colore squadra ${t}">${Object.entries(TEAM_COLORS).map(([k, c]) => {
    const off = tooSimilar(k, other), on = keys[t] === k;
    return `<button class="tcol${on ? ' on' : ''}" style="background:${c.dot}" title="${c.label}${off ? ' (troppo simile all’altra squadra)' : ''}" aria-label="${c.label}" ${off ? 'disabled' : ''} onclick="setColor('${t}',${q(k)})"></button>`;
  }).join('')}</div>`;
}
export function matchForm() {
  const d = S.draft, mem = [...lm().members].filter(m => !m.removed || d.rows[m.id]).sort(byName);
  const tc = teamColors(d), ovr = leagueStats(S.league.id);
  const sel = t => Object.entries(d.rows).filter(([, r]) => r.t === t);
  const sc = t => sel(t).reduce((s, [, r]) => s + r.g, 0), cnt = t => sel(t).length, tot = t => sel(t).reduce((s, [id]) => s + ((ovr[id] || {}).ovr || 0), 0);
  const label = t => `<div class="tl" style="color:${tc[t].tx}"><i class="tdot" style="background:${tc[t].dot}"></i>${esc((t === 'A' ? d.nameA : d.nameB) || 'Squadra ' + t)}</div>`;
  const tgBtn = (id, r, t) => `<button class="${r.t === t ? 'on' : ''}" style="${r.t === t ? `background:${tc[t].dot};color:${tc[t].ink}` : ''}" onclick="setT(${q(id)},'${t}')">${t}</button>`;
  return `<h2>${lm().matches.some(x => x.id === d.id) ? 'Modifica partita' : 'Nuova partita'}</h2>
   <div class="row"><div><label>Giorno</label><input type="date" value="${esc(d.date)}" oninput="S.draft.date=this.value"></div><div><label>Ora</label><input type="time" value="${esc(d.time)}" oninput="S.draft.time=this.value"></div></div>
   <label>Luogo</label><input value="${esc(d.place)}" list="places" placeholder="Campo / centro sportivo" oninput="S.draft.place=this.value">${placesList()}
   <div class="row teamsel">
    <div><label>Squadra A</label><input value="${esc(d.nameA)}" maxlength="20" placeholder="Es. Neri" onchange="setTeamName('A',this.value)">${colorPicker('A', tc.keys)}</div>
    <div><label>Squadra B</label><input value="${esc(d.nameB)}" maxlength="20" placeholder="Es. Bianchi" onchange="setTeamName('B',this.value)">${colorPicker('B', tc.keys)}</div>
   </div>
   <div class="box scorebox"><div class="scorebar"><div>${label('A')}<span class="mut">${cnt('A')} gioc. · OVR ${tot('A')}</span></div><b><span style="color:${tc.A.tx}">${sc('A')}</span> <i class="mut">–</i> <span style="color:${tc.B.tx}">${sc('B')}</span></b><div>${label('B')}<span class="mut">${cnt('B')} gioc. · OVR ${tot('B')}</span></div></div><div class="mut" style="text-align:center;margin-top:6px">Il risultato è la somma dei gol inseriti</div></div>
   <div class="row sp" style="margin:6px 0 2px"><label style="margin:0">Formazioni e statistiche</label><button class="btn sec sm" style="flex:0 1 auto" onclick="balance()" ${cnt('A') + cnt('B') < 2 ? 'disabled' : ''}>⚖️ Squadre bilanciate</button></div>
   <p class="mut" style="margin:4px 0 6px">Scegli chi gioca (A o B), poi “Squadre bilanciate” li ridivide in base all'overall.</p>
   ${mem.map(m => {
    const r = d.rows[m.id] || { t: '', g: 0, a: 0 };
    return `<div class="pick"><b style="font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(dispName(m))} <span class="mut">${(ovr[m.id] || {}).ovr || ''}</span>${m.uid ? '' : ' <span class="mut">· no account</span>'}</b>
 <div class="tg">${tgBtn(m.id, r, 'A')}${tgBtn(m.id, r, 'B')}</div>
 ${r.t ? `<div class="st">${ic('goal', 'xs')}<button onclick="stp(${q(m.id)},'g',-1)">−</button><span>${r.g}</span><button onclick="stp(${q(m.id)},'g',1)">+</button></div>
 <div class="st">${ic('assist', 'xs')}<button onclick="stp(${q(m.id)},'a',-1)">−</button><span>${r.a}</span><button onclick="stp(${q(m.id)},'a',1)">+</button></div>` : '<span></span><span></span>'}</div>`;
  }).join('')}
   <br><button class="btn sec" onclick="quickGuest()">${ic('plus')}Nuovo giocatore senza account</button>
   <button class="btn" onclick="saveMatch()">Salva partita</button>`;
}
window.setT = (id, t) => { const r = S.draft.rows[id]; if (r && r.t === t) delete S.draft.rows[id]; else S.draft.rows[id] = { t, g: r ? r.g : 0, a: r ? r.a : 0 }; keepScroll(); };
window.stp = (id, k, v) => { const r = S.draft.rows[id]; r[k] = Math.max(0, r[k] + v); keepScroll(); };
/* il nome suggerisce il colore ("Neri" → nero) se non ne è stato scelto uno compatibile */
window.setTeamName = (t, v) => {
  const d = S.draft; d['name' + t] = v;
  const g = guessColor(v), other = teamColors(d).keys[t === 'A' ? 'B' : 'A'];
  if (g && !tooSimilar(g, other)) d['color' + t] = g;
  keepScroll();
};
window.setColor = (t, k) => { S.draft['color' + t] = k; keepScroll(); };
/* ridivide i giocatori scelti in due squadre con overall simile (gol e assist già inseriti restano) */
function balance(silent) {
  const d = S.draft, ovr = leagueStats(S.league.id), ids = Object.keys(d.rows);
  if (ids.length < 2) return;
  const r = balanceTeams(ids.map(id => ({ id, ovr: (ovr[id] || {}).ovr || 64 })));
  for (const id of r.A) d.rows[id].t = 'A';
  for (const id of r.B) d.rows[id].t = 'B';
  if (!silent) { keepScroll(); toast(`Squadre bilanciate ⚖️ OVR ${r.sumA} – ${r.sumB}`); }
}
window.balance = () => balance(false);
window.quickGuest = async () => {
  const name = (prompt('Nome del giocatore (senza account):') || '').trim(); if (!name) return;
  const m = newGuest(name); await DB.setMember(S.league.id, m); lm().members.push(m); keepScroll();
};
window.saveMatch = async () => {
  const d = S.draft, A = [], B = [];
  for (const [id, r] of Object.entries(d.rows)) (r.t === 'A' ? A : B).push({ id, g: r.g, a: r.a });
  if (!d.date || !d.time) return toast('Inserisci giorno e ora');
  if (!A.length || !B.length) return toast('Servono giocatori in entrambe le squadre');
  const prev = lm().matches.find(x => x.id === d.id), ids = new Set([...A, ...B].map(p => p.id));
  const obj = { id: d.id, date: d.date, time: d.time, place: d.place.trim(), A, B, ts: Date.now() };
  const nA = (d.nameA || '').trim().slice(0, 20), nB = (d.nameB || '').trim().slice(0, 20), tc = teamColors(d).keys;
  if (nA) obj.nameA = nA; if (nB) obj.nameB = nB;
  obj.colorA = tc.A; obj.colorB = tc.B;
  /* se un giocatore esce dalla partita, spariscono anche il suo voto e l'eventuale MVP */
  if (prev && prev.report) obj.report = { ...prev.report, ratings: Object.fromEntries(Object.entries(prev.report.ratings || {}).filter(([id]) => ids.has(id))), mvp: ids.has(prev.report.mvp) ? prev.report.mvp : null };
  await DB.saveMatch(S.league.id, obj);
  if (d.fx) { try { await DB.delFixture(S.league.id, d.fx); } catch (e) { console.error(e); } }
  const lid = S.league.id; S.modal = null; S.draft = null; await refresh(lid);
  if (!prev) { toast('Partita salvata ✅ Ora scrivi il resoconto'); openReport(d.id); }
  else { toast('Partita salvata, statistiche aggiornate ✅'); render(); }
};
