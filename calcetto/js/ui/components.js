/* Pezzi di interfaccia riusati: carta, griglia statistiche, icone, avatar, partita, resoconto. */
import { defCard, safeEmoji, safePhoto, THEMES } from '../model.js';
import { dispName, lm, teamName } from '../state.js';
import { emptyStats, f1, finalize, fmtV, mvpIds, OV_MAX, scoreOf, vClass } from '../stats.js';
import { teamColor } from '../teams.js';
import { esc, num, q } from '../utils.js';

export function cardHTML(m, st) {
  const c = m.card || defCard(m.name), th = THEMES[c.theme] || THEMES.gold, ph = safePhoto(c.photo);
  st = st || finalize(emptyStats());
  return `<div class="fcard" style="background:${th.bg};color:${th.fg}">
<div class="fc-num">#${esc(c.num)}</div>
<div class="fc-top"><div class="fc-ovr">${st.ovr}<small>${esc(c.pos)}</small></div>
<div class="fc-av">${ph ? `<img src="${ph}" alt="">` : `<span>${safeEmoji(c.emoji)}</span>`}</div></div>
<div class="fc-name">${esc(dispName({ ...m, card: c }))}</div>
<div class="fc-stats"><div>${st.played}<span>PRT</span></div><div>${st.goals}<span>GOL</span></div><div>${st.assists}<span>AST</span></div><div>${st.winPct}%<span>VIT</span></div></div></div>`;
}
export function statGrid(st, who) {
  return `<div class="grid">
   <div class="stat"><b>${st.played}</b><span>Partite</span></div>
   <div class="stat"><b>${st.wins}-${st.draws}-${st.losses}</b><span>V-N-P</span></div>
   <div class="stat"><b>${st.winPct}%</b><span>% vittorie</span></div>
   <div class="stat"><b>${st.goals}</b><span>Gol</span></div>
   <div class="stat"><b>${f1(st.gpm)}</b><span>Gol / partita</span></div>
   <div class="stat"><b>${st.assists}</b><span>Assist</span></div>
   <div class="stat"><b>${f1(st.apm)}</b><span>Assist / partita</span></div>
   <div class="stat"><b>${st.ovr}</b><span>Overall</span></div>
   <div class="stat"><b>${st.ovr < OV_MAX ? OV_MAX - st.ovr : 'MAX'}</b><span>Al 99</span></div>
   <div class="stat"><b>${ic('cup', 'xs')} ${st.mvp || 0}</b><span>MVP</span></div>
   <div class="stat"><b>${st.rn || 0}</b><span>Voti ricevuti</span></div>
   <div class="stat tap" onclick="openCal(${q(who)})"><b>⭐ ${st.avg == null ? '–' : f1(st.avg)}</b><span>Media voto ${ic('cal', 'xs')}</span></div></div>`;
}
/* icona SVG dal file assets/icons.svg */
export const ic = (n, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="assets/icons.svg#i-${n}"/></svg>`;
export const empty = (emo, text) => `<div class="empty-state"><b>${emo}</b>${text}</div>`;
/* immagine della lega (se l'admin l'ha caricata) o coppa */
export const leagueAvatar = (l, cls = 'av') => { const ph = safePhoto(l && l.photo); return `<div class="${cls}">${ph ? `<img src="${ph}" alt="">` : ic('cup')}</div>`; };
export function avatar(m) { const c = m.card || {}, ph = safePhoto(c.photo); return `<div class="av">${ph ? `<img src="${ph}" alt="">` : safeEmoji(c.emoji)}</div>`; }

/* ---------- partite ---------- */
const memberName = id => { const x = lm().members.find(y => y.id === id); return x ? dispName(x) : '?'; };
const voteOf = (m, id) => { const x = m.report && m.report.ratings && m.report.ratings[id]; return x && typeof x.v === 'number' ? x.v : null; };
export const voteBadge = v => `<span class="vote vb-${v == null ? 'no' : vClass(v)}">${v == null ? '–' : fmtV(v)}</span>`;

/* data · ora · luogo */
export function matchMeta(m) {
  return `<div class="mh"><span>${ic('cal', 'sm')} ${new Date(m.date + 'T12:00').toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span><span>${ic('clock', 'sm')} ${esc(m.time)}</span><span>${ic('pin', 'sm')} ${esc(m.place || '—')}</span></div>`;
}
/* nomi delle squadre e risultato, con la vincente evidenziata */
/* pallino col colore della squadra e nome della squadra colorato */
export const teamDot = (m, t) => { const c = teamColor(m, t); return `<i class="tdot" style="background:${c.dot}"></i>`; };
export const teamLabel = (m, t, cls = 'tl') => `<div class="${cls}" style="color:${teamColor(m, t).tx}">${teamDot(m, t)}${esc(teamName(m, t))}</div>`;
export function scoreboard(m, big) {
  const [a, b] = scoreOf(m), ca = teamColor(m, 'A'), cb = teamColor(m, 'B');
  return `<div class="sboard${big ? ' big' : ''}">
<div class="tn a${a > b ? ' win' : ''}" style="color:${ca.tx}">${esc(teamName(m, 'A'))}${teamDot(m, 'A')}</div>
<div class="score"><span style="${a > b ? 'color:' + ca.tx : ''}">${a}</span><i>–</i><span style="${b > a ? 'color:' + cb.tx : ''}">${b}</span></div>
<div class="tn b${b > a ? ' win' : ''}" style="color:${cb.tx}">${teamDot(m, 'B')}${esc(teamName(m, 'B'))}</div></div>`;
}
/* lista lunga: mostra i primi `step` elementi e un pulsante per caricarne altri */
export function paged(key, items, render, step = 10) {
  const lim = (window.S.lim && window.S.lim[key]) || step, shown = items.slice(0, lim);
  return { html: shown.map(render).join(''), more: items.length > lim ? `<button class="btn sec more-btn" onclick="showMore(${q(key)},${step})">Mostra altri ${Math.min(step, items.length - lim)} di ${items.length - lim}</button>` : '' };
}
export function matchHead(m) { return matchMeta(m) + scoreboard(m); }
export function mvpLine(m) {
  const ids = mvpIds(m); if (!ids.length) return '';
  const who = ids.map(id => { const v = voteOf(m, id); return `<b>${esc(memberName(id))}</b>${v == null ? '' : ` (${fmtV(v)})`}`; }).join(', ');
  return `<div class="mvp">${ic('cup')}<span>MVP: ${who}</span></div>`;
}
/* marcatori e assist di ogni squadra */
export function tabellino(m) {
  const col = t => {
    const ps = m[t], st = ps.filter(p => num(p.g) || num(p.a)).sort((x, y) => num(y.g) - num(x.g) || num(y.a) - num(x.a));
    const rest = ps.filter(p => !num(p.g) && !num(p.a));
    return `<div>${teamLabel(m, t)}
${st.map(p => `<div class="sc"><span>${esc(memberName(p.id))}</span><span class="mut">${num(p.g) ? `${ic('goal', 'xs')} ${num(p.g)}` : ''}${num(p.g) && num(p.a) ? ' · ' : ''}${num(p.a) ? `${ic('assist', 'xs')} ${num(p.a)}` : ''}</span></div>`).join('')}
${rest.length ? `<div class="mut also">In campo anche: ${rest.map(p => esc(memberName(p.id))).join(', ')}</div>` : ''}</div>`;
  };
  return `<div class="teams">${col('A')}${col('B')}</div>`;
}
/* voto e commento di ogni giocatore, divisi per squadra */
export function pagelle(m, ovr) {
  const r = m.report; if (!r) return '';
  const rat = r.ratings || {}, mvp = mvpIds(m);
  const lines = t => m[t].map(p => {
    const x = rat[p.id]; if (!x || (x.v == null && !x.c)) return '';
    return `<div class="vl">${voteBadge(voteOf(m, p.id))}<div class="cm"><div class="cmh"><b>${esc(memberName(p.id))}</b>${mvp.includes(p.id) ? ' <span class="badge">MVP</span>' : ''}${ovr && ovr[p.id] ? ovrDelta(ovr[p.id]) : ''}</div>${x.c ? `<span class="cmt">${esc(x.c)}</span>` : ''}</div></div>`;
  }).join('');
  const la = lines('A'), lb = lines('B');
  return `${la ? `<div style="margin-top:14px">${teamLabel(m, 'A')}</div>${la}` : ''}${lb ? `<div style="margin-top:14px">${teamLabel(m, 'B')}</div>${lb}` : ''}`;
}
/* overall prima → dopo: 88 ↗ 89 · 82 ↔ · 60 nuovo */
export function ovrDelta(o) {
  if (o.first) return ` <span class="ovd new">OVR ${o.after} · nuovo</span>`;
  const d = o.after - o.before;
  return ` <span class="ovd ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">OVR ${o.before} ${d > 0 ? '↗' : d < 0 ? '↘' : '↔'}${d ? ' ' + o.after : ''}</span>`;
}
/* resoconto completo dentro una scheda (storico) */
export function reportBlock(m) {
  const r = m.report; if (!r) return '';
  return `<div class="rep"><div class="tl">Resoconto ufficiale</div>${r.text ? `<p>${esc(r.text)}</p>` : ''}${mvpLine(m)}${pagelle(m)}
<div class="mut" style="margin-top:10px">Pubblicato${r.byName ? ' da ' + esc(r.byName) : ''}</div></div>`;
}
