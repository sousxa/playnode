import { describe, it, expect } from 'vitest';
import { initGame, reducer, todEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
];

describe('Verdade ou Desafio engine', () => {
  it('intensidade leve só traz cartas leves e sem álcool quando off', () => {
    const s = initGame({ players, alcoholicMode: false, intensityLevel: 'leve', rounds: 10 });
    expect(s.truths.every((t) => t.intensity === 'leve' && !t.alcoholic)).toBe(true);
    expect(s.dares.every((d) => d.intensity === 'leve' && !d.alcoholic)).toBe(true);
  });

  it('CHOOSE saca uma carta e marca como usada', () => {
    let s = initGame({ players, alcoholicMode: true, intensityLevel: 'pesado', rounds: 10 });
    s = reducer(s, { type: 'CHOOSE', kind: 'truth' });
    expect(s.phase).toBe('card');
    expect(s.current?.kind).toBe('truth');
    expect(s.usedIds).toHaveLength(1);
  });

  it('NEXT passa a vez e termina após totalTurns', () => {
    let s = initGame({ players, alcoholicMode: false, intensityLevel: 'medio', rounds: 2 });
    s = reducer(s, { type: 'CHOOSE', kind: 'dare' });
    s = reducer(s, { type: 'NEXT' });
    expect(s.turnIdx).toBe(1);
    s = reducer(s, { type: 'CHOOSE', kind: 'truth' });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
    expect(todEngine.isOver(s)).toBe(true);
  });
});
