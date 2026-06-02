import { describe, it, expect } from 'vitest';
import { initGame, reducer, stopEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
];

describe('Stop engine', () => {
  it('inicia na roleta com as categorias escolhidas', () => {
    const s = initGame({ players, alcoholicMode: false, rounds: 3, stopCategories: ['Nome', 'Animal', 'Cor'] });
    expect(s.phase).toBe('spin');
    expect(s.categories).toEqual(['Nome', 'Animal', 'Cor']);
    expect(s.letter).toBe('');
  });

  it('usa categorias padrão quando não escolhem', () => {
    const s = initGame({ players, alcoholicMode: false });
    expect(s.categories.length).toBeGreaterThanOrEqual(2);
  });

  it('SPIN sorteia letra e vai pra jogar; STOP -> review; NEXT avança', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 2 });
    s = reducer(s, { type: 'SPIN' });
    expect(s.phase).toBe('playing');
    expect(s.letter).toMatch(/[A-Z]/);
    const first = s.letter;
    s = reducer(s, { type: 'STOP' });
    expect(s.phase).toBe('review');
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('spin');
    expect(s.round).toBe(2);
    expect(s.usedLetters).toContain(first);
  });

  it('termina após o total de rodadas', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1 });
    s = reducer(s, { type: 'SPIN' });
    s = reducer(s, { type: 'STOP' });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
    expect(stopEngine.isOver(s)).toBe(true);
  });
});
