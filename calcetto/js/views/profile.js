/* Profilo: la mia carta, statistiche totali, privacy ed esportazione dati. */
import { KOFI_URL, PRIVACY_URL } from '../config.js';
import { leagueStats, ratingEntries } from '../data.js';
import { DB } from '../db.js';
import { EMOJIS, POS, safeEmoji, safePhoto, THEMES } from '../model.js';
import { myMember, S, teamName } from '../state.js';
import { mvpIds, scoreOf } from '../stats.js';
import { cardHTML, empty, ic, leagueAvatar, statGrid, voteBadge } from '../ui/components.js';
import { render } from '../ui/render.js';
import { $, esc, num, q, squareImage, toast } from '../utils.js';

export function viewMe() {
  const st = S.agg;
  const leagues = S.leagues.map(l => {
    const m = myMember(l.id);
    if (!m) return `<div class="pl" onclick="enter(${q(l.id)})">${leagueAvatar(l)}<div class="nm"><b>${esc(l.name)}</b><span class="mut">Completa l'ingresso</span></div><span class="badge r">DA COMPLETARE</span></div>`;
    const s = leagueStats(l.id)[m.id];
    return `<div class="pl" onclick="enter(${q(l.id)})">${leagueAvatar(l)}<div class="nm"><b>${esc(l.name)}</b><span class="mut">${s.played} partite · ${s.goals} gol · ${s.assists} assist</span></div><div class="ov">${s.ovr}</div></div>`;
  }).join('');
  return `<div class="hello"><div><h1>Ciao ${esc(S.me.card.nick || S.me.name)} 👋</h1><p class="mut">${st.played ? `${st.played} partite giocate in ${S.leagues.length} ${S.leagues.length === 1 ? 'lega' : 'leghe'}` : 'Gioca la tua prima partita per far crescere l\'overall'}</p></div></div>
   <div class="me-grid">
   <aside class="me-side">${cardHTML(S.me, st)}
 <button class="btn sec" onclick="editCard()">${ic('edit')}Personalizza la carta</button></aside>
   <section class="me-main">
 ${formBox()}
 <h2>Statistiche totali</h2>${statGrid(st, 'me')}
 <h2>Le tue leghe</h2>
 ${leagues ? `<div class="list lgrid">${leagues}</div>` : empty(ic('cup'), 'Non fai ancora parte di nessuna lega.<br><button class="btn sm" style="margin-top:12px" onclick="setTab(\'lg\')">Crea o unisciti a una lega</button>')}
 ${KOFI_URL ? `<h2>Sostieni il progetto</h2><p class="mut">L'app è gratuita e senza pubblicità. Se ti piace, puoi offrirmi un caffè.</p><a class="btn sec" href="${esc(KOFI_URL)}" target="_blank" rel="noopener">${ic('coffee')}Offrimi un caffè su Ko-fi</a>` : ''}
 <h2>Privacy e dati</h2>
 <div class="actions"><a class="btn sec" href="${PRIVACY_URL}" target="_blank" rel="noopener">${ic('shield')}Informativa sulla privacy</a>
 <button class="btn sec" onclick="exportData()">${ic('down')}Scarica i miei dati</button></div>
 <p class="mut">Per far cancellare il tuo account e i tuoi dati scrivi al titolare: i contatti sono nell'informativa.</p>
 <button class="btn danger only-mobile" onclick="logout()">${ic('out')}Esci (${esc(S.user.email || S.user.name)})</button>
   </section></div>`;
}

/* Editor carta personale */
export function cardEditor() {
  const d = S.draft, name = S.me.name;
  return `<h2>La tua carta</h2><div id="prev">${cardHTML({ name, card: d }, S.agg)}</div>
   <label>Soprannome</label><input value="${esc(d.nick)}" maxlength="12" oninput="cd('nick',this.value)">
   <div class="row"><div><label>Ruolo</label><select onchange="cd('pos',this.value,1)">${POS.map(p => `<option ${p === d.pos ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
   <div><label>Numero</label><input type="number" min="1" max="99" value="${esc(d.num)}" oninput="cd('num',this.value)"></div></div>
   <label>Colore carta</label><div class="chips">${Object.entries(THEMES).map(([k, t]) => `<div class="sw ${d.theme === k ? 'on' : ''}" style="background:${t.bg}" onclick="cd('theme',${q(k)},1)"></div>`).join('')}</div>
   <label>Icona</label><div class="chips">${EMOJIS.map(e => `<div class="chip ${!d.photo && d.emoji === e ? 'on' : ''}" onclick="cd('emoji',${q(e)},1)">${e}</div>`).join('')}</div>
   <label>Oppure una tua foto</label><input type="file" accept="image/*" onchange="pickPhoto(this)">
   ${d.photo ? '<button class="btn sec sm" onclick="cd(\'photo\',\'\',1)">Rimuovi foto</button><br><br>' : ''}
   <button class="btn" onclick="saveCard()">Salva carta</button>`;
}
/* ---------- Stato di forma: le mie ultime 5 partite tra tutte le leghe ---------- */
function lastMatches(n) {
  const out = [];
  for (const l of S.leagues) {
    const me = myMember(l.id); if (!me) continue;
    for (const m of S.cache[l.id].matches) {
      const t = m.A.some(p => p.id === me.id) ? 'A' : m.B.some(p => p.id === me.id) ? 'B' : null; if (!t) continue;
      const p = m[t].find(x => x.id === me.id), [a, b] = scoreOf(m), my = t === 'A' ? a : b, op = t === 'A' ? b : a;
      const x = m.report && m.report.ratings && m.report.ratings[me.id];
      out.push({ l, m, res: my > op ? 'V' : my === op ? 'N' : 'P', g: num(p.g), as: num(p.a), v: x && typeof x.v === 'number' ? x.v : null, mvp: mvpIds(m).includes(me.id) });
    }
  }
  return out.sort((x, y) => (y.m.date + y.m.time).localeCompare(x.m.date + x.m.time)).slice(0, n);
}
function formBox() {
  const last = lastMatches(5).reverse();   /* da sinistra la più vecchia, a destra l'ultima */
  if (!last.length) return '';
  const RES = { V: 'Vittoria', N: 'Pareggio', P: 'Sconfitta' };
  return `<h2>Stato di forma · ultime ${last.length}</h2><div class="ftiles">${last.map(x => `<button class="ftile r-${x.res}" onclick="openFromProfile(${q(x.l.id)},${q(x.m.id)})" title="${esc(x.l.name)} · ${esc(teamName(x.m, 'A'))} ${scoreOf(x.m).join('–')} ${esc(teamName(x.m, 'B'))}">
   ${leagueAvatar(x.l, 'ft-lg')}
   <span class="form f-${x.res}" aria-label="${RES[x.res]}">${x.res}</span>
   <span class="ft-score">${scoreOf(x.m).join('–')}</span>
   <span class="ft-date">${new Date(x.m.date + 'T12:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}</span>
   ${voteBadge(x.v)}
   <span class="ft-ga"><span>${ic('goal', 'xs')} ${x.g}</span><span>${ic('assist', 'xs')} ${x.as}</span></span>
   ${x.mvp ? `<span class="ft-mvp">${ic('cup', 'xs')} MVP</span>` : ''}</button>`).join('')}</div>`;
}
/* dal profilo alla partita: entra nella lega e apre il dettaglio */
window.openFromProfile = (lid, mid) => { enter(lid); if (S.league) openMatch(mid); };

window.editCard = () => { S.draft = { ...S.me.card }; S.modal = { type: 'card' }; render(); };
window.cd = (k, v, re) => { S.draft[k] = v; if (k === 'emoji') S.draft.photo = ''; if (re) render(); else $('#prev').innerHTML = cardHTML({ name: S.me.name, card: S.draft }, S.agg); };
window.pickPhoto = async inp => {
  const f = inp.files[0]; if (!f) return;
  try { cd('photo', await squareImage(f, 200, .75), 1); } catch (e) { console.error(e); toast('Immagine non valida'); }
};
window.saveCard = async () => {
  const card = { ...S.draft, nick: ((S.draft.nick || '').trim() || S.me.name.split(' ')[0]).slice(0, 12), num: Math.max(1, Math.min(99, +S.draft.num || 10)), photo: safePhoto(S.draft.photo), emoji: safeEmoji(S.draft.emoji) };
  try { await DB.setUser(S.user.uid, { card }); } catch (e) { console.error(e); return toast('Salvataggio non riuscito, riprova'); }
  S.me.card = card;
  /* copia la carta in tutte le leghe; se qualcuna fallisce lo diciamo invece di tacere */
  const mine = S.leagues.map(l => [l, myMember(l.id)]).filter(([, m]) => m);
  const res = await Promise.allSettled(mine.map(([l, m]) => DB.patchMember(l.id, m.id, { card }).then(() => { m.card = card; })));
  const ko = res.filter(r => r.status === 'rejected'); ko.forEach(r => console.error(r.reason));
  S.modal = null; S.draft = null; toast(ko.length ? `Carta salvata, ma non aggiornata in ${ko.length} ${ko.length === 1 ? 'lega' : 'leghe'}` : 'Carta aggiornata ✅'); render();
};

/* ---------- Privacy: esportazione dei propri dati (portabilità) ---------- */
window.exportData = () => {
  const out = {
    esportato: new Date().toISOString(), account: { uid: S.user.uid, nome: S.me.name, email: S.me.email || S.user.email || null },
    carta: S.me.card, accettazionePrivacy: S.me.privacy || null, leghe: []
  };
  for (const l of S.leagues) {
    const m = myMember(l.id); if (!m) continue; const st = leagueStats(l.id)[m.id];
    out.leghe.push({
      lega: l.name, admin: l.admins.includes(S.user.uid), giocatore: { nome: m.name, carta: m.card, correzioniAdmin: { statistiche: m.adj || {}, overall: m.ovrAdj || 0 } },
      statistiche: { partite: st.played, vittorie: st.wins, pareggi: st.draws, sconfitte: st.losses, gol: st.goals, assist: st.assists, mvp: st.mvp, mediaVoto: st.avg, overall: st.ovr },
      partite: ratingEntries([{ lid: l.id, mid: m.id }]).map(e => ({ data: e.date, ora: e.time, luogo: e.place, squadra: e.team, risultato: e.score, esito: e.res, voto: e.v, commento: e.c, mvp: e.mvp }))
    });
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'calcetto-club-miei-dati.json'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500); toast('Dati scaricati ✅');
};
