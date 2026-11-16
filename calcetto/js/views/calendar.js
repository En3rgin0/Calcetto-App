/* Calendario dei voti. */
import { ratingEntries } from '../data.js';
import { dispName, lm, myMember, S } from '../state.js';
import { f1, fmtV, vClass } from '../stats.js';
import { empty } from '../ui/components.js';
import { keepScroll, render } from '../ui/render.js';
import { esc, q, todayStr } from '../utils.js';
import { ic } from '../ui/components.js';

window.openCal = who => {
  let refs, title;
  if (who === 'me') { refs = S.leagues.map(l => ({ lid: l.id, mid: (myMember(l.id) || {}).id })).filter(r => r.mid); title = 'I miei voti'; }
  else { refs = [{ lid: S.league.id, mid: who }]; title = 'Voti di ' + dispName(lm().members.find(x => x.id === who)); }
  const entries = ratingEntries(refs), last = entries.length ? entries[entries.length - 1].date : todayStr(), [y, mo] = last.split('-').map(Number);
  S.modal = { type: 'cal', entries, ym: { y, mo: mo - 1 }, sel: null, prev: S.modal, title }; render();
};
window.calBack = () => { S.modal = S.modal.prev; render(); };
window.calSel = k => { S.modal.sel = S.modal.sel === k ? null : k; keepScroll(); };
window.calNav = d => { let { y, mo } = S.modal.ym; mo += d; if (mo < 0) { mo = 11; y-- } if (mo > 11) { mo = 0; y++ } S.modal.ym = { y, mo }; S.modal.sel = null; keepScroll(); };
export function calView() {
  const m = S.modal, { y, mo } = m.ym, byDay = {};
  m.entries.forEach(e => (byDay[e.date] = byDay[e.date] || []).push(e));
  const avgOf = a => a.length ? a.reduce((p, q) => p + q, 0) / a.length : null;
  const vs = m.entries.filter(e => e.v != null).map(e => e.v), avg = avgOf(vs);
  const start = (new Date(y, mo, 1).getDay() + 6) % 7, days = new Date(y, mo + 1, 0).getDate();
  let cells = ['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(x => `<div class="dw">${x}</div>`).join('');
  for (let i = 0; i < start; i++) cells += '<div class="cd empty"></div>';
  for (let d = 1; d <= days; d++) {
    const key = `${y}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, es = byDay[key];
    let inner = `<span class="dn">${d}</span>`;
    if (es) { const a = avgOf(es.filter(e => e.v != null).map(e => e.v)); inner += a == null ? '<span class="cv v-no">–</span>' : `<span class="cv v-${vClass(a)}">${fmtV(a)}</span>`; if (es.some(e => e.mvp)) inner += `<span class="mv">${ic('cup', 'xs')}</span>`; }
    cells += `<div class="cd${es ? ' has' : ''}${m.sel === key ? ' sel' : ''}"${es ? ` onclick="calSel(${q(key)})"` : ''}>${inner}</div>`;
  }
  const det = (byDay[m.sel] || []).map(e => `<div class="box"><b>${e.v == null ? 'Nessun voto' : 'Voto ' + fmtV(e.v)}</b>${e.mvp ? ` · ${ic('cup', 'xs')} MVP` : ''} · ${e.res} ${e.score}<div class="mut">${esc(e.lg)}${e.place ? ' · ' + esc(e.place) : ''} · Squadra ${e.team}</div>${e.c ? `<div style="margin-top:6px">“${esc(e.c)}”</div>` : ''}</div>`).join('');
  return `<h2>${esc(m.title)}</h2>
   <div class="grid" style="grid-template-columns:repeat(4,1fr)"><div class="stat"><b>${avg == null ? '–' : f1(avg)}</b><span>Media</span></div><div class="stat"><b>${vs.length}</b><span>Voti</span></div><div class="stat"><b>${vs.length ? fmtV(Math.max(...vs)) : '–'}</b><span>Migliore</span></div><div class="stat"><b>${ic('cup', 'xs')} ${m.entries.filter(e => e.mvp).length}</b><span>MVP</span></div></div>
   <div class="calh"><button onclick="calNav(-1)">‹</button><b>${new Date(y, mo, 1).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}</b><button onclick="calNav(1)">›</button></div>
   <div class="cal">${cells}</div>
   <p class="mut">${m.entries.length ? 'Sotto il giorno di ogni calcetto c\'è il voto preso. Tocca un giorno per leggere il commento.' : 'Nessun calcetto giocato finora.'}</p>${det}`;
}
