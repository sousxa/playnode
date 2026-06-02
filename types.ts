
export enum GameMode {
  IMPOSTOR = 'IMPOSTOR',
  QUEM_SOU_EU = 'QUEM_SOU_EU',
  DILEMAS = 'DILEMAS',
  AMIGOS_DE_MERDA = 'AMIGOS_DE_MERDA',
  VERDADE_OU_DESAFIO = 'VERDADE_OU_DESAFIO',
  CARTAS_PODRES = 'CARTAS_PODRES',
  STOP = 'STOP'
}

export interface Player {
  id: string;
  name: string;
  isActive: boolean; // jogador ainda está no jogo
  hasActedThisTurn: boolean; // já fez sua ação neste turno
  // Dados públicos (todos veem)
  publicData?: any;
  // Dados privados (só esse jogador vê)
  privateData?: any;
}

export interface TurnSystem {
  turnOrder: string[]; // array de player IDs na ordem dos turnos
  currentTurnIndex: number; // índice atual no turnOrder
  currentPlayerId: string; // ID do jogador atual
  turnType: 'sequential' | 'simultaneous'; // sequencial = um por vez, simultaneous = todos ao mesmo tempo
  roundNumber: number;
  phase: 'setup' | 'playing' | 'voting' | 'results' | 'finished';
}

export interface GameState {
  mode: GameMode | null;
  players: Player[];
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  turnSystem: TurnSystem;
  data: any; // Dynamic data based on game mode
  // Dados privados por jogador (só o backend conhece)
  privateData: Record<string, any>; // playerId -> dados secretos
  // Sistema de votação
  voting?: {
    currentSession?: VotingSession;
    history: VotingSession[];
  };
}

export interface ImpostorData {
  secretWord: string;
  category: string;
  impostorId: string;
  guesses: Record<string, string>; // playerId -> guess
}

export interface WhoAmIData {
  assignments: Record<string, string>; // PlayerID -> CharacterName
}

export interface DilemmaData {
  scenario: string;
  optionA: string;
  optionB: string;
  votes: Record<string, 'A' | 'B'>; // playerId -> vote
}

export enum VoteType {
  OPEN = 'OPEN',       // Votos visíveis para todos
  SECRET = 'SECRET'    // Votos secretos até o final
}

export interface VoteOption {
  id: string;
  label: string;
  description?: string;
}

export interface VotingSession {
  id: string;
  type: VoteType;
  question: string;
  options: VoteOption[];
  votes: Record<string, string>; // playerId -> optionId
  isActive: boolean;
  showResults: boolean;
  createdAt: number;
  endedAt?: number;
}

export interface VotingResult {
  optionId: string;
  count: number;
  percentage: number;
  voters: string[]; // playerIds (só para votação aberta)
}

export interface VotingSummary {
  sessionId: string;
  totalVotes: number;
  results: VotingResult[];
  winner?: string; // optionId do vencedor
  isTie: boolean;
  tieOptions?: string[]; // optionIds em caso de empate
}
