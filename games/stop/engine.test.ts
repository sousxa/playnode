import { describe, it, expect } from 'vitest';
import { initGame, reducer, computeRoundScores, stopEngine, type StopState } from './engine';
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
    expect(s.scores).toEqual({ a: 0, b: 0 });
  });

  it('usa categorias padrão quando não escolhem', () => {
    const s = initGame({ players, alcoholicMode: false });
    expect(s.categories.length).toBeGreaterThanOrEqual(2);
  });

  it('SPIN sorteia letra e vai pra jogar; STOP local -> review; NEXT avança', () => {
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

  it('online: CALL_STOP congela e espera todos; SUBMIT de todos -> review', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1, stopCategories: ['Nome', 'Cor'] });
    s = reducer(s, { type: 'SPIN' });
    s = reducer(s, { type: 'CALL_STOP', playerId: 'a', answers: { Nome: 'Ana', Cor: 'Azul' } });
    expect(s.stoppedBy).toBe('a');
    expect(s.phase).toBe('playing'); // ainda falta a Bia
    s = reducer(s, { type: 'SUBMIT', playerId: 'b', answers: { Nome: 'Bruno', Cor: 'Azul' } });
    expect(s.phase).toBe('review');
    expect(s.reviewIdx).toBe(0);
  });

  it('votação: TOGGLE_VALID marca verde; REVIEW_NEXT avança categorias e calcula', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1, stopCategories: ['Nome', 'Cor'] }) as StopState;
    s = reducer(s, { type: 'SPIN' });
    s.letter = 'A';
    s = reducer(s, { type: 'CALL_STOP', playerId: 'a', answers: { Nome: 'Ana', Cor: 'Azul' } });
    s = reducer(s, { type: 'SUBMIT', playerId: 'b', answers: { Nome: 'Alex', Cor: 'Azul' } });
    // valida tudo
    s = reducer(s, { type: 'TOGGLE_VALID', category: 'Nome', ownerId: 'a' });
    s = reducer(s, { type: 'TOGGLE_VALID', category: 'Nome', ownerId: 'b' });
    s = reducer(s, { type: 'TOGGLE_VALID', category: 'Cor', ownerId: 'a' });
    s = reducer(s, { type: 'TOGGLE_VALID', category: 'Cor', ownerId: 'b' });
    expect(s.valid['Nome']['a']).toBe(true);
    s = reducer(s, { type: 'REVIEW_NEXT' }); // Nome -> Cor
    expect(s.reviewIdx).toBe(1);
    s = reducer(s, { type: 'REVIEW_NEXT' }); // fecha -> scores
    expect(s.phase).toBe('scores');
    // Nome: Ana/Alex únicos = 15 cada; Cor: Azul/Azul repetido = 5 cada
    expect(s.roundScores).toEqual({ a: 20, b: 20 });
    expect(s.scores).toEqual({ a: 20, b: 20 });
  });

  it('respostas inválidas (não votadas) ou vazias valem 0', () => {
    const s: StopState = {
      ...initGame({ players, alcoholicMode: false, stopCategories: ['Nome'] }),
      letter: 'A',
      answers: { a: { Nome: 'Ana' }, b: { Nome: '' } },
      valid: { Nome: { a: false, b: false } },
    };
    const rs = computeRoundScores(s);
    expect(rs).toEqual({ a: 0, b: 0 });
  });

  it('termina após o total de rodadas e aponta vencedor', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1 });
    s = reducer(s, { type: 'SPIN' });
    s = reducer(s, { type: 'STOP' });
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('gameOver');
    expect(stopEngine.isOver(s)).toBe(true);
  });
});
