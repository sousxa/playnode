import { describe, it, expect } from 'vitest';
import { initGame, reducer, tally, amigosEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
];

describe('Amigos de Merda engine', () => {
  it('sem modo alcoólico, não inclui perguntas adultas', () => {
    const s = initGame({ players, alcoholicMode: false, rounds: 60 });
    expect(s.questions.every((q) => !q.alcoholic)).toBe(true);
  });

  it('conta votos e soma ao placar ao fim da pergunta', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 3 });
    s = reducer(s, { type: 'CAST_VOTE', targetId: 'a' });
    s = reducer(s, { type: 'CAST_VOTE', targetId: 'a' });
    expect(s.phase).toBe('voting');
    s = reducer(s, { type: 'CAST_VOTE', targetId: 'b' });
    expect(s.phase).toBe('results');
    expect(tally(s)).toEqual({ a: 2, b: 1 });
    expect(s.scores.a).toBe(2);
    expect(s.scores.b).toBe(1);
  });

  it('NEXT avança e termina após a última pergunta', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1 });
    players.forEach(() => { s = reducer(s, { type: 'CAST_VOTE', targetId: 'a' }); });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
    expect(amigosEngine.isOver(s)).toBe(true);
  });

  it('getPlayerView esconde votos antes do resultado', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 2 });
    s = reducer(s, { type: 'CAST_VOTE', targetId: 'a' });
    expect(amigosEngine.getPlayerView(s, 'b').votes).toEqual({});
  });
});
