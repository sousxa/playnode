
import { Room } from './types';
import { GameMode, Player } from '../types';

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(hostId: string, hostName: string): Room {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newRoom: Room = {
      code,
      hostId,
      players: [{ id: hostId, name: hostName }],
      status: 'LOBBY',
      gameMode: null,
      gameState: null
    };
    this.rooms.set(code, newRoom);
    return newRoom;
  }

  joinRoom(code: string, playerId: string, playerName: string): Room | null {
    const room = this.rooms.get(code);
    if (!room) return null;

    const exists = room.players.find(p => p.id === playerId);
    if (!exists) {
      room.players.push({ id: playerId, name: playerName });
    }
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  updateRoomStatus(code: string, status: 'LOBBY' | 'PLAYING' | 'FINISHED', mode: GameMode, data: any) {
    const room = this.rooms.get(code);
    if (room) {
      room.status = status;
      room.gameMode = mode;
      room.gameState = data;
    }
  }

  removePlayer(code: string, playerId: string) {
    const room = this.rooms.get(code);
    if (room) {
      room.players = room.players.filter(p => p.id !== playerId);
      if (room.players.length === 0) {
        this.rooms.delete(code);
      } else if (room.hostId === playerId) {
        room.hostId = room.players[0].id;
      }
    }
  }
}

export const roomManager = new RoomManager();
