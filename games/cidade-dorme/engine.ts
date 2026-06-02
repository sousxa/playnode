import type { GameConfig, GameEngine, Player } from '../../engine/types';
import { shuffle } from '../../engine/utils';

export type Role = 'assassino' | 'medico' | 'detetive' | 'cidadao';
export type CidadePhase = 'distribute' | 'night' | 'nightResult' | 'day' | 'dayResult' | 'gameOver';
export type NightRole = 'assassino' | 'medico' | 'detetive';

export interface CidadeState {
  phase: CidadePhase;
  players: Player[];
  roles: Record<string, Role>;
  alive: Record<string, boolean>;
  distributeIdx: number;
  // noite
  nightQueue: NightRole[];
  nightStepIdx: number;
  killTarget: string | null;
  saveTarget: string | null;
  checkTarget: string | null;
  lastVictim: string | null; // quem morreu na última noite (null = ninguém)
  // dia
  dayVoters: string[];
  dayVoterIdx: number;
  dayVotes: Record<string, string>;
  lastEliminated: string | null;
  dayNumber: number;
  winner: 'cidade' | 'mafia' | null;
}

export type CidadeAction =
  | { type: 'NEXT_DISTRIBUTE' }
  | { type: 'BEGIN_NIGHT' }
  | { type: 'NIGHT_ACTION'; target: string }
  | { type: 'START_DAY' }
  | { type: 'DAY_VOTE'; target: string; voterId?: string }
  | { type: 'NEXT' };

function assignRoles(players: Player[]): Record<string, Role> {
  const order = shuffle(players);
  const roles: Record<string, Role> = {};
  order.forEach((p, i) => {
    if (i === 0) roles[p.id] = 'assassino';
    else if (i === 1) roles[p.id] = 'medico';
    else if (i === 2) roles[p.id] = 'detetive';
    else roles[p.id] = 'cidadao';
  });
  return roles;
}

function aliveIds(s: CidadeState): string[] {
  return s.players.filter((p) => s.alive[p.id]).map((p) => p.id);
}

function buildNightQueue(s: CidadeState): NightRole[] {
  const order: NightRole[] = ['assassino', 'medico', 'detetive'];
  return order.filter((role) => s.players.some((p) => s.roles[p.id] === role && s.alive[p.id]));
}

function checkWinner(s: CidadeState): 'cidade' | 'mafia' | null {
  const alive = aliveIds(s);
  const mafia = alive.filter((id) => s.roles[id] === 'assassino').length;
  const others = alive.length - mafia;
  if (mafia === 0) return 'cidade';
  if (mafia >= others) return 'mafia';
  return null;
}

export function initGame(config: GameConfig): CidadeState {
  const players = config.players;
  const roles = assignRoles(players);
  const alive = Object.fromEntries(players.map((p) => [p.id, true]));
  const base: CidadeState = {
    phase: 'distribute',
    players,
    roles,
    alive,
    distributeIdx: 0,
    nightQueue: [],
    nightStepIdx: 0,
    killTarget: null,
    saveTarget: null,
    checkTarget: null,
    lastVictim: null,
    dayVoters: [],
    dayVoterIdx: 0,
    dayVotes: {},
    lastEliminated: null,
    dayNumber: 1,
    winner: null,
  };
  return base;
}

function startNight(s: CidadeState): CidadeState {
  return {
    ...s,
    phase: 'night',
    nightQueue: buildNightQueue(s),
    nightStepIdx: 0,
    killTarget: null,
    saveTarget: null,
    checkTarget: null,
  };
}

export function reducer(state: CidadeState, action: CidadeAction): CidadeState {
  switch (action.type) {
    case 'NEXT_DISTRIBUTE': {
      const next = state.distributeIdx + 1;
      if (next >= state.players.length) return startNight(state);
      return { ...state, distributeIdx: next };
    }

    case 'BEGIN_NIGHT':
      // Online: todos já viram o papel no próprio celular → anoitece direto.
      return startNight(state);

    case 'NIGHT_ACTION': {
      const role = state.nightQueue[state.nightStepIdx];
      let s = { ...state };
      if (role === 'assassino') s.killTarget = action.target;
      else if (role === 'medico') s.saveTarget = action.target;
      else if (role === 'detetive') s.checkTarget = action.target;

      const nextStep = state.nightStepIdx + 1;
      if (nextStep < state.nightQueue.length) {
        return { ...s, nightStepIdx: nextStep };
      }
      // resolve a noite
      const victim = s.killTarget && s.killTarget !== s.saveTarget ? s.killTarget : null;
      const alive = { ...s.alive };
      if (victim) alive[victim] = false;
      s = { ...s, alive, lastVictim: victim, phase: 'nightResult' };
      const winner = checkWinner(s);
      return winner ? { ...s, winner, phase: 'gameOver' } : s;
    }

    case 'START_DAY': {
      return {
        ...state,
        phase: 'day',
        dayVoters: aliveIds(state),
        dayVoterIdx: 0,
        dayVotes: {},
      };
    }

    case 'DAY_VOTE': {
      // online: voto com voterId (simultâneo). local: jogador da vez (sequencial).
      const voter = action.voterId ?? state.dayVoters[state.dayVoterIdx];
      const dayVotes = { ...state.dayVotes, [voter]: action.target };
      const allVoted = state.dayVoters.every((id) => dayVotes[id] !== undefined);
      if (!allVoted) {
        return { ...state, dayVotes, dayVoterIdx: action.voterId ? state.dayVoterIdx : state.dayVoterIdx + 1 };
      }
      // apura: mais votado é eliminado
      const tally: Record<string, number> = {};
      for (const t of Object.values(dayVotes)) tally[t] = (tally[t] ?? 0) + 1;
      let elim = '';
      let max = -1;
      for (const [id, n] of Object.entries(tally)) if (n > max) { max = n; elim = id; }
      const alive = { ...state.alive, [elim]: false };
      let s: CidadeState = { ...state, dayVotes, alive, lastEliminated: elim, phase: 'dayResult' };
      const winner = checkWinner(s);
      if (winner) s = { ...s, winner, phase: 'gameOver' };
      return s;
    }

    case 'NEXT': {
      if (state.winner) return { ...state, phase: 'gameOver' };
      return startNight({ ...state, dayNumber: state.dayNumber + 1 });
    }

    default:
      return state;
  }
}

export { aliveIds, checkWinner };

export const cidadeEngine: GameEngine<CidadeState, CidadeAction> = {
  init: initGame,
  reducer,
  isOver: (s) => s.phase === 'gameOver',
  getWinner: () => null,
  // cada jogador só enxerga o próprio papel
  getPlayerView: (s, playerId) => ({
    ...s,
    roles: { [playerId]: s.roles[playerId] },
  }),
};
