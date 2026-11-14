/* Dettaglio di una partita e testo pronto per WhatsApp. */
import { ovrAround } from '../data.js';
import { dispName, isAdmin, lm, S, teamName } from '../state.js';
import { fmtV, mvpIds, scoreOf } from '../stats.js';
import { teamColor } from '../teams.js';
import { ic, matchMeta, mvpLine, pagelle, scoreboard, tabellino } from '../ui/components.js';
import { render } from '../ui/render.js';
import { esc, num, q, toast } from '../utils.js';

export function matchDetailModal(md) {
  const m = lm().matches.find(x => x.id === md.id); if (!m) return '<p class="mut">Partita non trovata.</p>';
  const r = m.report, admin = isAdmin(S.league), ovr = ovrAround(S.league.id, m.id);
  return `<h2>Resoconto della partita</h2>${matchMeta(m)}${scoreboard(m, true)}${mvpLine(m)}
<h3 class="sub">Tabellino</h3>${tabellino(m)}
${r && r.text ? `<h3 class="sub">La partita</h3><p class="story">${esc(r.text)}</p>` : ''}
${r ? `<h3 class="sub">Pagelle</h3>${pagelle(m, ovr) || '<p class="mut">Nessun voto.</p>'}<div class="mut" style="margin-top:12px">Pubblicato${r.byName ? ' da ' + esc(r.byName) : ''}</div>` : '<p class="mut">Il resoconto non è ancora stato scritto.</p>'}
<div class="actions"><button class="btn sec" onclick="copyWhatsApp(${q(m.id)})">💬 Copia per WhatsApp</button>${navigator.share ? `<button class="btn sec" style="flex:0 1 auto" onclick="shareWhatsApp(${q(m.id)})">${ic('share')}Condividi</button>` : ''}</div>
${admin ? `<div class="actions"><button class="btn" onclick="openReport(${q(m.id)})">${ic('edit')}${r ? 'Modifica resoconto' : 'Scrivi resoconto'}</button><button class="btn sec" onclick="editMatch(${q(m.id)})">${ic('users')}Modifica partita</button>${r ? `<button class="btn danger" style="flex:0" onclick="delReport(${q(m.id)})" aria-label="Elimina resoconto">${ic('trash')}</button>` : ''}</div>` : ''}`;
}
window.openMatch = id => { S.modal = { type: 'matchDetail', id }; render(); };

/* ---------- Testo per WhatsApp, nello stile dei vostri resoconti ---------- */
export function whatsappText(m) {
  const name = id => { const x = lm().members.find(y => y.id === id); return x ? dispName(x) : '?'; };
  const [a, b] = scoreOf(m), r = m.report || {}, rat = r.ratings || {}, mvp = mvpIds(m), ovr = ovrAround(S.league.id, m.id);
  const d = new Date(m.date + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const out = [`⚽ *Il Tabellino*`, `${teamName(m, 'A')} ${a} - ${b} ${teamName(m, 'B')}`, `📅 ${d[0].toUpperCase() + d.slice(1)} · ${m.time}${m.place ? ' · ' + m.place : ''}`];
  if (r.text) out.push('', '*La Partita*', r.text);
  const stats = t => m[t].filter(p => num(p.g) || num(p.a)).sort((x, y) => num(y.g) - num(x.g) || num(y.a) - num(x.a))
    .map(p => `${name(p.id)} (${[num(p.g) ? `${num(p.g)} gol` : '', num(p.a) ? `${num(p.a)} assist` : ''].filter(Boolean).join(', ')})`);
  out.push('', '*Le Statistiche del Match*');
  for (const t of ['A', 'B']) { const s = stats(t); out.push(`${teamName(m, t)}:`, ...(s.length ? s : ['—'])); }
  const res = t => { const my = t === 'A' ? a : b, op = t === 'A' ? b : a; return my > op ? 'I Vincitori' : my < op ? 'Gli Sconfitti' : 'Pareggio'; };
  for (const t of ['A', 'B']) {
    const ps = m[t].filter(p => rat[p.id] && (typeof rat[p.id].v === 'number' || rat[p.id].c))
      .sort((x, y) => (rat[y.id].v ?? -1) - (rat[x.id].v ?? -1));
    if (!ps.length) continue;
    out.push('', `${teamColor(m, t).wa} *TEAM ${teamName(m, t).toUpperCase()}* (${res(t)})`);
    for (const p of ps) {
      const x = rat[p.id], o = ovr[p.id];
      const od = !o ? '' : o.first ? ` [OVR ${o.after} - New Entry]` : ` [OVR ${o.before} ${o.after > o.before ? '↗ ' + o.after : o.after < o.before ? '↘ ' + o.after : '↔'}]`;
      out.push(`- ${name(p.id)}: ${typeof x.v === 'number' ? fmtV(x.v) : 's.v.'}${mvp.includes(p.id) ? ' (MVP)' : ''}${od}${x.c ? ' - ' + x.c : ''}`);
    }
  }
  return out.join('\n');
}
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; }
  catch {   /* browser senza permesso per gli appunti: si usa il vecchio metodo */
    const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { } ta.remove(); return ok;
  }
}
const matchById = id => lm().matches.find(x => x.id === id);
window.copyWhatsApp = async id => { toast(await copyText(whatsappText(matchById(id))) ? 'Copiato: incollalo nel gruppo 💬' : 'Copia non riuscita'); };
window.shareWhatsApp = async id => { try { await navigator.share({ text: whatsappText(matchById(id)) }); } catch { } };
