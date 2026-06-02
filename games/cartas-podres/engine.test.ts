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
  it('distribui mãos de 5 e tem carta preta', () => {
    const s = initGame(cfg);
    for (const p of players) expect(s.hands[p.id]).toHaveLength(5);
    expect(s.black).toBeTruthy();
    expect(s.submitOrder).not.toContain(players[s.judgeIdx].id); // juiz não joga
  });

  it('todos (menos juiz) submetem -> fase judge', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    expect(s.phase).toBe('submit');
    for (const pid of [...s.submitOrder]) {
      const card = s.hands[pid][0];
      s = reducer(s, { type: 'SUBMIT', card });
    }
    expect(s.phase).toBe('judge');
    expect(s.submissions).toHaveLength(players.length - 1);
  });

  it('mão é reabastecida após jogar (continua com 5)', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    const pid = s.submitOrder[0];
    const card = s.hands[pid][0];
    s = reducer(s, { type: 'SUBMIT', card });
    expect(s.hands[pid]).toHaveLength(5);
    expect(s.hands[pid]).not.toContain(card);
  });

  it('juiz escolhe vencedor -> pontua e roundResult', () => {
    let s = initGame(cfg);
    s = reducer(s, { type: 'BEGIN' });
    for (const pid of [...s.submitOrder]) s = reducer(s, { type: 'SUBMIT', card: s.hands[pid][0] });
    const winnerId = s.submissions[0].playerId;
    s = reducer(s, { type: 'JUDGE_PICK', index: 0 });
    expect(s.phase).toBe('roundResult');
    expect(s.scores[winnerId]).toBe(1);
  });

  it('getPlayerView esconde mãos alheias e submissões antes do julgamento', () => {
    const s = initGame(cfg);
    const view = cartasEngine.getPlayerView(s, 'a');
    expect(Object.keys(view.hands)).toEqual(['a']);
    expect(view.submissions).toEqual([]);
  });
});
