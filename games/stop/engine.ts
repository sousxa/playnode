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
export type Verdict = 'valid' | 'tie' | 'annulled' | 'empty';

export interface AnswerResult {
  answer: string;
  verdict: Verdict;
  repeated: boolean;
  pts: number;
}

export interface RoundLog {
  round: number;
  letter: string;
  results: Record<string, Record<string, AnswerResult>>; // playerId -> categoria -> resultado
  totals: Record<string, number>; // playerId -> pontos da rodada
}

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
  /** Online: timestamp (ms) em que o timer da categoria atual acaba. */
  voteEndsAt: number;
  /** Online: quem já apertou "pronto" na categoria atual (pra passar antes do tempo). */
  reviewReady: Record<string, boolean>;
  /** Online: marcações de INVÁLIDO (categoria -> dono -> votante -> marcou). Padrão = válido (verde). */
  invalidVotes: Record<string, Record<string, Record<string, boolean>>>;
  /** Pontos acumulados na sessão (playerId -> total). */
  scores: Record<string, number>;
  /** Pontos só da última rodada calculada. */
  roundScores: Record<string, number>;
  /** Relatório detalhado por rodada (pro placar final). */
  roundLog: RoundLog[];
}

export type StopAction =
  | { type: 'SPIN' }
  | { type: 'STOP' } // local (mesmo aparelho): vai direto pra revisão simples
  | { type: 'CALL_STOP'; playerId: string; answers: Record<string, string>; endsAt?: number } // online: alguém chamou STOP
  | { type: 'SUBMIT'; playerId: string; answers: Record<string, string>; endsAt?: number }
  | { type: 'TOGGLE_INVALID'; category: string; ownerId: string; voterId: string }
  | { type: 'READY'; playerId: string }
  | { type: 'REVIEW_NEXT'; endsAt?: number }
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
    voteEndsAt: 0,
    reviewReady: {},
    invalidVotes: {},
    scores,
    roundScores: {},
    roundLog: [],
  };
}

/** Jogadores que votam de verdade (cada aparelho). Locais entram "de carona" no host. */
export function realVoters(state: StopState): string[] {
  return state.players.filter((p) => !p.id.startsWith('local_')).map((p) => p.id);
}

/** Todos os aparelhos já apertaram "pronto" na categoria atual? */
export function allReviewReady(state: StopState): boolean {
  const voters = realVoters(state);
  return voters.length > 0 && voters.every((id) => !!state.reviewReady[id]);
}

/**
 * Veredito de uma resposta. Por padrão TODA resposta não-vazia começa "válida"
 * (verde); cada outro jogador pode marcá-la como inválida (vermelho). No fim:
 * - mais "vale" que "não vale" → válida
 * - empate → meio ponto (metade arredondada pra baixo)
 * - mais "não vale" → anulada
 * O dono nunca vota na própria resposta.
 */
export function answerVerdict(state: StopState, cat: string, ownerId: string): Verdict {
  const raw = (state.answers[ownerId]?.[cat] ?? '').trim();
  if (!raw) return 'empty';
  const others = state.players.length - 1;
  if (others <= 0) return 'valid';
  const invalid = Object.keys(state.invalidVotes[cat]?.[ownerId] ?? {}).length;
  const valid = others - invalid;
  if (valid > invalid) return 'valid';
  if (valid === invalid) return 'tie';
  return 'annulled';
}

/** Calcula pontos + relatório detalhado da rodada atual. */
export function computeRound(state: StopState): { scores: Record<string, number>; results: Record<string, Record<string, AnswerResult>> } {
  const scores: Record<string, number> = {};
  const results: Record<string, Record<string, AnswerResult>> = {};
  for (const p of state.players) {
    scores[p.id] = 0;
    results[p.id] = {};
  }
  for (const cat of state.categories) {
    const rows = state.players.map((p) => ({
      id: p.id,
      raw: (state.answers[p.id]?.[cat] ?? '').trim(),
      verdict: answerVerdict(state, cat, p.id),
    }));
    // duplicatas: contam só as que pontuam (válida ou empate)
    const counted = rows.filter((r) => r.verdict === 'valid' || r.verdict === 'tie');
    const counts: Record<string, number> = {};
    for (const r of counted) {
      const n = r.raw.toLowerCase();
      counts[n] = (counts[n] ?? 0) + 1;
    }
    for (const r of rows) {
      let pts = 0;
      let repeated = false;
      if (r.verdict === 'valid' || r.verdict === 'tie') {
        repeated = (counts[r.raw.toLowerCase()] ?? 0) > 1;
        const base = repeated ? PTS_REPEAT : PTS_UNIQUE;
        pts = r.verdict === 'tie' ? Math.floor(base / 2) : base;
      }
      scores[r.id] += pts;
      results[r.id][cat] = { answer: r.raw, verdict: r.verdict, repeated, pts };
    }
  }
  return { scores, results };
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
        voteEndsAt: 0,
        reviewReady: {},
        invalidVotes: {},
        roundScores: {},
      };
    }
    case 'STOP':
      // modo mesmo aparelho: revisão simples (uma folha só)
      return { ...state, phase: 'review' };
    case 'CALL_STOP': {
      const answers = { ...state.answers, [action.playerId]: action.answers };
      const allIn = state.players.every((p) => answers[p.id] !== undefined);
      return {
        ...state,
        answers,
        stoppedBy: action.playerId,
        phase: allIn ? 'review' : state.phase,
        reviewIdx: 0,
        voteEndsAt: allIn ? action.endsAt ?? 0 : state.voteEndsAt,
      };
    }
    case 'SUBMIT': {
      const answers = { ...state.answers, [action.playerId]: action.answers };
      const allIn = state.players.every((p) => answers[p.id] !== undefined);
      return {
        ...state,
        answers,
        phase: allIn ? 'review' : state.phase,
        reviewIdx: allIn ? 0 : state.reviewIdx,
        voteEndsAt: allIn ? action.endsAt ?? 0 : state.voteEndsAt,
      };
    }
    case 'TOGGLE_INVALID': {
      const cat = { ...(state.invalidVotes[action.category] ?? {}) };
      const owner = { ...(cat[action.ownerId] ?? {}) };
      if (owner[action.voterId]) delete owner[action.voterId];
      else owner[action.voterId] = true;
      cat[action.ownerId] = owner;
      return { ...state, invalidVotes: { ...state.invalidVotes, [action.category]: cat } };
    }
    case 'READY':
      return { ...state, reviewReady: { ...state.reviewReady, [action.playerId]: true } };
    case 'REVIEW_NEXT': {
      if (state.reviewIdx + 1 < state.categories.length) {
        return { ...state, reviewIdx: state.reviewIdx + 1, voteEndsAt: action.endsAt ?? 0, reviewReady: {} };
      }
      // fechou a última categoria -> calcula, registra relatório e acumula
      const { scores: roundScores, results } = computeRound(state);
      const scores = { ...state.scores };
      for (const [id, v] of Object.entries(roundScores)) scores[id] = (scores[id] ?? 0) + v;
      const log: RoundLog = { round: state.round, letter: state.letter, results, totals: roundScores };
      return { ...state, phase: 'scores', roundScores, scores, roundLog: [...state.roundLog, log] };
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
        voteEndsAt: 0,
        reviewReady: {},
        invalidVotes: {},
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
