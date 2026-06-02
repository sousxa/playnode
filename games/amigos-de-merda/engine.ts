import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { amigosContent, type MostLikelyItem } from '../../content';
import { shuffle } from '../../engine/utils';

export type AmigosPhase = 'voting' | 'results' | 'gameOver';

export interface AmigosState {
  phase: AmigosPhase;
  players: Player[];
  questions: MostLikelyItem[];
  currentIdx: number;
  /** voterId -> alvo votado (pergunta atual). */
  votes: Record<string, string>;
  voterIdx: number;
  /** votos recebidos no total (define o "pior do grupo"). */
  scores: Record<string, number>;
}

export type AmigosAction =
  | { type: 'CAST_VOTE'; targetId: string }
  | { type: 'NEXT' };

function pickQuestions(config: GameConfig): MostLikelyItem[] {
  const pool = amigosContent.questions.filter((q) => config.alcoholicMode || !q.alcoholic);
  const count = Math.min(config.rounds ?? 6, pool.length);
  return shuffle(pool).slice(0, count);
}

export function initGame(config: GameConfig): AmigosState {
  return {
    phase: 'voting',
    players: config.players,
    questions: pickQuestions(config),
    currentIdx: 0,
    votes: {},
    voterIdx: 0,
    scores: Object.fromEntries(config.players.map((p) => [p.id, 0])),
  };
}

export function tally(state: AmigosState): Record<string, number> {
  const t: Record<string, number> = {};
  for (const target of Object.values(state.votes)) t[target] = (t[target] ?? 0) + 1;
  return t;
}

export function reducer(state: AmigosState, action: AmigosAction): AmigosState {
  switch (action.type) {
    case 'CAST_VOTE': {
      const voter = state.players[state.voterIdx];
      const votes = { ...state.votes, [voter.id]: action.targetId };
      const next = state.voterIdx + 1;
      if (next < state.players.length) return { ...state, votes, voterIdx: next };
      // todos votaram → soma os votos recebidos ao placar e mostra resultado
      const scores = { ...state.scores };
      for (const target of Object.values(votes)) scores[target] = (scores[target] ?? 0) + 1;
      return { ...state, votes, scores, phase: 'results' };
    }
    case 'NEXT': {
      const nextIdx = state.currentIdx + 1;
      if (nextIdx >= state.questions.length) return { ...state, phase: 'gameOver' };
      return { ...state, currentIdx: nextIdx, phase: 'voting', votes: {}, voterIdx: 0 };
    }
    default:
      return state;
  }
}

export const amigosEngine: GameEngine<AmigosState, AmigosAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => {
    const max = Math.max(...Object.values(s.scores));
    const winners = s.players.filter((p) => (s.scores[p.id] ?? 0) === max);
    return winners.length === 1 ? winners[0] : winners;
  },
  getPlayerView: (s, _playerId) => ({
    ...s,
    votes: s.phase === 'results' ? s.votes : {},
  }),
};
