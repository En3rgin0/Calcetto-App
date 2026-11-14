/* Disegno della pagina: struttura, navigazione e cambio schermata. */
import { FIREBASE_CONFIG } from '../config.js';
import { isAdmin, myMember, S } from '../state.js';
import { ic } from './components.js';
import { viewModal } from './modals.js';
import { $, esc } from '../utils.js';
import { viewFixtures } from '../views/fixtures.js';
import { viewLeague } from '../views/league.js';
import { viewLeagues } from '../views/leagues.js';
import { viewLogin } from '../views/login.js';
import { viewMe } from '../views/profile.js';

export let lastView = '', lastModal = '';
export function render() {
  const app = $('#app');
  if (!S.ready) { app.innerHTML = '<div class="loading"><div class="spin"></div><span>Caricamento…</span></div>'; return; }
  if (!S.user) { lastView = ''; app.innerHTML = viewLogin(); return; }
  /* le animazioni d'ingresso partono solo quando cambia schermata o modale, non a ogni aggiornamento */
  const view = S.league ? 'L:' + S.league.id + ':' + S.ltab : 'T:' + S.tab, mkey = S.modal ? S.modal.type : '';
  const anim = view !== lastView, manim = mkey && mkey !== lastModal; lastView = view; lastModal = mkey;
  let page = FIREBASE_CONFIG ? '' : '<div class="demo">Modalità demo: i dati restano solo su questo dispositivo.</div>';
  page += S.league ? viewLeague() : (S.tab === 'me' ? viewMe() : S.tab === 'fx' ? viewFixtures() : viewLeagues());
  const cur = S.league ? 'lg' : S.tab, nb = (t, i, lab) => `<button class="${cur === t ? 'on' : ''}" onclick="setTab('${t}')" ${cur === t ? 'aria-current="page"' : ''}>${ic(i)}<span>${lab}</span></button>`;
  const nav = `<nav class="nav" aria-label="Navigazione principale">
<div class="brand"><img src="assets/icon-192.png" alt="">Calcetto Club</div>
<div class="nav-items">${nb('me', 'user', 'Profilo')}${nb('lg', 'trophy', 'Leghe')}${nb('fx', 'cal', 'Partite')}</div>
<div class="nav-foot"><b>${esc(S.me.name)}</b><span>${esc(S.user.email || '')}</span><button class="btn sec sm" onclick="logout()">${ic('out', 'sm')}Esci</button></div></nav>`;
  const fab = (S.league && isAdmin(S.league) && S.ltab === 'matches') ? `<button class="fab" onclick="newMatch()">${ic('plus')}Partita</button>` : '';
  app.innerHTML = `<div class="shell">${nav}<main class="main"><div class="page${anim ? '' : ' still'}">${page}</div></main></div>${fab}${viewModal(manim)}`;
  /* su telefono le schede della lega scorrono: tiene in vista quella attiva */
  const seg = app.querySelector('.seg'), on = seg && seg.querySelector('.on');
  if (on && seg.scrollWidth > seg.clientWidth) seg.scrollLeft = on.offsetLeft - (seg.clientWidth - on.offsetWidth) / 2;
}
window.setTab = t => { const ch = S.league || S.tab !== t; S.league = null; S.tab = t; render(); if (ch) scrollTo(0, 0); };

window.openModal = t => { S.modal = { type: t }; render(); };
window.goModal = (type, lid) => { S.modal = { type, lid }; render(); };
window.closeModal = () => { if (S.modal && S.modal.type === 'privacy') return; S.modal = null; S.draft = null; render(); };
window.showPlayer = id => { S.modal = { type: 'player', id }; render(); };
window.enter = id => {
  if (!myMember(id)) { S.modal = { type: 'claimAsk', lid: id }; render(); return; }
  S.league = S.leagues.find(l => l.id === id); S.ltab = 'board'; S.lim = {}; S.place = null; render(); scrollTo(0, 0);
};
window.closeLeague = () => { S.league = null; render(); };
window.ltab = t => { if (S.ltab !== t) S.lim = {}; S.ltab = t; render(); };
/* "Mostra altri": allunga la lista senza cambiare pagina */
window.showMore = (k, step) => { S.lim = S.lim || {}; S.lim[k] = (S.lim[k] || step) + step; render(); };

/* ridisegna mantenendo lo scroll della finestra aperta */
export function keepScroll() { const m = document.querySelector('.modal>div'), y = m ? m.scrollTop : 0; render(); const n = document.querySelector('.modal>div'); if (n) n.scrollTop = y; }
