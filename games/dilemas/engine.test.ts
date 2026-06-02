import { describe, it, expect } from 'vitest';
import { initGame, reducer, tallyVotes, dilemasEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
];

describe('Dilemas engine', () => {
  it('sem modo alcoólico, não inclui dilemas adultos', () => {
    const s = initGame({ players, alcoholicMode: false, rounds: 50 });
    expect(s.dilemmas.every((d) => !d.alcoholic)).toBe(true);
  });

  it('vai para results quando todos votam e conta certo', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 3 });
    s = reducer(s, { type: 'CAST_VOTE', choice: 'A' });
    s = reducer(s, { type: 'CAST_VOTE', choice: 'A' });
    expect(s.phase).toBe('voting');
    s = reducer(s, { type: 'CAST_VOTE', choice: 'B' });
    expect(s.phase).toBe('results');
    expect(tallyVotes(s)).toEqual({ a: 2, b: 1 });
  });

  it('NEXT avança e termina após o último dilema', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1 });
    players.forEach(() => { s = reducer(s, { type: 'CAST_VOTE', choice: 'A' }); });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
  });

  it('getPlayerView esconde votos antes do resultado', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 2 });
    s = reducer(s, { type: 'CAST_VOTE', choice: 'A' });
    const view = dilemasEngine.getPlayerView(s, 'b');
    expect(view.votes).toEqual({});
  });
});
