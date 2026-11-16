/* Caricamento dei dati delle leghe e statistiche derivate. */
import { DB } from './db.js';
import { norm } from './model.js';
import { byName, isAdmin, lm, myMember, S } from './state.js';
import { ADJ, clampOv, computeStats, emptyStats, finalize, mvpIds, scoreOf } from './stats.js';
import { render } from './ui/render.js';
import { mkCode, q } from './utils.js';

/* Statistiche finali di ogni giocatore della lega =
   calcolo dalle partite + correzioni manuali dell'admin (adj, ovrAdj) */
export function leagueStats(lid) {
  const { members, matches } = S.cache[lid], base = computeStats(matches), out = {}, rs = {}, mv = {};
  for (const mt of matches) {
    for (const id of mvpIds(mt)) mv[id] = (mv[id] || 0) + 1;
    const r = mt.report && mt.report.ratings; if (!r) continue;
    for (const [pid, x] of Object.entries(r)) if (x && typeof x.v === 'number') { const q = rs[pid] || (rs[pid] = { sum: 0, n: 0 }); q.sum += x.v; q.n++; }
  }
  for (const m of members) {
    const b = base[m.id] || emptyStats(), a = m.adj || {}, s = emptyStats();
    for (const k of ADJ) s[k] = Math.max(0, (b[k] || 0) + (+a[k] || 0));
    s.played = s.wins + s.draws + s.losses;
    const f = finalize(s); f.autoOvr = f.ovr; f.ovr = clampOv(f.ovr + (+m.ovrAdj || 0)); f.base = b; const q = rs[m.id] || { sum: 0, n: 0 }; f.rsum = q.sum; f.rn = q.n; f.avg = q.n ? q.sum / q.n : null; f.mvp = mv[m.id] || 0;
    out[m.id] = f;
  }
  return out;
}

export async function loadHome() {
  S.leagues = await DB.leaguesOf(S.user.uid);
  await Promise.all(S.leagues.map(l => loadLeague(l.id)));   /* in parallelo, non una lega alla volta */
  summarize(); checkCodes();
}
export function summarize() {
  const tot = emptyStats(), adjs = []; let rs = 0, rn = 0, mvp = 0;
  for (const l of S.leagues) {
    const m = myMember(l.id); if (!m) continue;
    const st = leagueStats(l.id)[m.id];
    for (const k of ['played', ...ADJ]) tot[k] += st[k];
    adjs.push(m.ovrAdj || 0); rs += st.rsum; rn += st.rn; mvp += st.mvp;
  }
  S.agg = finalize(tot); S.agg.rn = rn; S.agg.avg = rn ? rs / rn : null; S.agg.mvp = mvp;
  if (adjs.length) S.agg.ovr = clampOv(S.agg.ovr + Math.round(adjs.reduce((a, b) => a + b, 0) / adjs.length));
  /* se sono dentro una lega ma non ho ancora un giocatore → chiedi se collegarne uno esistente */
  if (!S.modal) { const p = S.leagues.find(l => !myMember(l.id)); if (p) S.modal = { type: 'claimAsk', lid: p.id }; }
}
export async function loadLeague(id) {
  const [members, matches, fixtures] = await Promise.all([DB.members(id), DB.matches(id), DB.fixtures(id).catch(() => [])]);
  matches.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  S.cache[id] = { members: members.map(norm), matches, fixtures };
}
/* dopo una modifica ricarica solo la lega toccata, non tutte */
export async function refresh(lid) {
  const l = await DB.getLeague(lid).catch(() => null);
  if (l && l.memberIds.includes(S.user.uid)) { await loadLeague(lid); S.leagues = S.leagues.map(x => x.id === lid ? l : x); }
  else { S.leagues = S.leagues.filter(x => x.id !== lid); delete S.cache[lid]; }
  summarize(); S.league = S.leagues.find(x => x.id === lid) || null;
}
export async function freeCode() { for (let i = 0; i < 8; i++) { const c = mkCode(); if (await DB.codeFree(c)) return c; } throw new Error('codice'); }
/* leghe create prima dei codici in codes/: l'admin li registra in automatico (una volta per sessione) */
export const codeChecked = new Set();
export function checkCodes() {
  for (const l of S.leagues) {
    if (!isAdmin(l) || codeChecked.has(l.id)) continue; codeChecked.add(l.id);
    DB.ensureCode(l).then(async ok => { if (ok) return; const c = await freeCode(); await DB.setCode(l.id, c); l.code = c; render(); })
      .catch(e => console.warn('Codice invito non registrato', e));
  }
}

export function ranking() {
  const members = lm().members.filter(m => !m.removed), st = leagueStats(S.league.id);
  return members.map(m => ({ m, s: st[m.id] })).sort((a, b) => b.s.ovr - a.s.ovr || b.s.goals - a.s.goals || byName(a.m, b.m));
}
export function playerStatsOf(id) { return leagueStats(S.league.id)[id]; }

/* ---------- Calendario dei voti ---------- */
export function ratingEntries(refs) {
  const out = [];
  for (const { lid, mid } of refs) {
    const lg = S.leagues.find(l => l.id === lid);
    for (const m of S.cache[lid].matches) {
      const team = m.A.some(p => p.id === mid) ? 'A' : m.B.some(p => p.id === mid) ? 'B' : null; if (!team) continue;
      const [a, b] = scoreOf(m), my = team === 'A' ? a : b, op = team === 'A' ? b : a, x = m.report && m.report.ratings && m.report.ratings[mid];
      out.push({ date: m.date, time: m.time, v: x && typeof x.v === 'number' ? x.v : null, c: x ? x.c || '' : '', lg: lg ? lg.name : '', score: `${a}-${b}`, res: my > op ? 'Vittoria' : my === op ? 'Pareggio' : 'Sconfitta', team, place: m.place || '', mvp: mvpIds(m).includes(mid) });
    }
  }
  return out.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
}

export function allFixtures() {
  const out = [];
  for (const l of S.leagues) for (const f of (S.cache[l.id].fixtures || [])) out.push({ ...f, lid: l.id, lname: l.name, admin: isAdmin(l) });
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ---------- Overall prima → dopo una partita ----------
   Si rifà il calcolo con le partite fino a quella esclusa e poi inclusa (correzioni dell'admin comprese). */
const chrono = (a, b) => (a.date + a.time).localeCompare(b.date + b.time) || (a.ts || 0) - (b.ts || 0);
export function ovrAround(lid, mid) {
  const { members, matches } = S.cache[lid], sorted = [...matches].sort(chrono), i = sorted.findIndex(m => m.id === mid);
  if (i < 0) return {};
  const before = computeStats(sorted.slice(0, i)), after = computeStats(sorted.slice(0, i + 1)), out = {};
  const ovrOf = (st, m) => {
    const b = st[m.id] || emptyStats(), a = m.adj || {}, s = emptyStats();
    for (const k of ADJ) s[k] = Math.max(0, (b[k] || 0) + (+a[k] || 0));
    s.played = s.wins + s.draws + s.losses;
    return { ovr: clampOv(finalize(s).ovr + (+m.ovrAdj || 0)), played: s.played };
  };
  for (const p of [...sorted[i].A, ...sorted[i].B]) {
    const m = members.find(x => x.id === p.id); if (!m) continue;
    const b = ovrOf(before, m), a = ovrOf(after, m);
    out[p.id] = { before: b.ovr, after: a.ovr, first: b.played === 0 };
  }
  return out;
}

/* ---------- Record della lega ---------- */
export function leagueRecords(lid) {
  const { members, matches } = S.cache[lid], st = leagueStats(lid), act = members.filter(m => !m.removed && st[m.id] && st[m.id].played);
  const top = (key, min = 0) => { const c = act.filter(m => (st[m.id][key] ?? -1) > min); if (!c.length) return null; const best = Math.max(...c.map(m => st[m.id][key])); return { val: best, who: c.filter(m => st[m.id][key] === best) }; };
  /* serie di vittorie consecutive più lunga (partite in ordine di data) */
  const sorted = [...matches].sort(chrono), streak = {}, cur = {};
  for (const m of sorted) {
    const [a, b] = scoreOf(m);
    for (const [t, win] of [['A', a > b], ['B', b > a]]) for (const p of m[t]) {
      cur[p.id] = win ? (cur[p.id] || 0) + 1 : 0;
      streak[p.id] = Math.max(streak[p.id] || 0, cur[p.id]);
    }
  }
  const bestStreak = Math.max(0, ...act.map(m => streak[m.id] || 0));
  const goals = m => scoreOf(m).reduce((x, y) => x + y, 0);
  const biggest = matches.length ? [...matches].sort((x, y) => goals(y) - goals(x))[0] : null;
  const rated = act.filter(m => st[m.id].rn >= 3);
  const bestAvg = rated.length ? Math.max(...rated.map(m => st[m.id].avg)) : null;
  return {
    goals: top('goals'), assists: top('assists'), mvp: top('mvp'), played: top('played'),
    avg: bestAvg == null ? null : { val: bestAvg, who: rated.filter(m => st[m.id].avg === bestAvg) },
    streak: bestStreak > 1 ? { val: bestStreak, who: act.filter(m => streak[m.id] === bestStreak) } : null,
    biggest: biggest && goals(biggest) ? biggest : null,
  };
}
