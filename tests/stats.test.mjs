// Test del calcolo di statistiche e overall:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { balanceTeams, calcOverall, computeStats, emptyStats, finalize, fmtV, mvpIds, scoreOf, stepVote, OV_MIN, OV_MAX, VOTES } from '../calcetto/js/stats.js';

const s = (played, wins, draws, goals, assists) => ({ ...emptyStats(), played, wins, draws, losses: played - wins - draws, goals, assists });

test('senza partite l\'overall è il minimo', () => {
  assert.equal(calcOverall(emptyStats()), OV_MIN);
});

test('l\'overall resta sempre tra 64 e 99', () => {
  assert.equal(calcOverall(s(100, 100, 0, 1000, 1000)), OV_MAX);
  assert.equal(calcOverall(s(40, 0, 0, 0, 0)), OV_MIN + 7);   // solo bonus esperienza: 64 + 35 × 0,2
  for (const n of [1, 5, 10, 25, 60]) {
    const o = calcOverall(s(n, Math.floor(n / 2), 0, n, n));
    assert.ok(o >= OV_MIN && o <= OV_MAX, `overall ${o} fuori scala con ${n} partite`);
  }
});

test('a parità di rendimento più partite danno un overall più alto', () => {
  const poche = calcOverall(s(4, 2, 0, 4, 2)), tante = calcOverall(s(20, 10, 0, 20, 10));
  assert.ok(tante > poche, `${tante} non è maggiore di ${poche}`);
});

test('il pareggio vale mezza vittoria', () => {
  assert.equal(calcOverall(s(10, 0, 10, 0, 0)), calcOverall(s(10, 5, 0, 0, 0)));
});

test('computeStats conta vittorie, pareggi, sconfitte, gol e assist', () => {
  const st = computeStats([
    { A: [{ id: 'a', g: 2, a: 1 }, { id: 'b', g: 1 }], B: [{ id: 'c', g: 1, a: 1 }] },   // 3-1 per A
    { A: [{ id: 'a', g: 0 }], B: [{ id: 'c', g: 0 }] },                                   // 0-0
    { A: [{ id: 'a', g: '<b>1</b>' }], B: [{ id: 'c', g: 2 }] },                          // gol non numerico = 0 → 0-2
  ]);
  assert.deepEqual(st.a, { played: 3, wins: 1, draws: 1, losses: 1, goals: 2, assists: 1 });
  assert.deepEqual(st.c, { played: 3, wins: 1, draws: 1, losses: 1, goals: 3, assists: 1 });
  assert.equal(finalize(st.a).winPct, 33);
});

test('scoreOf somma i gol delle due squadre', () => {
  assert.deepEqual(scoreOf({ A: [{ g: 2 }, { g: 1 }], B: [{ g: 4 }] }), [3, 4]);
});

test('mvpIds restituisce chi ha preso il voto più alto (anche più giocatori)', () => {
  const m = { A: [{ id: 'a' }, { id: 'b' }], B: [{ id: 'c' }], report: { ratings: { a: { v: 7 }, b: { v: 8 }, c: { v: 8 } } } };
  assert.deepEqual(mvpIds(m).sort(), ['b', 'c']);
  assert.deepEqual(mvpIds({ A: [], B: [] }), []);
});

test('voti con + e -: 6- = 5,75, 6+ = 6,25, 6,5', () => {
  assert.equal(fmtV(5.75), '6-');
  assert.equal(fmtV(6), '6');
  assert.equal(fmtV(6.25), '6+');
  assert.equal(fmtV(6.5), '6,5');
  assert.equal(fmtV(9.75), '10-');
  assert.equal(fmtV(10), '10');
  assert.equal(fmtV(7.4), '7,4');   // una media resta un decimale
});

test('i bottoni − e + si muovono di un quarto, da 1 a 10', () => {
  assert.equal(stepVote(null, 1), 6);
  assert.equal(stepVote(6, 1), 6.25);
  assert.equal(stepVote(6, -1), 5.75);
  assert.equal(stepVote(10, 1), 10);
  assert.equal(stepVote(1, -1), null);
  assert.equal(VOTES[0], 10);
  assert.equal(VOTES.at(-1), 1);
  assert.equal(VOTES.length, 37);
});

test('l\'MVP scelto dall\'admin vince sul voto più alto', () => {
  const m = { A: [{ id: 'a' }, { id: 'b' }], B: [{ id: 'c' }], report: { mvp: 'a', ratings: { a: { v: 7 }, b: { v: 9.25 } } } };
  assert.deepEqual(mvpIds(m), ['a']);
  m.report.mvp = 'zz';   // giocatore non più in partita: si torna al voto più alto
  assert.deepEqual(mvpIds(m), ['b']);
});

test('squadre bilanciate: stesso numero di giocatori e overall vicini', () => {
  const ps = [95, 90, 89, 88, 87, 84, 82, 79, 78, 69].map((ovr, i) => ({ id: 'p' + i, ovr }));
  const r = balanceTeams(ps);
  assert.equal(r.A.length, 5);
  assert.equal(r.B.length, 5);
  assert.ok(Math.abs(r.sumA - r.sumB) <= 3, `differenza ${Math.abs(r.sumA - r.sumB)}`);
  assert.deepEqual([...r.A, ...r.B].sort(), ps.map(p => p.id).sort());
  const dispari = balanceTeams(ps.slice(0, 7));
  assert.ok(Math.abs(dispari.A.length - dispari.B.length) === 1);
});
