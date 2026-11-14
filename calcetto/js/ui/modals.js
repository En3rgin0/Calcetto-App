/* Finestre (modali): registro tipo → contenuto e cornice comune. */
import { privacyModal } from '../auth.js';
import { S } from '../state.js';
import { ic } from './components.js';
import { calView } from '../views/calendar.js';
import { matchDetailModal } from '../views/detail.js';
import { fixtureForm, rsvpModal } from '../views/fixtures.js';
import { delLeagueModal, guestModal, settingsModal } from '../views/league.js';
import { joinModal, newLeagueModal } from '../views/leagues.js';
import { matchForm } from '../views/matches.js';
import { claimAskModal, claimPickModal, playerEditor, playerView } from '../views/players.js';
import { cardEditor } from '../views/profile.js';
import { reportForm } from '../views/reports.js';

export const MODALS = {
  newLeague: newLeagueModal, join: joinModal, guest: guestModal, leagueSettings: settingsModal, delLeague: delLeagueModal,
  card: cardEditor, player: playerView, editPlayer: playerEditor, claimAsk: claimAskModal, claimPick: claimPickModal,
  match: matchForm, matchDetail: matchDetailModal, rsvp: rsvpModal, report: reportForm, cal: calView, fixture: fixtureForm, privacy: privacyModal,
};
export function viewModal(anim) {
  const m = S.modal; if (!m) return '';
  const b = MODALS[m.type] ? MODALS[m.type](m) : '';
  const fixed = m.type === 'claimAsk' || m.type === 'claimPick' || m.type === 'privacy';
  const x = fixed ? '' : `<button class="modal-x" onclick="closeModal()" aria-label="Chiudi">${ic('x')}</button>`;
  const back = (m.type === 'cal' && m.prev) ? `<button class="btn sec" style="margin-top:14px" onclick="calBack()">${ic('back')}Indietro</button>` : '';
  return `<div class="modal${anim ? ' anim' : ''}" onclick="if(event.target===this)closeModal()"><div role="dialog" aria-modal="true">${x}${b}${back}</div></div>`;
}
