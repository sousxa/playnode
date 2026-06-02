import { describe, it, expect } from 'vitest';
import { initGame, reducer, wasImpostorCaught, impostorEngine, type ImpostorState } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Davi' },
];

const cfg = { players, alcoholicMode: false, rounds: 2 };

describe('Impostor engine', () => {
  it('distribui 1 impostor e palavra para os civis', () => {
    const s = initGame(cfg);
    expect(s.impostorIds).toHaveLength(1);
    const impostorId = s.impostorIds[0];
    expect(s.playerSecrets[impostorId].type).toBe('hint');
    for (const p of players) {
      if (p.id !== impostorId) {
        expect(s.playerSecrets[p.id].type).toBe('word');
        expect(s.playerSecrets[p.id].text).toBe(s.word);
      }
    }
  });

  it('distribute avança até a fase de dicas', () => {
    let s = initGame(cfg);
    for (let i = 0; i < players.length; i++) s = reducer(s, { type: 'NEXT_DISTRIBUTE' });
    expect(s.phase).toBe('clues');
  });

  it('impostor cai só com MAIORIA de civis votando nele', () => {
    let s = initGame(cfg);
    const impostorId = s.impostorIds[0];
    const civilians = players.filter((p) => p.id !== impostorId);
    s = { ...s, phase: 'voting', voterIdx: 0, votes: {} };
    // ordem de votação = ordem de players; cada um vota no impostor (todos civis acertam)
    // mas o impostor também "vota" — fazemos todos votarem no impostor
    for (let i = 0; i < players.length; i++) {
      s = reducer(s, { type: 'CAST_VOTE', suspectId: impostorId });
    }
    expect(s.phase).toBe('reveal');
    expect(wasImpostorCaught(s)).toBe(true);
    // cada civil que acertou ganha 1 ponto
    for (const c of civilians) expect(s.scores[c.id]).toBeGreaterThanOrEqual(1);
  });

  it('impostor escapa quando ninguém o acusa (ganha 2 pts)', () => {
    let s = initGame(cfg);
    const impostorId = s.impostorIds[0];
    const innocent = players.find((p) => p.id !== impostorId)!;
    s = { ...s, phase: 'voting', voterIdx: 0, votes: {} };
    for (let i = 0; i < players.length; i++) {
      s = reducer(s, { type: 'CAST_VOTE', suspectId: innocent.id });
    }
    expect(wasImpostorCaught(s)).toBe(false);
    expect(s.scores[impostorId]).toBe(2);
  });

  it('getPlayerView esconde palavra/impostor/votos antes do reveal', () => {
    const s = initGame(cfg);
    const impostorId = s.impostorIds[0];
    const civ = players.find((p) => p.id !== impostorId)!;
    const view = impostorEngine.getPlayerView(s, civ.id);
    expect(view.impostorIds).toEqual([]);
    expect(view.word).toBe('');
    // só vê o próprio segredo
    expect(Object.keys(view.playerSecrets)).toEqual([civ.id]);
  });

  it('termina após o total de rodadas', () => {
    let s: ImpostorState = { ...initGame(cfg), round: 2, totalRounds: 2 };
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameOver');
    expect(impostorEngine.isOver(s)).toBe(true);
  });
});
