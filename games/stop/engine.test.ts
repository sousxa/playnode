import { describe, it, expect } from 'vitest';
import { initGame, reducer, computeRound, answerVerdict, allReviewReady, stopEngine, type StopState } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
];

const trio: Player[] = [...players, { id: 'c', name: 'Caio' }];

describe('Stop engine', () => {
  it('inicia na roleta com as categorias escolhidas', () => {
    const s = initGame({ players, alcoholicMode: false, rounds: 3, stopCategories: ['Nome', 'Animal', 'Cor'] });
    expect(s.phase).toBe('spin');
    expect(s.categories).toEqual(['Nome', 'Animal', 'Cor']);
    expect(s.letter).toBe('');
    expect(s.scores).toEqual({ a: 0, b: 0 });
  });

  it('SPIN -> playing; STOP local -> review; NEXT avança', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 2 });
    s = reducer(s, { type: 'SPIN' });
    expect(s.phase).toBe('playing');
    const first = s.letter;
    s = reducer(s, { type: 'STOP' });
    expect(s.phase).toBe('review');
    s = reducer(s, { type: 'NEXT' });
    expect(s.phase).toBe('spin');
    expect(s.round).toBe(2);
    expect(s.usedLetters).toContain(first);
  });

  it('online: CALL_STOP congela e espera todos; SUBMIT de todos -> review com deadline', () => {
    let s = initGame({ players, alcoholicMode: false, rounds: 1, stopCategories: ['Nome', 'Cor'] });
    s = reducer(s, { type: 'SPIN' });
    s = reducer(s, { type: 'CALL_STOP', playerId: 'a', answers: { Nome: 'Ana', Cor: 'Azul' } });
    expect(s.stoppedBy).toBe('a');
    expect(s.phase).toBe('playing');
    s = reducer(s, { type: 'SUBMIT', playerId: 'b', answers: { Nome: 'Alex', Cor: 'Azul' }, endsAt: 1000 });
    expect(s.phase).toBe('review');
    expect(s.reviewIdx).toBe(0);
    expect(s.voteEndsAt).toBe(1000);
  });

  it('padrão é VÁLIDO (verde); maioria de inválidos anula', () => {
    let s = initGame({ players: trio, alcoholicMode: false, stopCategories: ['Nome'] }) as StopState;
    s.answers = { a: { Nome: 'Ana' }, b: { Nome: 'Bia' }, c: { Nome: 'Caio' } };
    // ninguém marca: todas válidas por padrão
    expect(answerVerdict(s, 'Nome', 'a')).toBe('valid');
    // 2 dos outros marcam a resposta de 'a' como inválida -> anulada
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'b' });
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'c' });
    expect(answerVerdict(s, 'Nome', 'a')).toBe('annulled');
  });

  it('empate de votos -> meio ponto (metade arredondada pra baixo)', () => {
    let s = initGame({ players: trio, alcoholicMode: false, stopCategories: ['Nome'] }) as StopState;
    s.answers = { a: { Nome: 'Ana' }, b: { Nome: 'Bia' }, c: { Nome: 'Caio' } };
    // resposta de 'a': 2 outros (b,c). 1 marca inválido -> 1 vale x 1 não = empate
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'b' });
    expect(answerVerdict(s, 'Nome', 'a')).toBe('tie');
    const { scores } = computeRound(s);
    expect(scores.a).toBe(7); // única no empate = floor(15/2)
  });

  it('TOGGLE_INVALID toggla (clicar de novo volta a válido)', () => {
    let s = initGame({ players: trio, alcoholicMode: false, stopCategories: ['Nome'] }) as StopState;
    s.answers = { a: { Nome: 'Ana' } };
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'b' });
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'c' });
    expect(answerVerdict(s, 'Nome', 'a')).toBe('annulled');
    s = reducer(s, { type: 'TOGGLE_INVALID', category: 'Nome', ownerId: 'a', voterId: 'b' }); // desfaz
    expect(answerVerdict(s, 'Nome', 'a')).toBe('tie');
  });

  it('pontuação: única=15, repetida=5, vazia/anulada=0; gera relatório', () => {
    let s = initGame({ players: trio, alcoholicMode: false, rounds: 1, stopCategories: ['Nome', 'Cor'] }) as StopState;
    s = reducer(s, { type: 'SPIN' });
    s.letter = 'A';
    s = reducer(s, { type: 'SUBMIT', playerId: 'a', answers: { Nome: 'Ana', Cor: 'Azul' } });
    s = reducer(s, { type: 'SUBMIT', playerId: 'b', answers: { Nome: 'Alex', Cor: 'Azul' } });
    s = reducer(s, { type: 'SUBMIT', playerId: 'c', answers: { Nome: 'Ari', Cor: '' } });
    expect(s.phase).toBe('review');
    // ninguém marca inválido -> tudo válido por padrão
    s = reducer(s, { type: 'REVIEW_NEXT' }); // Nome -> Cor
    s = reducer(s, { type: 'REVIEW_NEXT' }); // fecha -> scores
    expect(s.phase).toBe('scores');
    // Nome: Ana/Alex/Ari únicos = 15 cada. Cor: Azul/Azul repetidos = 5 cada; Caio vazio = 0
    expect(s.roundScores).toEqual({ a: 20, b: 20, c: 15 });
    expect(s.scores).toEqual({ a: 20, b: 20, c: 15 });
    // relatório
    expect(s.roundLog).toHaveLength(1);
    expect(s.roundLog[0].results.a.Nome).toMatchObject({ verdict: 'valid', repeated: false, pts: 15 });
    expect(s.roundLog[0].results.a.Cor).toMatchObject({ verdict: 'valid', repeated: true, pts: 5 });
    expect(s.roundLog[0].results.c.Cor).toMatchObject({ verdict: 'empty', pts: 0 });
  });

  it('READY: só passa quando todos os aparelhos estão prontos (locais não contam)', () => {
    let s = initGame({ players: [...trio, { id: 'local_x', name: 'Convidado' }], alcoholicMode: false, stopCategories: ['Nome'] }) as StopState;
    expect(allReviewReady(s)).toBe(false);
    s = reducer(s, { type: 'READY', playerId: 'a' });
    s = reducer(s, { type: 'READY', playerId: 'b' });
    expect(allReviewReady(s)).toBe(false); // falta 'c' (local_x não conta)
    s = reducer(s, { type: 'READY', playerId: 'c' });
    expect(allReviewReady(s)).toBe(true);
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
