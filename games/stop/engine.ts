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

export type StopPhase = 'spin' | 'playing' | 'review' | 'gameOver';

export interface StopState {
  phase: StopPhase;
  players: Player[];
  letter: string;
  categories: string[];
  usedLetters: string[];
  round: number;
  totalRounds: number;
}

export type StopAction = { type: 'SPIN' } | { type: 'STOP' } | { type: 'NEXT' };

function drawLetter(used: string[]): string {
  const avail = LETTERS.filter((l) => !used.includes(l));
  return pickRandom(avail.length ? avail : LETTERS);
}

export function initGame(config: GameConfig): StopState {
  const categories = config.stopCategories && config.stopCategories.length >= 2 ? config.stopCategories : DEFAULT_CATEGORIES;
  return {
    phase: 'spin',
    players: config.players,
    letter: '',
    categories,
    usedLetters: [],
    round: 1,
    totalRounds: config.rounds ?? 5,
  };
}

export function reducer(state: StopState, action: StopAction): StopState {
  switch (action.type) {
    case 'SPIN': {
      const letter = drawLetter(state.usedLetters);
      return { ...state, letter, usedLetters: [...state.usedLetters, letter], phase: 'playing' };
    }
    case 'STOP':
      return { ...state, phase: 'review' };
    case 'NEXT': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      return { ...state, round: state.round + 1, phase: 'spin', letter: '' };
    }
    default:
      return state;
  }
}

export const stopEngine: GameEngine<StopState, StopAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: () => null,
  getPlayerView: (s) => s,
};
