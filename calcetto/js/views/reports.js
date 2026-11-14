/* Resoconto ufficiale con voti, commenti e MVP (solo admin). */
import { refresh } from '../data.js';
import { DB } from '../db.js';
import { dispName, lm, S, teamName } from '../state.js';
import { fmtV, mvpIds, scoreOf, stepVote, VOTES } from '../stats.js';
import { keepScroll, render } from '../ui/render.js';
import { esc, q, toast } from '../utils.js';
import { ic } from '../ui/components.js';

window.openReport = mid => {
  const m = lm().matches.find(x => x.id === mid), r = m.report, ratings = {};
  for (const p of [...m.A, ...m.B]) { const x = r && r.ratings && r.ratings[p.id]; ratings[p.id] = { v: x && typeof x.v === 'number' ? x.v : null, c: x ? x.c || '' : '' }; }
  S.draft = { mid, text: r ? r.text || '' : '', ratings, mvp: (r && r.mvp) || '' }; S.modal = { type: 'report', mid }; render();
};
export function reportForm() {
  const m = lm().matches.find(x => x.id === S.modal.mid), d = S.draft, mem = lm().members, [a, b] = scoreOf(m);
  const name = id => { const x = mem.find(y => y.id === id); return x ? dispName(x) : null; };
  /* voto: − / tendina con tutti i voti (10, 10-, 9,5, 9+, 9 …) / + */
  const row = p => {
    const n = name(p.id); if (!n) return ''; const r = d.ratings[p.id];
    return `<div class="rp"><div class="top"><b>${esc(n)}</b><div class="stv">
  <button onclick="rv(${q(p.id)},-1)" aria-label="Abbassa voto">−</button>
  <select aria-label="Voto di ${esc(n)}" onchange="rvSet(${q(p.id)},this.value)"><option value="">–</option>${VOTES.map(v => `<option value="${v}" ${r.v === v ? 'selected' : ''}>${fmtV(v)}</option>`).join('')}</select>
  <button onclick="rv(${q(p.id)},1)" aria-label="Alza voto">+</button></div></div>
  <input placeholder="Commento su ${esc(n)}…" value="${esc(r.c)}" oninput="S.draft.ratings[${q(p.id)}].c=this.value"></div>`;
  };
  /* MVP: scelto dall'admin; se resta su "automatico" vince il voto più alto */
  const auto = mvpIds({ ...m, report: { ratings: d.ratings } }).map(name).filter(Boolean);
  const opt = t => `<optgroup label="${esc(teamName(m, t))}">${m[t].map(p => name(p.id) ? `<option value="${esc(p.id)}" ${d.mvp === p.id ? 'selected' : ''}>${esc(name(p.id))}</option>` : '').join('')}</optgroup>`;
  return `<h2>${m.report ? 'Modifica resoconto' : 'Resoconto della partita'}</h2>
   <p class="mut">${new Date(m.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} · ${esc(teamName(m, 'A'))} ${a} – ${b} ${esc(teamName(m, 'B'))}</p>
   <label>Com'è andata</label><textarea placeholder="Racconta la partita…" oninput="S.draft.text=this.value">${esc(d.text)}</textarea>
   <label>${ic('cup', 'xs')} MVP della partita</label><select onchange="S.draft.mvp=this.value;keepScroll()"><option value="">Automatico: voto più alto${auto.length ? ` (${esc(auto.join(', '))})` : ''}</option>${opt('A')}${opt('B')}</select>
   <label>Voti e commenti · ${esc(teamName(m, 'A'))}</label>${m.A.map(row).join('')}
   <label style="display:block;margin-top:14px">Voti e commenti · ${esc(teamName(m, 'B'))}</label>${m.B.map(row).join('')}
   <p class="mut">Voti da 1 a 10 con mezzi voti, + e −: 6- vale 5,75, 6+ vale 6,25. Entrano nella media voto di ogni giocatore. Un giocatore può restare senza voto.</p>
   <button class="btn" onclick="saveReport()">📣 Pubblica in bacheca</button>`;
}
window.rv = (id, dir) => { const r = S.draft.ratings[id]; r.v = stepVote(r.v, dir); keepScroll(); };
/* accetta solo i voti della pagella (1 … 10 a quarti), qualsiasi altro valore diventa "nessun voto" */
window.rvSet = (id, v) => { S.draft.ratings[id].v = VOTES.includes(+v) ? +v : null; keepScroll(); };
window.keepScroll = keepScroll;
window.saveReport = async () => {
  const lid = S.league.id, m = lm().matches.find(x => x.id === S.modal.mid), d = S.draft, ratings = {};
  for (const [id, r] of Object.entries(d.ratings)) { const c = (r.c || '').trim(); if (r.v != null || c) ratings[id] = { v: r.v == null ? null : r.v, c }; }
  const text = (d.text || '').trim();
  if (!text && !Object.keys(ratings).length && !d.mvp) return toast('Scrivi il resoconto o dai almeno un voto');
  const old = m.report || {}, report = { text, ratings, mvp: d.mvp || null, ts: old.ts || Date.now(), by: old.by || S.user.uid, byName: old.byName || S.me.name };
  try { await DB.saveMatch(lid, { ...m, report }); } catch (e) { console.error(e); return toast('Pubblicazione non riuscita'); }
  S.modal = null; S.draft = null; await refresh(lid); S.ltab = 'board'; toast('Resoconto pubblicato 📣');
  S.modal = { type: 'matchDetail', id: m.id }; render();
};
window.delReport = async mid => {
  if (!confirm('Eliminare il resoconto (testo, voti e commenti)?')) return;
  const lid = S.league.id, m = lm().matches.find(x => x.id === mid), { report, ...rest } = m;
  await DB.saveMatch(lid, rest); S.modal = null; await refresh(lid); toast('Resoconto eliminato'); render();
};
