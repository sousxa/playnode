import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { impostorContent } from '../../content';
import { IMPOSTOR_WEAK } from '../metadata';
import { shuffle, pickRandom, sampleN } from '../../engine/utils';
import { getSeen } from '../../services/contentMemory';

export type ImpostorPhase = 'distribute' | 'clues' | 'voting' | 'guess' | 'reveal' | 'gameOver';

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
  categoryId: string;
  playerSecrets: Record<string, PlayerSecret>;
  /** Opções para o impostor tentar adivinhar a palavra (palavra real + iscas). */
  guessOptions: string[];
  distributedIdx: number;
  votes: Record<string, string>;
  voterIdx: number;
  caught: boolean;
  stolen: boolean;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
  impostorCount: number;
  usedWords: string[];
  /** Palavras vistas em partidas recentes (anti-repetição entre jogos). */
  seen: string[];
}

export type ImpostorAction =
  | { type: 'NEXT_DISTRIBUTE' }
  | { type: 'BEGIN_CLUES' }
  | { type: 'START_VOTING' }
  | { type: 'CAST_VOTE'; suspectId: string; voterId?: string }
  | { type: 'FINISH_VOTING' } // host força a apuração (caso alguém não vote / saiu)
  | { type: 'IMPOSTOR_GUESS'; word: string }
  | { type: 'NEXT_ROUND' };

/** Apura a votação atual e decide pego/escapou (reaproveitado pelo CAST_VOTE e FINISH_VOTING). */
function tallyVotes(state: ImpostorState): ImpostorState {
  const scores = { ...state.scores };
  awardCivilians(state, scores);
  const caught = civiliansCaughtImpostor(state);
  if (caught) return { ...state, scores, caught: true, phase: 'guess' };
  for (const id of state.impostorIds) scores[id] = (scores[id] ?? 0) + 2;
  return { ...state, scores, caught: false, phase: 'reveal' };
}

function buildPool(categoryId: string) {
  if (categoryId && categoryId !== 'all') {
    const only = impostorContent.categories.filter((c) => c.id === categoryId);
    if (only.length) return only;
  }
  // "Misturar": exclui categorias abstratas que rendem rodadas fracas
  return impostorContent.categories.filter((c) => !IMPOSTOR_WEAK.includes(c.id));
}

function setupRound(players: Player[], impostorCount: number, categoryId: string, usedWords: string[], seen: string[] = []) {
  const base = buildPool(categoryId);
  // 1) tira as palavras já usadas NESTA partida
  const avail = base
    .map((c) => ({ ...c, items: c.items.filter((i) => !usedWords.includes(i.word)) }))
    .filter((c) => c.items.length > 0);
  const src = avail.length > 0 ? avail : base;
  // 2) entre as restantes, prefere as não vistas em partidas recentes
  const fresh = src
    .map((c) => ({ ...c, items: c.items.filter((i) => !seen.includes(i.word)) }))
    .filter((c) => c.items.length > 0);
  const pickSrc = fresh.length > 0 ? fresh : src;

  const category = pickRandom(pickSrc);
  const item = pickRandom(category.items);
  const genericHint = pickRandom(item.hints);

  const impostorIds = shuffle(players).slice(0, impostorCount).map((p) => p.id);

  const playerSecrets: Record<string, PlayerSecret> = {};
  for (const p of players) {
    playerSecrets[p.id] = impostorIds.includes(p.id)
      ? { type: 'hint', text: genericHint }
      : { type: 'word', text: item.word };
  }

  // Iscas: outras palavras da mesma categoria (ou do pool)
  const decoyPool = category.items.map((i) => i.word).filter((w) => w !== item.word);
  const fallbackPool = pickSrc.flatMap((c) => c.items.map((i) => i.word)).filter((w) => w !== item.word);
  const decoys = sampleN(decoyPool.length >= 3 ? decoyPool : fallbackPool, 3);
  const guessOptions = shuffle([item.word, ...decoys]);

  return {
    phase: 'distribute' as ImpostorPhase,
    impostorIds,
    word: item.word,
    categoryLabel: category.label,
    playerSecrets,
    guessOptions,
    distributedIdx: 0,
    votes: {},
    voterIdx: 0,
    caught: false,
    stolen: false,
  };
}

export function initGame(config: GameConfig): ImpostorState {
  const players = config.players;
  const categoryId = config.categoryId ?? 'all';
  const impostorCount = config.impostorCount ?? (players.length >= 7 ? 2 : 1);
  const totalRounds = config.rounds ?? 3;
  const seen = getSeen('impostor');
  const round = setupRound(players, impostorCount, categoryId, [], seen);
  return {
    ...round,
    players,
    categoryId,
    round: 1,
    totalRounds,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    impostorCount,
    usedWords: [round.word],
    seen,
  };
}

/** +1 para cada civil que votou em um impostor. */
function awardCivilians(state: ImpostorState, scores: Record<string, number>) {
  for (const p of state.players) {
    if (state.impostorIds.includes(p.id)) continue;
    const suspect = state.votes[p.id];
    if (suspect && state.impostorIds.includes(suspect)) scores[p.id] = (scores[p.id] ?? 0) + 1;
  }
}

function civiliansCaughtImpostor(state: ImpostorState): boolean {
  const civIds = state.players.map((p) => p.id).filter((id) => !state.impostorIds.includes(id));
  const hits = civIds.filter((id) => {
    const s = state.votes[id];
    return s && state.impostorIds.includes(s);
  }).length;
  return civIds.length > 0 && hits > civIds.length / 2;
}

export function reducer(state: ImpostorState, action: ImpostorAction): ImpostorState {
  switch (action.type) {
    case 'NEXT_DISTRIBUTE': {
      const next = state.distributedIdx + 1;
      if (next >= state.players.length) return { ...state, phase: 'clues' };
      return { ...state, distributedIdx: next };
    }

    case 'BEGIN_CLUES':
      // Online: todos já viram seu segredo no próprio celular → vai direto pras dicas.
      return { ...state, phase: 'clues' };

    case 'START_VOTING':
      return { ...state, phase: 'voting', voterIdx: 0, votes: {} };

    case 'CAST_VOTE': {
      // online: vem com voterId (todos votam ao mesmo tempo). local: usa a ordem.
      const voterId = action.voterId ?? state.players[state.voterIdx].id;
      if (state.votes[voterId] !== undefined) return state; // já votou (ignora repetido)
      const votes = { ...state.votes, [voterId]: action.suspectId };
      const allVoted = state.players.every((p) => votes[p.id] !== undefined);
      if (!allVoted) {
        // local avança o turno; online só registra e espera os outros
        return { ...state, votes, voterIdx: action.voterId ? state.voterIdx : state.voterIdx + 1 };
      }

      // todos votaram: apura
      return tallyVotes({ ...state, votes });
    }

    case 'FINISH_VOTING':
      return state.phase === 'voting' ? tallyVotes(state) : state;

    case 'IMPOSTOR_GUESS': {
      const stolen = action.word === state.word;
      const scores = { ...state.scores };
      if (stolen) for (const id of state.impostorIds) scores[id] = (scores[id] ?? 0) + 2;
      return { ...state, scores, stolen, phase: 'reveal' };
    }

    case 'NEXT_ROUND': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      const next = setupRound(state.players, state.impostorCount, state.categoryId, state.usedWords, state.seen);
      return { ...state, ...next, usedWords: [...state.usedWords, next.word], round: state.round + 1 };
    }

    default:
      return state;
  }
}

export function getVoteTally(state: ImpostorState): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const suspect of Object.values(state.votes)) tally[suspect] = (tally[suspect] ?? 0) + 1;
  return tally;
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
    const isImpostor = s.impostorIds.includes(playerId);
    return {
      ...s,
      playerSecrets: { [playerId]: s.playerSecrets[playerId] },
      impostorIds: revealed ? s.impostorIds : [],
      word: revealed ? s.word : '',
      // opções de palpite só fazem sentido para o impostor na fase guess
      guessOptions: isImpostor || revealed ? s.guessOptions : [],
      votes: revealed ? s.votes : {},
    };
  },
};
