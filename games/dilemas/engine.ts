import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { dilemmasContent, type DilemmaItem } from '../../content';
import { shuffle } from '../../engine/utils';

export type DilemasPhase = 'voting' | 'results' | 'gameOver';

export interface DilemasState {
  phase: DilemasPhase;
  players: Player[];
  dilemmas: DilemmaItem[];
  currentIdx: number;
  /** voterId -> escolha (do dilema atual). */
  votes: Record<string, 'A' | 'B'>;
  voterIdx: number;
}

export type DilemasAction =
  | { type: 'CAST_VOTE'; choice: 'A' | 'B'; voterId?: string }
  | { type: 'NEXT' };

/** Filtra conteúdo adulto se o modo alcoólico estiver desligado. */
function pickDilemmas(config: GameConfig): DilemmaItem[] {
  const pool = dilemmasContent.items.filter((d) => config.alcoholicMode || !d.alcoholic);
  const count = Math.min(config.rounds ?? 5, pool.length);
  return shuffle(pool).slice(0, count);
}

export function initGame(config: GameConfig): DilemasState {
  return {
    phase: 'voting',
    players: config.players,
    dilemmas: pickDilemmas(config),
    currentIdx: 0,
    votes: {},
    voterIdx: 0,
  };
}

export function reducer(state: DilemasState, action: DilemasAction): DilemasState {
  switch (action.type) {
    case 'CAST_VOTE': {
      // online: voto vem com voterId (simultâneo). local: usa o jogador da vez (sequencial).
      const voterId = action.voterId ?? state.players[state.voterIdx].id;
      const votes = { ...state.votes, [voterId]: action.choice };
      const allVoted = state.players.every((p) => votes[p.id] !== undefined);
      if (allVoted) return { ...state, votes, phase: 'results' };
      return { ...state, votes, voterIdx: action.voterId ? state.voterIdx : state.voterIdx + 1 };
    }
    case 'NEXT': {
      const nextIdx = state.currentIdx + 1;
      if (nextIdx >= state.dilemmas.length) {
        return { ...state, phase: 'gameOver' };
      }
      return { ...state, currentIdx: nextIdx, phase: 'voting', votes: {}, voterIdx: 0 };
    }
    default:
      return state;
  }
}

export function tallyVotes(state: DilemasState): { a: number; b: number } {
  const vals = Object.values(state.votes);
  return { a: vals.filter((v) => v === 'A').length, b: vals.filter((v) => v === 'B').length };
}

export const dilemasEngine: GameEngine<DilemasState, DilemasAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: () => null, // jogo de opinião, sem vencedor
  getPlayerView: (s, _playerId) => ({
    ...s,
    votes: s.phase === 'results' ? s.votes : {}, // votos ocultos até o resultado
  }),
};
