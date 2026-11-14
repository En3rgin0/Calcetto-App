/* Dentro una lega: bacheca, classifica e record, storico, giocatori, le mie stats e impostazioni. */
import { freeCode, leagueRecords, leagueStats, loadHome, ranking, refresh } from '../data.js';
import { DB } from '../db.js';
import { newGuest, safePhoto } from '../model.js';
import { byName, dispName, isAdmin, lm, myMember, S, teamName } from '../state.js';
import { f1, mvpIds, scoreOf } from '../stats.js';
import { avatar, cardHTML, empty, ic, leagueAvatar, matchHead, matchMeta, mvpLine, paged, scoreboard, statGrid, tabellino, voteBadge } from '../ui/components.js';
import { render } from '../ui/render.js';
import { $, esc, num, q, squareImage, toast } from '../utils.js';
import { fxCard, leagueFixtures } from './fixtures.js';

export function viewLeague() {
  const l = S.league, admin = isAdmin(l);
  const tab = (t, lab) => `<button class="${S.ltab === t ? 'on' : ''}" onclick="ltab('${t}')">${lab}</button>`;
  let h = `<div class="lhead"><button class="btn sec icon" onclick="closeLeague()" aria-label="Indietro">${ic('back')}</button><div class="grow"></div>
<button class="code-chip" onclick="shareCode()" aria-label="Condividi il codice invito">${ic('share', 'sm')}Codice <b>${esc(l.code)}</b></button>
${admin ? `<button class="btn sec icon" onclick="openModal('leagueSettings')" aria-label="Impostazioni lega">${ic('gear')}</button>` : ''}</div>
<div class="ltitle">${leagueAvatar(l, 'lphoto')}<h1>${esc(l.name)}</h1>${admin ? '<span class="badge">ADMIN</span>' : ''}</div>
<div class="seg" role="tablist">${tab('board', 'Bacheca')}${tab('rank', 'Classifica')}${tab('matches', 'Storico')}${tab('players', 'Giocatori')}${tab('me', 'Le mie stats')}</div>`;
  if (S.ltab === 'board') h += boardTab(admin);
  else if (S.ltab === 'rank') h += rankTab();
  else if (S.ltab === 'matches') h += historyTab(admin);
  else if (S.ltab === 'me') h += myTab();
  else h += playersTab(l, admin);
  return h;
}
const shortDate = m => new Date(m.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });

/* ---------- Bacheca: partite programmate e schede pulite dei resoconti ---------- */
function boardTab(admin) {
  let h = '';
  const ms = lm().matches, withR = ms.filter(m => m.report), without = ms.filter(m => !m.report), fx = leagueFixtures(S.league.id);
  if (fx.up.length || fx.past.length) h += `<div class="fxgrid">${[...fx.up, ...fx.past].map(f => fxCard(f, true)).join('')}</div>`;
  if (admin) h += `<div class="actions" style="margin:${fx.up.length || fx.past.length ? '12px' : '0'} 0 4px"><button class="btn sec" onclick="newFixture(${q(S.league.id)})">${ic('cal')}Programma una partita</button></div>`;
  if (admin && without.length) {
    const row = m => {
      const [a, b] = scoreOf(m);
      return `<div class="pl"><div class="nm"><b>${shortDate(m)} · ${esc(teamName(m, 'A'))} ${a}–${b} ${esc(teamName(m, 'B'))}</b><span class="mut">${esc(m.place || '—')}</span></div><button class="btn sm" onclick="openReport(${q(m.id)})">${ic('edit', 'sm')}Scrivi</button></div>`;
    };
    /* le più recenti in vista, le altre in un elenco richiudibile */
    h += `<h2>Resoconti da scrivere · ${without.length}</h2><div class="list">${without.slice(0, 2).map(row).join('')}</div>`
      + (without.length > 2 ? `<details class="more"><summary>Mostra le altre ${without.length - 2}</summary><div class="list">${without.slice(2).map(row).join('')}</div></details>` : '');
  }
  if (withR.length) {
    const pg = paged('board', withR, m => boardCard(m, admin), 6);
    h += (admin && without.length ? '<h2>Pubblicati</h2>' : '') + `<div class="cards two">${pg.html}</div>${pg.more}`;
  } else h += empty(ic('board'), "La bacheca è vuota: dopo ogni calcetto l'admin pubblica qui il resoconto ufficiale con voti e commenti.");
  return h;
}
/* scheda della bacheca: data, squadre, risultato e MVP; si apre il dettaglio toccandola */
function boardCard(m, admin) {
  return `<div class="box mcard" role="button" tabindex="0" onclick="openMatch(${q(m.id)})" onkeydown="if(event.key==='Enter')openMatch(${q(m.id)})">
${matchMeta(m)}${scoreboard(m)}${mvpLine(m)}
<div class="mfoot"><span class="lnk">Resoconto completo ${ic('next', 'sm')}</span>${admin ? `<button class="btn sec sm" onclick="event.stopPropagation();openReport(${q(m.id)})">${ic('edit', 'sm')}Modifica</button>` : ''}</div></div>`;
}

/* ---------- Classifica, con i record della lega ---------- */
function rankTab() {
  const rows = ranking();
  return (lm().matches.length ? recordsBox() : '') + (rows.length ? `<h2>Classifica</h2><div class="list"><div class="pl rank rank-head" aria-hidden="true"><div class="rk">#</div><div class="av"></div><div class="nm">Giocatore</div><div class="cols"><span>Prt</span><span>% Vit</span><span>Gol</span><span>Ast</span><span>Voto</span><span>MVP</span></div><div class="ov"></div></div>
  ${rows.map(({ m, s }, i) => `<div class="pl rank${m.uid === S.user.uid ? ' me' : ''}" onclick="showPlayer(${q(m.id)})"><div class="rk${i < 3 ? ' p' + (i + 1) : ''}">${i + 1}</div>${avatar(m)}<div class="nm"><b>${esc(dispName(m))}</b><span class="mut">${s.played}P · ${s.winPct}% V · ${s.goals}G · ${s.assists}A${s.avg == null ? '' : ' · ⭐' + f1(s.avg)}${s.mvp ? ` · ${ic('cup', 'xs')}${s.mvp}` : ''}</span></div>
  <div class="cols"><span>${s.played}</span><span>${s.winPct}%</span><span>${s.goals}</span><span>${s.assists}</span><span>${s.avg == null ? '–' : f1(s.avg)}</span><span>${s.mvp || '–'}</span></div><div class="ov">${s.ovr}</div></div>`).join('')}</div>` : empty('👥', 'Nessun giocatore.'));
}
function recordsBox() {
  const r = leagueRecords(S.league.id), who = x => x.who.map(m => esc(dispName(m))).join(', ');
  const card = (emo, lab, x, val, tone) => x ? `<div class="rec"><span class="rec-emo t-${tone}">${emo}</span><span class="rec-lab">${lab}</span><b>${who(x)}</b><span class="rec-val">${val(x.val)}</span></div>` : '';
  const big = r.biggest ? `<div class="rec" role="button" tabindex="0" onclick="openMatch(${q(r.biggest.id)})"><span class="rec-emo t-r">💥</span><span class="rec-lab">Partita con più gol</span><b>${esc(teamName(r.biggest, 'A'))} ${scoreOf(r.biggest).join('–')} ${esc(teamName(r.biggest, 'B'))}</b><span class="rec-val">${shortDate(r.biggest)}</span></div>` : '';
  return `<h2>Record della lega</h2><div class="records">
  ${card(ic('goal'), 'Capocannoniere', r.goals, v => v + ' gol', 'g')}${card(ic('assist'), 'Re degli assist', r.assists, v => v + ' assist', 'b')}${card(ic('cup'), 'Più MVP', r.mvp, v => v + ' MVP', 'y')}
  ${card('⭐', 'Miglior media voto', r.avg, v => f1(v) + ' di media', 'y')}${card('🔥', 'Serie di vittorie', r.streak, v => v + ' di fila', 'o')}${card(ic('player'), 'Più presenze', r.played, v => v + ' partite', 'v')}${big}</div>`;
}

/* ---------- Storico: filtro per campo, riepilogo e schede compatte ---------- */
function historyTab(admin) {
  const all = lm().matches;
  if (!all.length) return empty(ic('goal'), 'Nessuna partita registrata' + (admin ? ': premi “+ Partita”.' : '.'));
  const count = {};
  for (const m of all) { const p = (m.place || '').trim() || 'Campo non indicato'; count[p] = (count[p] || 0) + 1; }
  const places = Object.entries(count).sort((x, y) => y[1] - x[1]);
  const place = S.place && count[S.place] ? S.place : null;
  const ms = place ? all.filter(m => ((m.place || '').trim() || 'Campo non indicato') === place) : all;
  const goals = m => scoreOf(m).reduce((x, y) => x + y, 0), most = [...ms].sort((x, y) => goals(y) - goals(x))[0];
  const chip = (p, n) => `<button class="pchip${(p || null) === place ? ' on' : ''}" onclick="setPlace(${p ? q(p) : 'null'})">${p ? esc(p) : 'Tutti'} <b>${n}</b></button>`;
  const pg = paged('hist', ms, m => `<div class="box match">${matchHead(m)}${tabellino(m)}${mvpLine(m)}
  <div class="mfoot"><button class="lnk linkbtn" onclick="openMatch(${q(m.id)})">${m.report ? 'Resoconto completo' : 'Dettaglio'} ${ic('next', 'sm')}</button>
  ${admin ? `<span class="row" style="flex:0;gap:6px"><button class="btn sec sm" onclick="editMatch(${q(m.id)})" aria-label="Modifica partita">${ic('edit', 'sm')}</button><button class="btn sec sm" onclick="openReport(${q(m.id)})" aria-label="Resoconto">${ic('board', 'sm')}</button><button class="btn danger sm" onclick="delMatch(${q(m.id)})" aria-label="Elimina partita">${ic('trash', 'sm')}</button></span>` : ''}</div></div>`, 10);
  return `${places.length > 1 ? `<div class="pchips" role="group" aria-label="Filtra per campo">${chip(null, all.length)}${places.map(([p, n]) => chip(p, n)).join('')}</div>` : ''}
  <div class="grid hsum"><div class="stat"><b>${ms.length}</b><span>Partite</span></div><div class="stat"><b>${f1(ms.reduce((s, m) => s + goals(m), 0) / ms.length)}</b><span>Gol a partita</span></div>
  <div class="stat tap" onclick="openMatch(${q(most.id)})"><b>${scoreOf(most).join('–')}</b><span>Più gol · ${new Date(most.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span></div></div>
  <div class="cards">${pg.html}</div>${pg.more}`;
}
window.setPlace = p => { S.place = p; S.lim = {}; render(); };

/* ---------- Giocatori ---------- */
function playersTab(l, admin) {
  const st = leagueStats(l.id);
  let h = admin ? `<button class="btn sec" onclick="openModal('guest')">${ic('plus')}Aggiungi giocatore senza account</button>` : '';
  h += `<div class="list lgrid">${lm().members.filter(m => !m.removed).sort(byName).map(m => {
    const nick = dispName(m), sub = [nick !== m.name ? m.name : '', m.uid ? 'Registrato con Google' : 'Senza account'].filter(Boolean).join(' · ');
    return `<div class="pl" onclick="showPlayer(${q(m.id)})">${avatar(m)}<div class="nm"><b>${esc(nick)}${m.uid && l.admins.includes(m.uid) ? '<span class="badge">ADMIN</span>' : ''}</b><span class="mut">${esc(sub)}</span></div><div class="ov">${st[m.id].ovr}</div></div>`;
  }).join('')}</div>`;
  return h;
}

/* ---------- Le mie stats: la mia carta e le mie partite in questa lega ---------- */
const FORM = { V: 'Vittoria', N: 'Pareggio', P: 'Sconfitta' };
const formBadge = r => `<span class="form f-${r}" title="${FORM[r]}">${r}</span>`;
function myTab() {
  const me = myMember(S.league.id); if (!me) return empty(ic('user'), 'Non hai ancora un giocatore in questa lega.');
  const st = leagueStats(S.league.id)[me.id], rows = ranking(), pos = rows.findIndex(x => x.m.id === me.id) + 1;
  const mine = lm().matches.map(m => {
    const t = m.A.some(p => p.id === me.id) ? 'A' : m.B.some(p => p.id === me.id) ? 'B' : null; if (!t) return null;
    const p = m[t].find(x => x.id === me.id), [a, b] = scoreOf(m), my = t === 'A' ? a : b, op = t === 'A' ? b : a;
    const x = m.report && m.report.ratings && m.report.ratings[me.id];
    return { m, t, g: num(p.g), as: num(p.a), res: my > op ? 'V' : my === op ? 'N' : 'P', v: x && typeof x.v === 'number' ? x.v : null, mvp: mvpIds(m).includes(me.id) };
  }).filter(Boolean);
  const last5 = mine.slice(0, 5).reverse();   /* da sinistra la più vecchia, a destra l'ultima */
  const pg = paged('mine', mine, x => `<div class="pl" onclick="openMatch(${q(x.m.id)})">${formBadge(x.res)}<div class="nm"><b>${esc(teamName(x.m, 'A'))} ${scoreOf(x.m).join('–')} ${esc(teamName(x.m, 'B'))}</b><span class="mut">${shortDate(x.m)}${x.g ? ` · ${ic('goal', 'xs')} ${x.g}` : ''}${x.as ? ` · ${ic('assist', 'xs')} ${x.as}` : ''}${x.mvp ? ` · ${ic('cup', 'xs')} MVP` : ''}</span></div>${voteBadge(x.v)}</div>`, 10);
  return `<div class="me-grid"><aside class="me-side">${cardHTML(me, st)}
  <div class="box mystat"><div><b>${pos ? pos + 'º' : '–'}</b><span class="lab">in classifica su ${rows.length}</span></div>
  <div><div class="formrow">${last5.length ? last5.map(x => formBadge(x.res)).join('') : '<b>–</b>'}</div><span class="lab">Ultime 5 partite</span></div></div>
  <p class="mut form-legend">${formBadge('V')} vittoria ${formBadge('N')} pareggio ${formBadge('P')} sconfitta</p></aside>
  <section class="me-main"><h2>Le mie statistiche in ${esc(S.league.name)}</h2>${statGrid(st, me.id)}
  <h2>Le mie partite · ${mine.length}</h2>${mine.length ? `<div class="list">${pg.html}</div>${pg.more}` : empty(ic('goal'), 'Non hai ancora giocato in questa lega.')}
  </section></div>`;
}

export function guestModal() {
  return `<h2>Nuovo giocatore</h2><p class="mut">Per chi non ha ancora fatto l'accesso: avrà partite, statistiche e overall come tutti gli altri. Quando farà il login potrà collegarsi a questo giocatore e farlo suo.</p><label>Nome</label><input id="f1"><button class="btn" onclick="addGuest()">Aggiungi</button>`;
}
export function settingsModal() {
  const ph = safePhoto(S.league.photo);
  return `<h2>Impostazioni lega</h2><label>Nome della lega</label><input id="f1" value="${esc(S.league.name)}" maxlength="40"><button class="btn" onclick="renameLeague()">Salva nome</button>
<h2>Immagine della lega</h2><div class="lphoto-edit">${leagueAvatar(S.league, 'lphoto')}<div style="flex:1;min-width:0"><p class="mut" style="margin:0 0 8px">Si vede nell'elenco delle leghe e in cima alla lega. Viene ritagliata quadrata.</p>
<label class="btn sec sm" style="margin:0;color:var(--tx);font-size:13px;letter-spacing:0">${ic('edit', 'sm')}${ph ? 'Cambia immagine' : 'Carica immagine'}<input type="file" accept="image/*" hidden onchange="pickLeaguePhoto(this)"></label>
${ph ? `<button class="btn danger sm" style="margin-left:6px" onclick="removeLeaguePhoto()">${ic('trash', 'sm')}Rimuovi</button>` : ''}</div></div>
<h2>Codice invito</h2><p class="mut">Codice attuale: <b>${esc(S.league.code)}</b>. Se è finito in mani sbagliate, o dopo aver rimosso qualcuno che non deve rientrare, generane uno nuovo.</p>
<button class="btn sec" onclick="newCode()">${ic('share')}Genera nuovo codice</button>
${coAdminList()}<h2 style="color:var(--red)">Zona pericolosa</h2><p class="mut">Eliminando la lega cancelli per sempre partite, resoconti, voti e statistiche di tutti i giocatori. Non si può annullare.</p>
<button class="btn danger" onclick="goModal('delLeague')">${ic('trash')}Elimina lega definitivamente</button>`;
}
export function delLeagueModal() {
  return `<h2 style="color:var(--red)">Eliminare “${esc(S.league.name)}”?</h2><p class="mut">Sparirà per tutti i giocatori (${lm().members.filter(m => !m.removed).length}), con ${lm().matches.length} ${lm().matches.length === 1 ? 'partita' : 'partite'} e tutti i resoconti. Per confermare scrivi il nome esatto della lega.</p>
<input id="f1" placeholder="${esc(S.league.name)}" autocomplete="off"><button class="btn danger" onclick="delLeague()">Elimina per sempre</button><button class="btn sec" onclick="goModal('leagueSettings')">Annulla</button>`;
}

window.newCode = async () => {
  if (!confirm('Generare un nuovo codice invito? Quello vecchio smetterà di funzionare (chi è già nella lega resta dentro).')) return;
  const l = S.league;
  try { const c = await freeCode(); await DB.setCode(l.id, c, l.code); } catch (e) { console.error(e); return toast('Operazione non riuscita'); }
  await refresh(l.id); S.modal = { type: 'leagueSettings' }; toast('Nuovo codice: ' + S.league.code); render();
};
/* immagine della lega: quadrata 256×256, salvata nel documento della lega */
window.pickLeaguePhoto = async inp => {
  const f = inp.files[0]; if (!f) return;
  const l = S.league;
  try { await DB.patchLeague(l.id, { photo: await squareImage(f, 256, .8) }); } catch (e) { console.error(e); return toast('Immagine non salvata'); }
  await refresh(l.id); S.modal = { type: 'leagueSettings' }; toast('Immagine della lega aggiornata ✅'); render();
};
window.removeLeaguePhoto = async () => {
  if (!confirm("Rimuovere l'immagine della lega?")) return;
  const l = S.league;
  try { await DB.patchLeague(l.id, { photo: '' }); } catch (e) { console.error(e); return toast('Operazione non riuscita'); }
  await refresh(l.id); S.modal = { type: 'leagueSettings' }; render();
};
window.renameLeague = async () => {
  const name = ($('#f1').value || '').trim(); if (!name) return toast('Inserisci un nome');
  const l = S.league;
  try { await DB.patchLeague(l.id, { name }); } catch (e) { console.error(e); return toast('Impossibile rinominare'); }
  S.modal = null; await refresh(l.id); toast('Nome aggiornato ✅'); render();
};
window.delLeague = async () => {
  const l = S.league;
  if (($('#f1').value || '').trim() !== l.name) return toast('Il nome non coincide');
  try { await DB.delLeague(l.id); } catch (e) { console.error(e); return toast('Eliminazione non riuscita: hai aggiornato le regole Firebase?'); }
  delete S.cache[l.id]; S.league = null; S.modal = null; S.tab = 'lg'; await loadHome(); toast('Lega eliminata'); render();
};
window.shareCode = async () => {
  const t = `Unisciti alla lega “${S.league.name}” su Calcetto Club con il codice ${S.league.code}`;
  try { if (navigator.share) await navigator.share({ text: t }); else { await navigator.clipboard.writeText(t); toast('Codice copiato'); } } catch { }
};
window.addGuest = async () => {
  const name = $('#f1').value.trim(); if (!name) return;
  const m = newGuest(name);
  await DB.setMember(S.league.id, m); lm().members.push(m); S.modal = null; render();
};

export function coAdminList() {
  const l = S.league, regs = lm().members.filter(x => x.uid);
  return `<h2>Admin e co-admin</h2>
   <p class="mut">I co-admin hanno gli stessi poteri dell'admin: partite, resoconti, modifica dei giocatori, nome e cancellazione della lega. Possono esserlo solo i giocatori con account Google.</p>
   ${regs.map(x => {
    const a = l.admins.includes(x.uid);
    return `<div class="pl">${avatar(x)}<div class="nm"><b>${esc(x.name)}${x.uid === S.user.uid ? ' (tu)' : ''}</b><span class="mut">${a ? 'Admin' : 'Giocatore'}</span></div>
   <button class="btn sm ${a ? 'danger' : ''}" onclick="${a ? 'removeAdmin' : 'makeAdmin'}(${q(x.uid)})">${a ? 'Rimuovi' : 'Nomina co-admin'}</button></div>`;
  }).join('')}`;
}
window.makeAdmin = async u => {
  if (!confirm("Nominare co-admin questo giocatore? Avrà gli stessi poteri dell'admin, compresa la cancellazione della lega.")) return;
  const l = S.league, back = S.modal && S.modal.type === 'leagueSettings';
  try { await DB.addAdmin(l.id, u); } catch (e) { console.error(e); return toast('Operazione non riuscita'); }
  S.draft = null; S.modal = back ? { type: 'leagueSettings' } : null; await refresh(l.id); toast('Nuovo co-admin 👑'); render();
};
window.removeAdmin = async u => {
  const l = S.league, fresh = await DB.getLeague(l.id); if (!fresh) return toast('Lega non trovata');
  if (fresh.admins.length <= 1) return toast('Deve esserci almeno un admin');
  const self = u === S.user.uid;
  if (!confirm(self ? 'Rimuovere i tuoi poteri di admin? Non potrai più modificare la lega.' : 'Togliere i poteri di admin a questo giocatore?')) return;
  try { await DB.removeAdmin(l.id, u); } catch (e) { console.error(e); return toast('Operazione non riuscita'); }
  S.modal = self ? null : { type: 'leagueSettings' }; await refresh(l.id); toast(self ? 'Non sei più admin' : 'Poteri rimossi'); render();
};
