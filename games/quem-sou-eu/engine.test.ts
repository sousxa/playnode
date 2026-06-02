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
});
