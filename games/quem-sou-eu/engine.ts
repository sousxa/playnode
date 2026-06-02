import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { whoAmIContent } from '../../content';
import { shuffle } from '../../engine/utils';

export type WhoAmIPhase = 'playing' | 'gameOver';

export interface WhoAmIState {
  phase: WhoAmIPhase;
  players: Player[];
  /** playerId -> personagem. O dono NÃO deve ver o próprio. */
  assignments: Record<string, string>;
  turnIdx: number;
  scores: Record<string, number>;
}

export type WhoAmIAction = { type: 'RESOLVE'; correct: boolean };

function assignCharacters(players: Player[]): Record<string, string> {
  // junta todos os personagens de todas as categorias e sorteia sem repetir
  const all = whoAmIContent.categories.flatMap((c) => c.items.map((i) => i.name));
  const picked = shuffle(all).slice(0, players.length);
  const map: Record<string, string> = {};
  players.forEach((p, i) => { map[p.id] = picked[i] ?? `Personagem ${i + 1}`; });
  return map;
}

export function initGame(config: GameConfig): WhoAmIState {
  return {
    phase: 'playing',
    players: config.players,
    assignments: assignCharacters(config.players),
    turnIdx: 0,
    scores: Object.fromEntries(config.players.map((p) => [p.id, 0])),
  };
}

export function reducer(state: WhoAmIState, action: WhoAmIAction): WhoAmIState {
  switch (action.type) {
    case 'RESOLVE': {
      const current = state.players[state.turnIdx];
      const scores = { ...state.scores };
      if (action.correct) scores[current.id] = (scores[current.id] ?? 0) + 1;
      const next = state.turnIdx + 1;
      if (next >= state.players.length) {
        return { ...state, scores, phase: 'gameOver' };
      }
      return { ...state, scores, turnIdx: next };
    }
    default:
      return state;
  }
}

export const whoAmIEngine: GameEngine<WhoAmIState, WhoAmIAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => {
    const max = Math.max(...Object.values(s.scores));
    const winners = s.players.filter((p) => (s.scores[p.id] ?? 0) === max);
    return winners.length === 1 ? winners[0] : winners;
  },
  // Esconde o personagem do próprio jogador (ele não pode saber quem é).
  getPlayerView: (s, playerId) => {
    const assignments = { ...s.assignments, [playerId]: '' };
    return { ...s, assignments };
  },
};
