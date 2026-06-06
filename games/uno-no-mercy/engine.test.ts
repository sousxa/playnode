import { describe, it, expect } from 'vitest';
import { initGame, reducer, canPlay, unoEngine, type UnoState, type Card } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
];

const C = (id: string, color: any, kind: any, value?: number): Card => ({ id, color, kind, value });

/** Estado controlado pra testar regras sem aleatoriedade. */
function makeState(over: Partial<UnoState> = {}): UnoState {
  const base = initGame({ players, alcoholicMode: false });
  return {
    ...base,
    hands: { a: [], b: [], c: [] },
    drawPile: Array.from({ length: 40 }, (_, i) => C(`d${i}`, 'red', 'number', i % 10)),
    discard: [C('top', 'red', 'number', 5)],
    currentColor: 'red',
    turnIdx: 0,
    direction: 1,
    pendingDraw: 0,
    eliminated: [],
    winnerId: null,
    phase: 'playing',
    ...over,
  };
}

describe('UNO No Mercy engine', () => {
  it('init: dá 7 cartas a cada jogador e abre com um número', () => {
    const s = initGame({ players, alcoholicMode: false });
    for (const p of players) expect(s.hands[p.id]).toHaveLength(7);
    expect(s.discard[0].kind).toBe('number');
    expect(s.phase).toBe('playing');
  });

  it('canPlay: combina por cor, por valor e coringa; bloqueia o resto', () => {
    const s = makeState({ currentColor: 'red', discard: [C('t', 'red', 'number', 5)] });
    expect(canPlay(C('x', 'red', 'skip'), s)).toBe(true); // mesma cor
    expect(canPlay(C('x', 'blue', 'number', 5), s)).toBe(true); // mesmo valor
    expect(canPlay(C('x', 'wild', 'wild'), s)).toBe(true); // coringa
    expect(canPlay(C('x', 'blue', 'number', 3), s)).toBe(false); // nada combina
  });

  it('com pilha de compra ativa, só vale empilhar carta de compra', () => {
    const s = makeState({ pendingDraw: 2, discard: [C('t', 'red', 'draw2')] });
    expect(canPlay(C('x', 'red', 'number', 5), s)).toBe(false);
    expect(canPlay(C('x', 'blue', 'draw2'), s)).toBe(true);
    expect(canPlay(C('x', 'wild', 'wildDraw4'), s)).toBe(true);
  });

  it('+2 empilha e o próximo que comprar leva o total', () => {
    let s = makeState({
      hands: { a: [C('a1', 'red', 'draw2'), C('a0', 'red', 'number', 9)], b: [C('b1', 'blue', 'number', 0)], c: [] },
    });
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    expect(s.pendingDraw).toBe(2);
    expect(s.turnIdx).toBe(1); // vez da Bia
    // Bia não empilha → compra a pilha
    s = reducer(s, { type: 'DRAW', playerId: 'b' });
    expect(s.pendingDraw).toBe(0);
    expect(s.hands['b'].length).toBe(1 + 2); // tinha 1, comprou 2
    expect(s.turnIdx).toBe(2); // passou pro Caio
  });

  it('jogar a última carta vence', () => {
    let s = makeState({ hands: { a: [C('a1', 'red', 'number', 5)], b: [], c: [] } });
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    expect(s.phase).toBe('gameOver');
    expect(s.winnerId).toBe('a');
    expect(s.scores['a']).toBeGreaterThan(0);
  });

  it('skip pula o próximo jogador', () => {
    let s = makeState({ hands: { a: [C('a1', 'red', 'skip'), C('a0','red','number',9)], b: [C('b1','red','number',1)], c: [C('c1','red','number',1)] } });
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    expect(s.turnIdx).toBe(2); // pulou a Bia, foi pro Caio
  });

  it('pular todos devolve a vez pro mesmo jogador', () => {
    let s = makeState({ hands: { a: [C('a1', 'red', 'skipAll'), C('a2','red','number',1)], b: [], c: [] } });
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    expect(s.turnIdx).toBe(0); // continua a Ana
  });

  it('descartar cor joga fora todas as cartas daquela cor', () => {
    let s = makeState({
      hands: { a: [C('a1', 'red', 'discardAll'), C('a2', 'red', 'number', 1), C('a3', 'blue', 'number', 2)], b: [], c: [] },
    });
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    // jogou a discardAll (vermelha) e despejou a2 (vermelha); sobra a3 azul
    expect(s.hands['a'].map((c) => c.id)).toEqual(['a3']);
  });

  it('misericórdia: 25 cartas elimina o jogador', () => {
    const bigHand = Array.from({ length: 24 }, (_, i) => C(`b${i}`, 'blue', 'number', i % 10));
    let s = makeState({
      hands: { a: [C('a1', 'red', 'draw2'), C('a0','red','number',9)], b: bigHand, c: [C('c1','red','number',0)] },
    });
    // Ana joga +2; Bia (24 cartas) compra 2 → 26 → eliminada
    s = reducer(s, { type: 'PLAY', playerId: 'a', cardId: 'a1' });
    s = reducer(s, { type: 'DRAW', playerId: 'b' });
    expect(s.eliminated).toContain('b');
  });

  it('getPlayerView esconde a mão dos outros', () => {
    const s = makeState({ hands: { a: [C('a1','red','number',1)], b: [C('b1','blue','number',2)], c: [] } });
    const view = unoEngine.getPlayerView(s, 'a');
    expect(view.hands['a']).toHaveLength(1);
    expect(view.hands['b']).toHaveLength(0); // escondida
  });
});
