/* Colori delle squadre.
   Palette chiusa, scelta perché ogni colore si legga bene sul fondo scuro dell'app.
   dot = pallino/maglia · tx = colore del testo sul fondo scuro · ink = testo sopra il colore pieno · wa = emoji per WhatsApp */
export const TEAM_COLORS = {
  bianco: { label: 'Bianco', dot: '#f1f5f9', tx: '#f1f5f9', ink: '#0b1a13', wa: '⚪' },
  nero: { label: 'Nero', dot: '#16181d', tx: '#aab4c3', ink: '#ffffff', wa: '⚫' },
  blu: { label: 'Blu', dot: '#4f8ff7', tx: '#6ea3ff', ink: '#ffffff', wa: '🔵' },
  azzurro: { label: 'Azzurro', dot: '#38bdf8', tx: '#5ccbfa', ink: '#06202c', wa: '🩵' },
  rosso: { label: 'Rosso', dot: '#ef4444', tx: '#ff6b6b', ink: '#ffffff', wa: '🔴' },
  arancione: { label: 'Arancione', dot: '#fb8b3c', tx: '#fb9a55', ink: '#2a1300', wa: '🟠' },
  giallo: { label: 'Giallo', dot: '#facc15', tx: '#fcd34d', ink: '#2a2000', wa: '🟡' },
  verde: { label: 'Verde', dot: '#22c55e', tx: '#4ade80', ink: '#03210f', wa: '🟢' },
  viola: { label: 'Viola', dot: '#a78bfa', tx: '#b9a2ff', ink: '#160b33', wa: '🟣' },
  rosa: { label: 'Rosa', dot: '#f472b6', tx: '#f78cc4', ink: '#2c0618', wa: '🩷' },
};
/* coppie troppo simili per stare nella stessa partita */
const SIMILAR = [['blu', 'azzurro'], ['blu', 'viola'], ['rosso', 'arancione'], ['rosso', 'rosa'], ['arancione', 'giallo'], ['viola', 'rosa'], ['azzurro', 'verde']];
export const tooSimilar = (a, b) => !!a && !!b && (a === b || SIMILAR.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));

/* dal nome della squadra al colore: "Neri" → nero, "Bianchi" → bianco… */
const GUESS = [[/^ner/i, 'nero'], [/^bianc/i, 'bianco'], [/^ross/i, 'rosso'], [/^(blu|blues?)$/i, 'blu'], [/^azzurr/i, 'azzurro'], [/^verd/i, 'verde'],
  [/^giall/i, 'giallo'], [/^arancio/i, 'arancione'], [/^viol/i, 'viola'], [/^ros[ae]$/i, 'rosa']];
export const guessColor = name => { const n = (name || '').trim(); const g = GUESS.find(([re]) => re.test(n)); return g ? g[1] : null; };

/* colori effettivi di una partita: scelti → indovinati dal nome → blu / arancione; mai due colori simili */
export function teamColors(m) {
  const ok = k => k && TEAM_COLORS[k] ? k : null;
  let a = ok(m.colorA) || guessColor(m.nameA) || 'blu';
  let b = ok(m.colorB) || guessColor(m.nameB) || 'arancione';
  if (tooSimilar(a, b)) b = ['arancione', 'bianco', 'verde', 'giallo', 'nero'].find(k => !tooSimilar(a, k));
  return { A: TEAM_COLORS[a], B: TEAM_COLORS[b], keys: { A: a, B: b } };
}
export const teamColor = (m, t) => teamColors(m)[t];
