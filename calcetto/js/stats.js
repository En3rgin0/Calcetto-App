/* Statistiche e overall (64 → 99): calcoli puri, senza stato. */

/* ---------------- Statistiche e overall ---------------- */
export const OV_MIN = 64, OV_MAX = 99;
export const clampOv = x => Math.max(OV_MIN, Math.min(OV_MAX, x));
export function calcOverall(s) {
  const n = s.played; if (!n) return OV_MIN;
  const perf = 0.35 * ((s.wins + 0.5 * s.draws) / n)
    + 0.35 * Math.min(s.goals / n / 2, 1)
    + 0.30 * Math.min(s.assists / n / 1.2, 1);
  const f = 0.8 * perf * Math.min(1, n / 10) + 0.2 * Math.min(n / 40, 1);
  return clampOv(Math.round(OV_MIN + (OV_MAX - OV_MIN) * f));
}
export const ADJ = ['wins', 'draws', 'losses', 'goals', 'assists'];
export const emptyStats = () => ({ played: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0 });
export function computeStats(matches) {
  const out = {}; const get = id => out[id] || (out[id] = emptyStats());
  for (const m of matches) {
    const sa = m.A.reduce((t, p) => t + (+p.g || 0), 0), sb = m.B.reduce((t, p) => t + (+p.g || 0), 0);
    for (const [team, my, op] of [[m.A, sa, sb], [m.B, sb, sa]]) {
      for (const p of team) {
        const s = get(p.id); s.played++; s.goals += +p.g || 0; s.assists += +p.a || 0;
        if (my > op) s.wins++; else if (my === op) s.draws++; else s.losses++;
      }
    }
  }
  return out;
}
export const finalize = s => ({
  ...s, winPct: s.played ? Math.round(100 * s.wins / s.played) : 0,
  gpm: s.played ? s.goals / s.played : 0, apm: s.played ? s.assists / s.played : 0, ovr: calcOverall(s)
});
/* un decimale, con la virgola: 7,4 */
export const f1 = x => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
/* MVP della partita: quello scelto dall'admin nel resoconto (report.mvp);
   se non l'ha scelto, chi ha preso il voto più alto (anche più giocatori a pari merito). */
export function mvpIds(m) {
  const rep = m.report; if (!rep) return [];
  const ids = [...m.A, ...m.B].map(p => p.id);
  if (rep.mvp && ids.includes(rep.mvp)) return [rep.mvp];
  const r = rep.ratings; if (!r) return [];
  const v = ids.map(id => ({ id, v: r[id] && typeof r[id].v === 'number' ? r[id].v : null })).filter(x => x.v != null);
  if (!v.length) return [];
  const best = Math.max(...v.map(x => x.v)); return v.filter(x => x.v === best).map(x => x.id);
}
export const scoreOf = m => [m.A.reduce((t, p) => t + (+p.g || 0), 0), m.B.reduce((t, p) => t + (+p.g || 0), 0)];
export const vClass = v => v >= 7 ? 'hi' : v >= 6 ? 'mid' : 'lo';

/* Voti in stile pagella, a passi di un quarto. A database restano numeri:
   6- = 5,75 · 6 = 6 · 6+ = 6,25 · 6,5 = 6,5 */
export const VOTE_MIN = 1, VOTE_MAX = 10, VOTE_STEP = 0.25;
export const VOTES = Array.from({ length: (VOTE_MAX - VOTE_MIN) / VOTE_STEP + 1 }, (_, i) => VOTE_MAX - i * VOTE_STEP);
export function fmtV(v) {
  v = +v;
  const r = Math.round(v * 4) / 4;
  if (Math.abs(r - v) > 1e-9) return f1(v);   // una media, non un voto: 7,4
  const i = Math.floor(r), f = r - i;
  if (f === 0) return String(i);
  if (f === 0.5) return i + ',5';
  if (f === 0.25) return i + '+';
  return (i + 1) + '-';
}
/* voto successivo / precedente per i bottoni − e +; sotto l'1 si torna a "nessun voto" */
export const stepVote = (v, dir) => v == null ? 6 : dir > 0 ? Math.min(VOTE_MAX, v + VOTE_STEP) : (v <= VOTE_MIN ? null : v - VOTE_STEP);

/* Squadre bilanciate: divide i giocatori in due squadre di pari numero (±1)
   con la somma degli overall il più vicina possibile.
   Prima distribuisce dal più forte (sempre alla squadra più debole), poi prova scambi a coppie finché migliora. */
export function balanceTeams(players) {
  const ps = [...players].sort((x, y) => y.ovr - x.ovr), cap = Math.ceil(ps.length / 2);
  const A = [], B = [], sum = t => t.reduce((s, p) => s + p.ovr, 0);
  for (const p of ps) (A.length < cap && (sum(A) <= sum(B) || B.length >= cap) ? A : B).push(p);
  for (let improved = true, guard = 0; improved && guard < 200; guard++) {
    improved = false;
    const diff = Math.abs(sum(A) - sum(B));
    for (let i = 0; i < A.length && !improved; i++) for (let j = 0; j < B.length && !improved; j++) {
      const d = Math.abs(sum(A) - A[i].ovr + B[j].ovr - (sum(B) - B[j].ovr + A[i].ovr));
      if (d < diff) { [A[i], B[j]] = [B[j], A[i]]; improved = true; }
    }
  }
  return { A: A.map(p => p.id), B: B.map(p => p.id), sumA: sum(A), sumB: sum(B) };
}
