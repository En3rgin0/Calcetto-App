// Test dei colori delle squadre:  npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guessColor, teamColors, tooSimilar, TEAM_COLORS } from '../calcetto/js/teams.js';

test('il nome suggerisce il colore', () => {
  assert.equal(guessColor('Neri'), 'nero');
  assert.equal(guessColor('Bianchi'), 'bianco');
  assert.equal(guessColor('Rossi'), 'rosso');
  assert.equal(guessColor('Rosa'), 'rosa');
  assert.equal(guessColor('Squadra A'), null);
});

test('colori simili non possono stare nella stessa partita', () => {
  assert.ok(tooSimilar('blu', 'azzurro'));
  assert.ok(tooSimilar('rosso', 'rosso'));
  assert.ok(!tooSimilar('nero', 'bianco'));
  const c = teamColors({ colorA: 'rosso', colorB: 'arancione' });   // simili: B viene cambiato
  assert.equal(c.keys.A, 'rosso');
  assert.ok(!tooSimilar(c.keys.A, c.keys.B));
});

test('senza scelte: dal nome, poi blu e arancione', () => {
  assert.deepEqual(teamColors({ nameA: 'Neri', nameB: 'Bianchi' }).keys, { A: 'nero', B: 'bianco' });
  assert.deepEqual(teamColors({}).keys, { A: 'blu', B: 'arancione' });
  assert.equal(teamColors({ colorA: 'inventato' }).keys.A, 'blu');
  assert.ok(Object.values(TEAM_COLORS).every(c => /^#[0-9a-f]{6}$/i.test(c.dot)));
});
