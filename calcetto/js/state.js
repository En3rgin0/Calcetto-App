/* Stato dell'app (unico oggetto S) e piccoli selettori. */

/* ---------------- Stato ---------------- */
export const S = { user: null, me: null, tab: 'me', leagues: [], cache: {}, league: null, ltab: 'rank', modal: null, draft: null, agg: null, ready: false };
export const lm = () => S.cache[S.league.id];
export const isAdmin = l => l.admins.includes(S.user.uid);
export const myMember = lid => (S.cache[lid]?.members || []).find(m => m.uid === S.user.uid);
/* nome mostrato dentro una lega: soprannome di lega (deciso dall'admin), poi quello della carta, poi il nome */
export const dispName = m => m.lnick || (m.card && m.card.nick) || m.name;
export const byName = (a, b) => dispName(a).localeCompare(dispName(b));
/* nomi delle squadre di una partita (es. Neri / Bianchi) */
export const teamName = (m, t) => (t === 'A' ? m.nameA : m.nameB) || 'Squadra ' + t;
/* usato dagli attributi oninput="S.draft…" nei template */
window.S = S;
