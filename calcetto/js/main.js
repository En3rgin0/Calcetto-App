/* Punto di ingresso dell'app.
   Ogni schermata registra i propri gestori (window.xxx) usati dagli onclick dei template:
   importarle qui le rende disponibili prima del primo disegno. */
import { boot } from './auth.js';
import './ui/render.js';
import './views/profile.js';
import './views/leagues.js';
import './views/league.js';
import './views/players.js';
import './views/matches.js';
import './views/reports.js';
import './views/calendar.js';
import './views/fixtures.js';
import './views/detail.js';

/* service worker: app installabile e apribile anche senza rete */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost'))
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW', e)));

boot();
