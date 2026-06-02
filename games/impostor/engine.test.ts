import { describe, it, expect } from 'vitest';
import { initGame, reducer, impostorEngine, type ImpostorState } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Davi' },
];
const cfg = { players, alcoholicMode: false, rounds: 2, impostorCount: 1, categoryId: 'all' };

function voteAll(s: ImpostorState, suspectId: string): ImpostorState {
  s = { ...s, phase: 'voting', voterIdx: 0, votes: {} };
  for (let i = 0; i < players.length; i++) s = reducer(s, { type: 'CAST_VOTE', suspectId });
  return s;
}

describe('Impostor engine', () => {
  it('distribui impostor (dica) e civis (palavra)', () => {
    const s = initGame(cfg);
    expect(s.impostorIds).toHaveLength(1);
    const imp = s.impostorIds[0];
    expect(s.playerSecrets[imp].type).toBe('hint');
    for (const p of players) if (p.id !== imp) {
      expect(s.playerSecrets[p.id].type).toBe('word');
      expect(s.playerSecrets[p.id].text).toBe(s.word);
    }
  });

  it('respeita a categoria escolhida', () => {
    const s = initGame({ ...cfg, categoryId: 'esportes' });
    expect(s.categoryLabel.toLowerCase()).toContain('esporte');
  });

  it('maioria de civis no impostor -> fase guess (caught)', () => {
    let s = initGame(cfg);
    const imp = s.impostorIds[0];
    s = voteAll(s, imp);
    expect(s.caught).toBe(true);
    expect(s.phase).toBe('guess');
    // civis que acertaram pontuam
    for (const p of players) if (p.id !== imp) expect(s.scores[p.id]).toBe(1);
  });

  it('impostor pego mas adivinha a palavra -> rouba (+2)', () => {
    let s = initGame(cfg);
    const imp = s.impostorIds[0];
    s = voteAll(s, imp);
    s = reducer(s, { type: 'IMPOSTOR_GUESS', word: s.word });
    expect(s.stolen).toBe(true);
    expect(s.phase).toBe('reveal');
    expect(s.scores[imp]).toBe(2);
  });

  it('impostor escapa (ninguém acusa) -> +2 e vai direto pro reveal', () => {
    let s = initGame(cfg);
    const imp = s.impostorIds[0];
    const innocent = players.find((p) => p.id !== imp)!;
    s = voteAll(s, innocent.id);
    expect(s.caught).toBe(false);
    expect(s.phase).toBe('reveal');
    expect(s.scores[imp]).toBe(2);
  });

  it('getPlayerView esconde palavra/impostor/votos antes do reveal', () => {
    const s = initGame(cfg);
    const imp = s.impostorIds[0];
    const civ = players.find((p) => p.id !== imp)!;
    const view = impostorEngine.getPlayerView(s, civ.id);
    expect(view.impostorIds).toEqual([]);
    expect(view.word).toBe('');
    expect(Object.keys(view.playerSecrets)).toEqual([civ.id]);
  });

  it('termina após o total de rodadas', () => {
    let s: ImpostorState = { ...initGame(cfg), round: 2, totalRounds: 2 };
    s = reducer(s, { type: 'NEXT_ROUND' });
    expect(s.phase).toBe('gameOver');
    expect(impostorEngine.isOver(s)).toBe(true);
  });
});
