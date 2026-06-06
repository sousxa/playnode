import { describe, it, expect } from 'vitest';
import { initGame, reducer, cartasEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
];
const cfg = { players, alcoholicMode: false, rounds: 2 };

describe('Cartas Podres engine', () => {
  it('distribui mãos de 6, tem carta preta e pick 1 ou 2', () => {
    const s = initGame(cfg);
    for (const p of players) expect(s.hands[p.id]).toHaveLength(6);
    expect(s.black).toBeTruthy();
    expect([1, 2]).toContain(s.pick);
    expect(s.submitOrder).not.toContain(players[s.judgeIdx].id);
  });

  it('todos (menos juiz) submetem pick cartas -> fase judge', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    expect(s.phase).toBe('submit');
    for (const pid of [...s.submitOrder]) {
      const cards = s.hands[pid].slice(0, s.pick);
      s = reducer(s, { type: 'SUBMIT', cards });
    }
    expect(s.phase).toBe('judge');
    expect(s.submissions).toHaveLength(players.length - 1);
    expect(s.submissions[0].cards).toHaveLength(s.pick);
  });

  it('mão é reabastecida após jogar (continua com 6, sem as cartas jogadas)', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    const pid = s.submitOrder[0];
    const cards = s.hands[pid].slice(0, s.pick);
    s = reducer(s, { type: 'SUBMIT', cards });
    expect(s.hands[pid]).toHaveLength(6);
    for (const c of cards) expect(s.hands[pid]).not.toContain(c);
  });

  it('juiz escolhe vencedor -> pontua e roundResult', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    for (const pid of [...s.submitOrder]) s = reducer(s, { type: 'SUBMIT', cards: s.hands[pid].slice(0, s.pick) });
    const winnerId = s.submissions[0].playerId;
    s = reducer(s, { type: 'JUDGE_PICK', index: 0 });
    expect(s.phase).toBe('roundResult');
    expect(s.scores[winnerId]).toBe(1);
    expect(s.winnerCards?.length).toBe(s.pick);
  });

  it('getPlayerView esconde mãos alheias e submissões antes do julgamento', () => {
    const s = initGame(cfg);
    const view = cartasEngine.getPlayerView(s, 'a');
    expect(Object.keys(view.hands)).toEqual(['a']);
    expect(view.submissions).toEqual([]);
  });
});
