import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { cartasContent } from '../../content';
import { shuffle } from '../../engine/utils';
import { getSeen } from '../../services/contentMemory';

const HAND_SIZE = 6;

export type CartasPhase = 'judgeReveal' | 'submit' | 'judge' | 'roundResult' | 'gameOver';

export interface Submission {
  playerId: string;
  cards: string[]; // 1 ou 2 cartas, conforme o "pick" da carta preta
}

export interface CartasState {
  phase: CartasPhase;
  players: Player[];
  judgeIdx: number;
  black: string;
  pick: number; // quantas cartas brancas a preta pede (1 ou 2)
  hands: Record<string, string[]>;
  submitOrder: string[];
  submitIdx: number;
  submissions: Submission[];
  whiteDeck: string[];
  usedBlack: string[];
  /** Pretas vistas em partidas recentes (viés anti-repetição entre jogos). */
  seenBlack: string[];
  winnerId: string | null;
  winnerCards: string[] | null;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
}

export type CartasAction =
  | { type: 'BEGIN' }
  | { type: 'SUBMIT'; cards: string[]; playerId?: string }
  | { type: 'JUDGE_PICK'; index: number }
  | { type: 'NEXT_ROUND' };

function nonJudge(players: Player[], judgeIdx: number): string[] {
  return players.filter((_, i) => i !== judgeIdx).map((p) => p.id);
}

/** Sorteia uma carta preta não usada (1 ou 2 lacunas), evitando as vistas entre partidas. */
function drawBlack(used: string[], seen: string[] = []): { text: string; pick: number } {
  const all = cartasContent.blackCards.filter((b) => (b.pick ?? 1) <= 2);
  const pool = all.filter((b) => !used.includes(b.text));
  const fresh = pool.filter((b) => !seen.includes(b.text));
  const src = fresh.length ? fresh : pool.length ? pool : all;
  const c = src[Math.floor(Math.random() * src.length)];
  return { text: c.text, pick: c.pick ?? 1 };
}

/** Saca N cartas brancas sem repetir as que já estão em mãos; reembaralha quando acaba. */
function drawWhite(deck: string[], hands: Record<string, string[]>, n: number): { drawn: string[]; deck: string[] } {
  let d = [...deck];
  const drawn: string[] = [];
  for (let i = 0; i < n; i++) {
    if (!d.length) {
      const inUse = new Set([...Object.values(hands).flat(), ...drawn]);
      d = shuffle(cartasContent.whiteCards.map((w) => w.text).filter((t) => !inUse.has(t)));
      if (!d.length) break; // acabou mesmo (conteúdo pequeno demais)
    }
    drawn.push(d.shift()!);
  }
  return { drawn, deck: d };
}

export function initGame(config: GameConfig): CartasState {
  const players = config.players;
  let deck = shuffle(cartasContent.whiteCards.map((w) => w.text));
  const hands: Record<string, string[]> = {};
  for (const p of players) { hands[p.id] = deck.splice(0, HAND_SIZE); }
  const seenBlack = getSeen('cartas');
  const b = drawBlack([], seenBlack);
  return {
    phase: 'judgeReveal',
    players,
    judgeIdx: 0,
    black: b.text,
    pick: b.pick,
    hands,
    submitOrder: nonJudge(players, 0),
    submitIdx: 0,
    submissions: [],
    whiteDeck: deck,
    usedBlack: [b.text],
    seenBlack,
    winnerId: null,
    winnerCards: null,
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
      const pid = action.playerId ?? state.submitOrder[state.submitIdx];
      if (state.submissions.some((s) => s.playerId === pid)) return state; // já enviou
      const cards = action.cards.slice(0, state.pick);
      if (cards.length < state.pick) return state; // precisa enviar todas
      const submissions = [...state.submissions, { playerId: pid, cards }];
      // tira as cartas jogadas e repõe a mesma quantidade
      const kept = (state.hands[pid] || []).filter((c) => !cards.includes(c));
      const { drawn, deck } = drawWhite(state.whiteDeck, state.hands, cards.length);
      const hands = { ...state.hands, [pid]: [...kept, ...drawn] };
      const allSubmitted = state.submitOrder.every((id) => submissions.some((s) => s.playerId === id));
      if (allSubmitted) {
        return { ...state, hands, whiteDeck: deck, submissions: shuffle(submissions), phase: 'judge' };
      }
      return { ...state, hands, whiteDeck: deck, submissions, submitIdx: action.playerId ? state.submitIdx : state.submitIdx + 1 };
    }

    case 'JUDGE_PICK': {
      const winner = state.submissions[action.index];
      const scores = { ...state.scores };
      scores[winner.playerId] = (scores[winner.playerId] ?? 0) + 1;
      return { ...state, scores, winnerId: winner.playerId, winnerCards: winner.cards, phase: 'roundResult' };
    }

    case 'NEXT_ROUND': {
      if (state.round >= state.totalRounds) return { ...state, phase: 'gameOver' };
      const judgeIdx = (state.judgeIdx + 1) % state.players.length;
      const b = drawBlack(state.usedBlack, state.seenBlack);
      return {
        ...state,
        judgeIdx,
        black: b.text,
        pick: b.pick,
        usedBlack: [...state.usedBlack, b.text],
        submitOrder: nonJudge(state.players, judgeIdx),
        submitIdx: 0,
        submissions: [],
        winnerId: null,
        winnerCards: null,
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
    hands: { [playerId]: s.hands[playerId] ?? [] },
    submissions: s.phase === 'judge' || s.phase === 'roundResult' ? s.submissions : [],
  }),
};
