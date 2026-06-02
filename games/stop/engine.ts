import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { pickRandom } from '../../engine/utils';

// Letras comuns no português (sem K, Q, W, X, Y, Z e outras difíceis).
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

/** Pool de categorias disponíveis para escolher na config. */
export const STOP_CATEGORIES = [
  'Nome', 'Animal', 'Cor', 'Fruta', 'Comida', 'Objeto', 'País', 'Cidade',
  'Marca', 'Profissão', 'Filme ou série', 'Parte do corpo', 'Famoso',
  'Time', 'Bebida', 'Verbo', 'Banda ou cantor', 'Desenho',
];

const DEFAULT_CATEGORIES = ['Nome', 'Animal', 'Cor', 'Comida', 'Objeto', 'País'];

// Pontuação
const PTS_UNIQUE = 15; // ninguém repetiu: vale mais
const PTS_REPEAT = 5; // alguém repetiu a mesma palavra: vale menos

export type StopPhase = 'spin' | 'playing' | 'review' | 'scores' | 'gameOver';

export interface StopState {
  phase: StopPhase;
  players: Player[];
  letter: string;
  categories: string[];
  usedLetters: string[];
  round: number;
  totalRounds: number;
  /** Respostas enviadas por jogador (playerId -> categoria -> texto). */
  answers: Record<string, Record<string, string>>;
  /** Online: quem apertou STOP (congela a rodada de todos). null = ninguém ainda. */
  stoppedBy: string | null;
  /** Online: índice da categoria em revisão/votação. */
  reviewIdx: number;
  /** Online: validações por votação (categoria -> ownerId -> vale?). Verde = vale. */
  valid: Record<string, Record<string, boolean>>;
  /** Pontos acumulados na sessão (playerId -> total). */
  scores: Record<string, number>;
  /** Pontos só desta rodada (calculado ao fechar a revisão). */
  roundScores: Record<string, number>;
}

export type StopAction =
  | { type: 'SPIN' }
  | { type: 'STOP' } // local (mesmo aparelho): vai direto pra revisão simples
  | { type: 'CALL_STOP'; playerId: string; answers: Record<string, string> } // online: alguém chamou STOP
  | { type: 'SUBMIT'; playerId: string; answers: Record<string, string> }
  | { type: 'TOGGLE_VALID'; category: string; ownerId: string }
  | { type: 'REVIEW_NEXT' }
  | { type: 'NEXT' };

function drawLetter(used: string[]): string {
  const avail = LETTERS.filter((l) => !used.includes(l));
  return pickRandom(avail.length ? avail : LETTERS);
}

export function initGame(config: GameConfig): StopState {
  const categories = config.stopCategories && config.stopCategories.length >= 2 ? config.stopCategories : DEFAULT_CATEGORIES;
  const scores: Record<string, number> = {};
  for (const p of config.players) scores[p.id] = 0;
  return {
    phase: 'spin',
    players: config.players,
    letter: '',
    categories,
    usedLetters: [],
    round: 1,
    totalRounds: config.rounds ?? 5,
    answers: {},
    stoppedBy: null,
    reviewIdx: 0,
    valid: {},
    scores,
    roundScores: {},
  };
}

/** Calcula os pontos desta rodada a partir das respostas + validações. */
export function computeRoundScores(state: StopState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of state.players) out[p.id] = 0;
  for (const cat of state.categories) {
    // só contam as respostas marcadas como válidas (verde) e não-vazias
    const entries = state.players
      .map((p) => ({ id: p.id, raw: (state.answers[p.id]?.[cat] ?? '').trim() }))
      .filter((e) => e.raw.length > 0 && !!state.valid[cat]?.[e.id]);
    const counts: Record<string, number> = {};
    for (const e of entries) {
      const norm = e.raw.toLowerCase();
      counts[norm] = (counts[norm] ?? 0) + 1;
    }
    for (const e of entries) {
      const norm = e.raw.toLowerCase();
      out[e.id] += counts[norm] === 1 ? PTS_UNIQUE : PTS_REPEAT;
    }
  }
  return out;
}

export function reducer(state: StopState, action: StopAction): StopState {
  switch (action.type) {
    case 'SPIN': {
      const letter = drawLetter(state.usedLetters);
      return {
        ...state,
        letter,
        usedLetters: [...state.usedLetters, letter],
        phase: 'playing',
        answers: {},
        stoppedBy: null,
        reviewIdx: 0,
        valid: {},
        roundScores: {},
      };
    }
    case 'STOP':
      // modo mesmo aparelho: revisão simples (uma folha só)
      return { ...state, phase: 'review' };
    case 'CALL_STOP': {
      const answers = { ...state.answers, [action.playerId]: action.answers };
      const allIn = state.players.every((p) => answers[p.id] !== undefined);
      return { ...state, answers, stoppedBy: action.playerId, phase: allIn ? 'review' : state.phase, reviewIdx: 0 };
    }
    case 'SUBMIT': {
      const answers = { ...state.answers, [action.playerId]: action.answers };
      const allIn = state.players.every((p) => answers[p.id] !== undefined);
      return { ...state, answers, phase: allIn ? 'review' : state.phase, reviewIdx: allIn ? 0 : state.reviewIdx };
    }
    case 'TOGGLE_VALID': {
      const cat = { ...(state.valid[action.category] ?? {}) };
      cat[action.ownerId] = !cat[action.ownerId];
      return { ...state, valid: { ...state.valid, [action.category]: cat } };
    }
    case 'REVIEW_NEXT': {
      if (state.reviewIdx + 1 < state.categories.length) {
        return { ...state, reviewIdx: state.reviewIdx + 1 };
      }
      // fechou a última categoria -> calcula e acumula pontos
      const roundScores = computeRoundScores(state);
      const scores = { ...state.scores };
      for (const [id, v] of Object.entries(roundScores)) scores[id] = (scores[id] ?? 0) + v;
      return { ...state, phase: 'scores', roundScores, scores };
    }
    case 'NEXT': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      return {
        ...state,
        round: state.round + 1,
        phase: 'spin',
        letter: '',
        answers: {},
        stoppedBy: null,
        reviewIdx: 0,
        valid: {},
        roundScores: {},
      };
    }
    default:
      return state;
  }
}

export const stopEngine: GameEngine<StopState, StopAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => {
    const ids = Object.keys(s.scores);
    if (!ids.length) return null;
    const top = ids.reduce((a, b) => (s.scores[b] > s.scores[a] ? b : a));
    return s.players.find((p) => p.id === top) ?? null;
  },
  getPlayerView: (s) => s,
};
