import { describe, it, expect } from 'vitest';
import { initGame, reducer, stopEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
];

describe('Stop engine', () => {
  it('inicia com letra e 6 categorias', () => {
    const s = initGame({ players, alcoholicMode: false, rounds: 3 });
    expect(s.letter).toMatch(/[A-Z]/);
    expect(s.categories).toHaveLength(6);
    expect(s.phase).toBe('playing');
  });

  it('STOP -> roundEnd; NEXT troca a letra e avança', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 3 });
    const first = s.letter;
    s = reducer(s, { type: 'STOP' });
    expect(s.phase).toBe('roundEnd');
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('playing');
    expect(s.round).toBe(2);
    expect(s.usedLetters).toContain(first);
  });

  it('termina após o total de rodadas', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1 });
    s = reducer(s, { type: 'STOP' });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
    expect(stopEngine.isOver(s)).toBe(true);
  });
});
