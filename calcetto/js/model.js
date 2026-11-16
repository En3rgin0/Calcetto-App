/* Carte e giocatori: temi, icone, ruoli e validazione dei dati che arrivano dal database. */
import { uid } from './utils.js';

/* i dati delle carte arrivano dal database e possono essere stati scritti da chiunque: si mostrano solo se validi */
export const safePhoto = p => typeof p === 'string' && p.length < 150000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p) ? p : '';
export const safeEmoji = e => EMOJIS.includes(e) ? e : '⚽';
export const THEMES = {
  gold: { bg: 'linear-gradient(145deg,#f9e27d,#d9a21b 60%,#b57b0a)', fg: '#3b2a00' },
  silver: { bg: 'linear-gradient(145deg,#f4f6f8,#aeb7c2 60%,#8893a0)', fg: '#1e252d' },
  bronze: { bg: 'linear-gradient(145deg,#e9b37a,#b4672c 60%,#8a4513)', fg: '#2d1503' },
  black: { bg: 'linear-gradient(145deg,#3a3a44,#15151b 60%,#050507)', fg: '#f5d76e' },
  blue: { bg: 'linear-gradient(145deg,#7cc4ff,#2a6fdb 60%,#14378f)', fg: '#fff' },
  green: { bg: 'linear-gradient(145deg,#8cf2a8,#1fa35a 60%,#0b5b30)', fg: '#04210f' },
  purple: { bg: 'linear-gradient(145deg,#d0a2ff,#7a3ee0 60%,#3f1b86)', fg: '#fff' },
  red: { bg: 'linear-gradient(145deg,#ff9a8a,#d9322a 60%,#7f0f0a)', fg: '#fff' },
};
export const EMOJIS = ['⚽', '🧤', '🦁', '🐺', '🦅', '🔥', '⚡', '👑', '🐐', '🚀', '🦈', '🐯'];
export const POS = ['POR', 'DIF', 'CEN', 'ATT'];
export const defCard = name => ({ nick: (name || '').split(' ')[0].slice(0, 12), pos: 'ATT', num: 10, emoji: '⚽', photo: '', theme: 'gold' });
/* Un giocatore di lega: uid = account collegato (null = senza account) */
export const norm = m => ({ ...m, uid: m.uid !== undefined ? m.uid : (m.guest ? null : m.id), adj: m.adj || {}, ovrAdj: +m.ovrAdj || 0, card: m.card || defCard(m.name) });
export const newGuest = name => ({ id: 'g_' + uid() + uid(), uid: null, name, guest: true, card: defCard(name), adj: {}, ovrAdj: 0 });
