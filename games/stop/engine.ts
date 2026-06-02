import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { shuffle, pickRandom, sampleN } from '../../engine/utils';

// Letras comuns no português (sem K, Q, W, X, Y, Z e outras difíceis)
const LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

const CATEGORIES = [
  'Nome', 'Animal', 'Cor', 'Fruta', 'Comida', 'Objeto', 'País', 'Cidade',
  'Marca', 'Profissão', 'Filme ou série', 'Parte do corpo', 'CEP (carro/esporte/profissão)',
  'Famoso', 'Time', 'Bebida', 'Verbo', 'Palavrão', 'Banda ou cantor',
];

const CATS_PER_ROUND = 6;

export type StopPhase = 'playing' | 'roundEnd' | 'gameOver';

export interface StopState {
  phase: StopPhase;
  players: Player[];
  letter: string;
  categories: string[];
  usedLetters: string[];
  round: number;
  totalRounds: number;
}

export type StopAction = { type: 'STOP' } | { type: 'NEXT' };

function drawLetter(used: string[]): string {
  const avail = LETTERS.filter((l) => !used.includes(l));
  return pickRandom(avail.length ? avail : LETTERS);
}

export function initGame(config: GameConfig): StopState {
  const letter = drawLetter([]);
  return {
    phase: 'playing',
    players: config.players,
    letter,
    categories: sampleN(CATEGORIES, CATS_PER_ROUND),
    usedLetters: [letter],
    round: 1,
    totalRounds: config.rounds ?? 5,
  };
}

export function reducer(state: StopState, action: StopAction): StopState {
  switch (action.type) {
    case 'STOP':
      return { ...state, phase: 'roundEnd' };
    case 'NEXT': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      const letter = drawLetter(state.usedLetters);
      return {
        ...state,
        letter,
        categories: shuffle(sampleN(CATEGORIES, CATS_PER_ROUND)),
        usedLetters: [...state.usedLetters, letter],
        round: state.round + 1,
        phase: 'playing',
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
  getWinner: () => null,
  getPlayerView: (s) => s,
};
