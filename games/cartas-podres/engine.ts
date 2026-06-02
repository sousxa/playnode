import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { cartasContent } from '../../content';
import { shuffle } from '../../engine/utils';

const HAND_SIZE = 5;

export type CartasPhase = 'judgeReveal' | 'submit' | 'judge' | 'roundResult' | 'gameOver';

export interface Submission {
  playerId: string;
  card: string;
}

export interface CartasState {
  phase: CartasPhase;
  players: Player[];
  judgeIdx: number;
  black: string;
  hands: Record<string, string[]>;
  /** ordem dos jogadores que vão jogar nesta rodada (todos menos o juiz). */
  submitOrder: string[];
  submitIdx: number;
  submissions: Submission[];
  whiteDeck: string[];
  usedBlack: string[];
  winnerId: string | null;
  winnerCard: string | null;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
}

export type CartasAction =
  | { type: 'BEGIN' }
  | { type: 'SUBMIT'; card: string; playerId?: string }
  | { type: 'JUDGE_PICK'; index: number }
  | { type: 'NEXT_ROUND' };

function nonJudge(players: Player[], judgeIdx: number): string[] {
  return players.filter((_, i) => i !== judgeIdx).map((p) => p.id);
}

function drawBlack(used: string[]): string {
  const pool = cartasContent.blackCards.filter((b) => b.pick === 1 && !used.includes(b.text));
  const src = pool.length ? pool : cartasContent.blackCards.filter((b) => b.pick === 1);
  return src[Math.floor(Math.random() * src.length)].text;
}

export function initGame(config: GameConfig): CartasState {
  const players = config.players;
  const deck = shuffle(cartasContent.whiteCards.map((w) => w.text));
  const hands: Record<string, string[]> = {};
  for (const p of players) hands[p.id] = deck.splice(0, HAND_SIZE);
  const black = drawBlack([]);
  return {
    phase: 'judgeReveal',
    players,
    judgeIdx: 0,
    black,
    hands,
    submitOrder: nonJudge(players, 0),
    submitIdx: 0,
    submissions: [],
    whiteDeck: deck,
    usedBlack: [black],
    winnerId: null,
    winnerCard: null,
    round: 1,
    totalRounds: config.rounds ?? players.length * 2,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };
}

export function reducer(state: CartasState, action: CartasAction): CartasState {
  switch (action.type) {
    case 'BEGIN':
      return { ...state, phase: 'submit', submitIdx: 0, submissions: [] };

    case 'SUBMIT': {
      // online: vem com playerId (simultâneo). local: usa a ordem (sequencial).
      const pid = action.playerId ?? state.submitOrder[state.submitIdx];
      if (state.submissions.some((s) => s.playerId === pid)) return state; // já enviou
      const submissions = [...state.submissions, { playerId: pid, card: action.card }];
      const hand = (state.hands[pid] || []).filter((c) => c !== action.card);
      const whiteDeck = [...state.whiteDeck];
      if (whiteDeck.length) hand.push(whiteDeck.shift()!);
      const hands = { ...state.hands, [pid]: hand };
      const allSubmitted = state.submitOrder.every((id) => submissions.some((s) => s.playerId === id));
      if (allSubmitted) {
        return { ...state, hands, whiteDeck, submissions: shuffle(submissions), phase: 'judge' };
      }
      return { ...state, hands, whiteDeck, submissions, submitIdx: action.playerId ? state.submitIdx : state.submitIdx + 1 };
    }

    case 'JUDGE_PICK': {
      const winner = state.submissions[action.index];
      const scores = { ...state.scores };
      scores[winner.playerId] = (scores[winner.playerId] ?? 0) + 1;
      return { ...state, scores, winnerId: winner.playerId, winnerCard: winner.card, phase: 'roundResult' };
    }

    case 'NEXT_ROUND': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      const judgeIdx = (state.judgeIdx + 1) % state.players.length;
      const black = drawBlack(state.usedBlack);
      return {
        ...state,
        judgeIdx,
        black,
        usedBlack: [...state.usedBlack, black],
        submitOrder: nonJudge(state.players, judgeIdx),
        submitIdx: 0,
        submissions: [],
        winnerId: null,
        winnerCard: null,
        round: state.round + 1,
        phase: 'judgeReveal',
      };
    }

    default:
      return state;
  }
}

export const cartasEngine: GameEngine<CartasState, CartasAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: (s) => {
    const max = Math.max(...Object.values(s.scores));
    const winners = s.players.filter((p) => (s.scores[p.id] ?? 0) === max);
    return winners.length === 1 ? winners[0] : winners;
  },
  getPlayerView: (s, playerId) => ({
    ...s,
    // só a própria mão
    hands: { [playerId]: s.hands[playerId] ?? [] },
    // submissões escondidas até a fase de julgamento
    submissions: s.phase === 'judge' || s.phase === 'roundResult' ? s.submissions : [],
  }),
};
