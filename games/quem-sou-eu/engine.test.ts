import { describe, it, expect } from 'vitest';
import { initGame, reducer, whoAmIEngine } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
];
const cfg = { players, alcoholicMode: false };

describe('Quem Sou Eu engine', () => {
  it('atribui um personagem para cada jogador', () => {
    const s = initGame(cfg);
    for (const p of players) {
      expect(s.assignments[p.id]).toBeTruthy();
    }
  });

  it('RESOLVE correto pontua e avança o turno', () => {
    let s = initGame(cfg);
    const first = players[0];
    s = reducer(s, { type: 'RESOLVE', correct: true });
    expect(s.scores[first.id]).toBe(1);
    expect(s.turnIdx).toBe(1);
  });

  it('termina após todos os turnos', () => {
    let s = initGame(cfg);
    for (let i = 0; i < players.length; i++) s = reducer(s, { type: 'RESOLVE', correct: false });
    expect(s.phase).toBe('gameOver');
    expect(whoAmIEngine.isOver(s)).toBe(true);
  });

  it('getPlayerView esconde o personagem do próprio jogador', () => {
    const s = initGame(cfg);
    const view = whoAmIEngine.getPlayerView(s, 'a');
    expect(view.assignments['a']).toBe('');
    expect(view.assignments['b']).toBe(s.assignments['b']); // vê os outros
  });

  describe('modo roda', () => {
    const rodaCfg = { players, alcoholicMode: false, whoAmIMode: 'roda' as const };

    it('passar (correct=false) gira a vez sem marcar resolvido', () => {
      let s = initGame(rodaCfg);
      expect(s.mode).toBe('roda');
      s = reducer(s, { type: 'RESOLVE', correct: false });
      expect(s.turnIdx).toBe(1);
      expect(s.solved).toEqual([]);
      expect(s.phase).toBe('playing');
    });

    it('acertar marca resolvido, pontua por quantos ainda faltam e pula os resolvidos', () => {
      let s = initGame(rodaCfg); // turnIdx=0 (a)
      s = reducer(s, { type: 'RESOLVE', correct: true }); // a acerta: 3 travados -> +3
      expect(s.scores['a']).toBe(3);
      expect(s.solved).toEqual(['a']);
      expect(s.turnIdx).toBe(1); // b
      s = reducer(s, { type: 'RESOLVE', correct: true }); // b acerta: 2 travados -> +2
      expect(s.scores['b']).toBe(2);
      expect(s.turnIdx).toBe(2); // c (pula a, já resolvido)
    });

    it('fica no mesmo personagem até acertar: errar não tira você da roda', () => {
      let s = initGame(rodaCfg);
      s = reducer(s, { type: 'RESOLVE', correct: false }); // a passa -> b
      s = reducer(s, { type: 'RESOLVE', correct: false }); // b passa -> c
      s = reducer(s, { type: 'RESOLVE', correct: false }); // c passa -> volta pro a
      expect(s.turnIdx).toBe(0);
      expect(s.solved).toEqual([]);
    });

    it('termina quando todos acertam', () => {
      let s = initGame(rodaCfg);
      s = reducer(s, { type: 'RESOLVE', correct: true }); // a
      s = reducer(s, { type: 'RESOLVE', correct: true }); // b
      s = reducer(s, { type: 'RESOLVE', correct: true }); // c
      expect(s.phase).toBe('gameOver');
      expect(s.scores['c']).toBe(1); // último a acertar leva 1
    });
  });
});
