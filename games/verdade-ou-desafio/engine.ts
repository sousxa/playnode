import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { truthDareContent, type TruthDareItem, type Intensity } from '../../content';
import { shuffle } from '../../engine/utils';

export type TODPhase = 'choose' | 'card' | 'gameOver';
export type CardKind = 'truth' | 'dare';

const ORDER: Intensity[] = ['leve', 'medio', 'pesado'];

export interface TODState {
  phase: TODPhase;
  players: Player[];
  turnIdx: number;
  truths: TruthDareItem[];
  dares: TruthDareItem[];
  usedIds: string[];
  current: { kind: CardKind; text: string } | null;
  turnsPlayed: number;
  totalTurns: number;
}

export type TODAction =
  | { type: 'CHOOSE'; kind: CardKind }
  | { type: 'NEXT' };

function filterPool(items: TruthDareItem[], config: GameConfig): TruthDareItem[] {
  const maxLevel = ORDER.indexOf(config.intensityLevel ?? 'medio');
  return items.filter(
    (i) => (config.alcoholicMode || !i.alcoholic) && ORDER.indexOf(i.intensity) <= maxLevel,
  );
}

export function initGame(config: GameConfig): TODState {
  return {
    phase: 'choose',
    players: config.players,
    turnIdx: 0,
    truths: shuffle(filterPool(truthDareContent.truths, config)),
    dares: shuffle(filterPool(truthDareContent.dares, config)),
    usedIds: [],
    current: null,
    turnsPlayed: 0,
    totalTurns: config.rounds ?? 10,
  };
}

function draw(pool: TruthDareItem[], usedIds: string[]): TruthDareItem | null {
  const avail = pool.filter((i) => !usedIds.includes(i.id));
  const src = avail.length > 0 ? avail : pool; // recicla se esgotar
  return src.length ? src[Math.floor(Math.random() * src.length)] : null;
}

export function reducer(state: TODState, action: TODAction): TODState {
  switch (action.type) {
    case 'CHOOSE': {
      const pool = action.kind === 'truth' ? state.truths : state.dares;
      const card = draw(pool, state.usedIds);
      if (!card) return state;
      return {
        ...state,
        current: { kind: action.kind, text: card.text },
        usedIds: [...state.usedIds, card.id],
        phase: 'card',
      };
    }
    case 'NEXT': {
      const turnsPlayed = state.turnsPlayed + 1;
      if (turnsPlayed >= state.totalTurns) return { ...state, turnsPlayed, phase: 'gameOver' };
      return {
        ...state,
        turnsPlayed,
        turnIdx: (state.turnIdx + 1) % state.players.length,
        current: null,
        phase: 'choose',
      };
    }
    default:
      return state;
  }
}

export const todEngine: GameEngine<TODState, TODAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: () => null, // sem placar
  getPlayerView: (s) => s, // sem dados privados
};
