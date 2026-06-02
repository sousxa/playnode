import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { impostorContent } from '../../content';
import { shuffle, pickRandom } from '../../engine/utils';

export type ImpostorPhase = 'distribute' | 'clues' | 'voting' | 'reveal' | 'gameOver';

export interface PlayerSecret {
  type: 'word' | 'hint';
  text: string;
}

export interface ImpostorState {
  phase: ImpostorPhase;
  players: Player[];
  impostorIds: string[];
  word: string;
  categoryLabel: string;
  /** Segredo por jogador: palavra (civil) ou dica genérica (impostor). */
  playerSecrets: Record<string, PlayerSecret>;
  /** Índice do jogador recebendo o segredo (fase distribute). */
  distributedIdx: number;
  /** Votos: voterId -> suspectId. */
  votes: Record<string, string>;
  /** Índice do votante atual (votação sequencial passa-e-joga). */
  voterIdx: number;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
  impostorCount: number;
  usedWords: string[];
}

export type ImpostorAction =
  | { type: 'NEXT_DISTRIBUTE' }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; suspectId: string }
  | { type: 'NEXT_ROUND' };

function setupRound(players: Player[], impostorCount: number, usedWords: string[]) {
  const cats = impostorContent.categories
    .map((c) => ({ ...c, items: c.items.filter((i) => !usedWords.includes(i.word)) }))
    .filter((c) => c.items.length > 0);
  const src = cats.length > 0 ? cats : impostorContent.categories;

  const category = pickRandom(src);
  const item = pickRandom(category.items);
  const genericHint = pickRandom(item.hints);

  const impostorIds = shuffle(players).slice(0, impostorCount).map((p) => p.id);

  const playerSecrets: Record<string, PlayerSecret> = {};
  for (const p of players) {
    playerSecrets[p.id] = impostorIds.includes(p.id)
      ? { type: 'hint', text: genericHint }
      : { type: 'word', text: item.word };
  }

  return {
    phase: 'distribute' as ImpostorPhase,
    impostorIds,
    word: item.word,
    categoryLabel: category.label,
    playerSecrets,
    distributedIdx: 0,
    votes: {},
    voterIdx: 0,
  };
}

export function initGame(config: GameConfig): ImpostorState {
  const players = config.players;
  const impostorCount = players.length >= 7 ? 2 : 1;
  const totalRounds = config.rounds ?? 3;
  const round = setupRound(players, impostorCount, []);
  return {
    ...round,
    players,
    round: 1,
    totalRounds,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    impostorCount,
    usedWords: [round.word],
  };
}

export function reducer(state: ImpostorState, action: ImpostorAction): ImpostorState {
  switch (action.type) {
    case 'NEXT_DISTRIBUTE': {
      const next = state.distributedIdx + 1;
      if (next >= state.players.length) {
        return { ...state, phase: 'clues' };
      }
      return { ...state, distributedIdx: next };
    }

    case 'START_VOTING':
      return { ...state, phase: 'voting', voterIdx: 0, votes: {} };

    case 'CAST_VOTE': {
      const voter = state.players[state.voterIdx];
      const votes = { ...state.votes, [voter.id]: action.suspectId };
      const nextIdx = state.voterIdx + 1;
      if (nextIdx >= state.players.length) {
        return applyScores({ ...state, votes, phase: 'reveal' });
      }
      return { ...state, votes, voterIdx: nextIdx };
    }

    case 'NEXT_ROUND': {
      if (state.round >= state.totalRounds) {
        return { ...state, phase: 'gameOver' };
      }
      const next = setupRound(state.players, state.impostorCount, state.usedWords);
      return {
        ...state,
        ...next,
        usedWords: [...state.usedWords, next.word],
        round: state.round + 1,
      };
    }

    default:
      return state;
  }
}

/** Impostor só cai se a MAIORIA dos civis votar nele. Calcula pontos. */
function applyScores(state: ImpostorState): ImpostorState {
  const scores = { ...state.scores };
  const civilianIds = state.players.map((p) => p.id).filter((id) => !state.impostorIds.includes(id));

  let civViaImpostor = 0;
  for (const voterId of civilianIds) {
    const suspect = state.votes[voterId];
    if (suspect && state.impostorIds.includes(suspect)) {
      civViaImpostor++;
      scores[voterId] = (scores[voterId] ?? 0) + 1; // acertou
    }
  }

  const caught = civilianIds.length > 0 && civViaImpostor > civilianIds.length / 2;
  if (!caught) {
    for (const id of state.impostorIds) scores[id] = (scores[id] ?? 0) + 2; // impostor escapou
  }
  return { ...state, scores };
}

export function getVoteTally(state: ImpostorState): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const suspect of Object.values(state.votes)) {
    tally[suspect] = (tally[suspect] ?? 0) + 1;
  }
  return tally;
}

export function wasImpostorCaught(state: ImpostorState): boolean {
  const civilianIds = state.players.map((p) => p.id).filter((id) => !state.impostorIds.includes(id));
  const civViaImpostor = civilianIds.filter((id) => {
    const s = state.votes[id];
    return s && state.impostorIds.includes(s);
  }).length;
  return civilianIds.length > 0 && civViaImpostor > civilianIds.length / 2;
}

export const impostorEngine: GameEngine<ImpostorState, ImpostorAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => {
    const max = Math.max(...Object.values(s.scores));
    const winners = s.players.filter((p) => (s.scores[p.id] ?? 0) === max);
    return winners.length === 1 ? winners[0] : winners;
  },
  getPlayerView: (s, playerId) => {
    const revealed = s.phase === 'reveal' || s.phase === 'gameOver';
    return {
      ...s,
      // só o próprio segredo
      playerSecrets: { [playerId]: s.playerSecrets[playerId] },
      // identidade do impostor e palavra escondidas até o reveal
      impostorIds: revealed ? s.impostorIds : [],
      word: revealed ? s.word : '',
      // votos escondidos até o reveal
      votes: revealed ? s.votes : {},
    };
  },
};
