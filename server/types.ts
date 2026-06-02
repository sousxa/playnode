
import { GameMode, Player } from '../types';

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  gameMode: GameMode | null;
  gameState: any;
}

export interface ServerToClientEvents {
  'room-updated': (room: Room) => void;
  'game-started': (mode: GameMode, data: any) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'create-room': (playerName: string, playerId: string) => void;
  'join-room': (code: string, playerName: string, playerId: string) => void;
  'start-game': (code: string, mode: GameMode) => void;
  'leave-room': (code: string, playerId: string) => void;
}
