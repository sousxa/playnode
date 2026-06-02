import { describe, it, expect } from 'vitest';
import { initGame, reducer, checkWinner, type CidadeState } from './engine';
import type { Player } from '../../engine/types';

const players: Player[] = [
  { id: 'a', name: 'Ana' },
  { id: 'b', name: 'Bia' },
  { id: 'c', name: 'Caio' },
  { id: 'd', name: 'Davi' },
  { id: 'e', name: 'Eva' },
];
const cfg = { players, alcoholicMode: false };

const idsByRole = (s: CidadeState, role: string) => players.map((p) => p.id).filter((id) => s.roles[id] === role);

describe('Cidade Dorme engine', () => {
  it('distribui 1 assassino, 1 médico, 1 detetive e resto cidadão', () => {
    const s = initGame(cfg);
    expect(idsByRole(s, 'assassino')).toHaveLength(1);
    expect(idsByRole(s, 'medico')).toHaveLength(1);
    expect(idsByRole(s, 'detetive')).toHaveLength(1);
    expect(idsByRole(s, 'cidadao')).toHaveLength(2);
  });

  it('médico salvando a vítima evita a morte', () => {
    let s = initGame(cfg);
    for (let i = 0; i < players.length; i++) s = reducer(s, { type: 'NEXT_DISTRIBUTE' });
    expect(s.phase).toBe('night');
    const alvo = players.find((p) => s.roles[p.id] === 'cidadao')!.id;
    // ordem da fila: assassino, medico, detetive
    s = reducer(s, { type: 'NIGHT_ACTION', target: alvo }); // assassino mata alvo
    s = reducer(s, { type: 'NIGHT_ACTION', target: alvo }); // medico salva alvo
    s = reducer(s, { type: 'NIGHT_ACTION', target: alvo }); // detetive investiga
    expect(s.lastVictim).toBeNull();
    expect(s.alive[alvo]).toBe(true);
  });

  it('sem salvamento, a vítima morre', () => {
    let s = initGame(cfg);
    for (let i = 0; i < players.length; i++) s = reducer(s, { type: 'NEXT_DISTRIBUTE' });
    const med = idsByRole(s, 'medico')[0];
    const alvo = players.find((p) => s.roles[p.id] === 'cidadao')!.id;
    s = reducer(s, { type: 'NIGHT_ACTION', target: alvo });  // mata
    s = reducer(s, { type: 'NIGHT_ACTION', target: med });   // médico salva outro
    s = reducer(s, { type: 'NIGHT_ACTION', target: alvo });  // detetive
    expect(s.lastVictim).toBe(alvo);
    expect(s.alive[alvo]).toBe(false);
  });

  it('cidade vence quando o assassino é eliminado', () => {
    let s = initGame(cfg);
    const ass = idsByRole(s, 'assassino')[0];
    s = { ...s, alive: { ...s.alive, [ass]: false } };
    expect(checkWinner(s)).toBe('cidade');
  });
});
