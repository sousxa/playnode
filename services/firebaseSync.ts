/**
 * Sincronização de salas ONLINE via Firebase Realtime Database.
 * Mesma API do localStorageSyncService, para o App escolher um ou outro
 * conforme o modo (online x mesmo aparelho). Salas vivem em /rooms/<CODE>.
 *
 * Jogadores ficam num MAPA (/rooms/<CODE>/players/<playerId>) para evitar
 * corrida quando vários entram ao mesmo tempo; o listener converte em array.
 */
import { ref, set, get, update, onValue, off, onDisconnect } from 'firebase/database';
import { db } from './firebase';
import type { GameMode } from '../types';

export interface RoomPlayer {
  id: string;
  name: string;
  isActive: boolean;
  hasActedThisTurn: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  players: RoomPlayer[];
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  gameMode: GameMode | null;
  gameState: any;
  createdAt: number;
  updatedAt: number;
}

type EventListener = (room: Room) => void;
type ErrorListener = (message: string) => void;

function genCode(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function snapshotToRoom(val: any): Room {
  const playersMap = val.players || {};
  const players: RoomPlayer[] = Object.values(playersMap).sort(
    (a: any, b: any) => (a.joinedAt ?? 0) - (b.joinedAt ?? 0),
  ) as RoomPlayer[];
  return { ...val, players };
}

class FirebaseSyncService {
  private currentCode: string | null = null;
  private currentRoom: Room | null = null;
  private roomListeners = new Set<EventListener>();
  private errorListeners = new Set<ErrorListener>();
  private unsub: (() => void) | null = null;

  /** Remove o jogador automaticamente do Firebase quando ele fecha o app / cai a conexão. */
  private armDisconnect(code: string, playerId: string) {
    if (!db) return;
    onDisconnect(ref(db, `rooms/${code}/players/${playerId}`)).remove();
  }

  private subscribe(code: string) {
    if (!db) return;
    const roomRef = ref(db, `rooms/${code}`);
    const handler = onValue(roomRef, (snap) => {
      const val = snap.val();
      if (!val) return;
      this.currentRoom = snapshotToRoom(val);
      this.roomListeners.forEach((l) => {
        try { l(this.currentRoom!); } catch (e) { console.error(e); }
      });
    });
    this.unsub = () => off(roomRef, 'value', handler);
  }

  async createRoom(playerName: string, playerId: string): Promise<Room> {
    if (!db) throw new Error('Firebase não configurado');
    const code = genCode();
    const now = Date.now();
    const room = {
      code,
      hostId: playerId,
      players: { [playerId]: { id: playerId, name: playerName, isActive: true, hasActedThisTurn: false, joinedAt: now } },
      status: 'LOBBY' as const,
      gameMode: null,
      gameState: null,
      createdAt: now,
      updatedAt: now,
    };
    await set(ref(db, `rooms/${code}`), room);
    this.currentCode = code;
    this.armDisconnect(code, playerId);
    this.subscribe(code);
    return snapshotToRoom(room);
  }

  async joinRoom(code: string, playerName: string, playerId: string): Promise<Room> {
    if (!db) throw new Error('Firebase não configurado');
    const clean = code.toUpperCase().trim();
    const snap = await get(ref(db, `rooms/${clean}`));
    if (!snap.exists()) {
      const msg = 'Sala não encontrada. Verifique o código.';
      this.errorListeners.forEach((l) => l(msg));
      throw new Error(msg);
    }
    await set(ref(db, `rooms/${clean}/players/${playerId}`), {
      id: playerId, name: playerName, isActive: true, hasActedThisTurn: false, joinedAt: Date.now(),
    });
    this.currentCode = clean;
    this.armDisconnect(clean, playerId);
    this.subscribe(clean);
    return snapshotToRoom(snap.val());
  }

  /** Sai da sala: cancela a auto-remoção e remove o jogador. */
  async leaveRoom(code: string, playerId: string): Promise<void> {
    if (!db) return;
    const pRef = ref(db, `rooms/${code}/players/${playerId}`);
    try { await onDisconnect(pRef).cancel(); } catch {}
    await set(pRef, null);
    this.clearRoom();
  }

  /** Assume o papel de host (usado quando o host anterior saiu). */
  claimHost(code: string, playerId: string): void {
    if (!db) return;
    update(ref(db, `rooms/${code}`), { hostId: playerId });
  }

  addLocalPlayer(code: string, playerId: string, playerName: string): void {
    if (!db) return;
    set(ref(db, `rooms/${code}/players/${playerId}`), {
      id: playerId, name: playerName, isActive: true, hasActedThisTurn: false, joinedAt: Date.now(),
    });
  }

  removeLocalPlayer(code: string, playerId: string): void {
    if (!db) return;
    set(ref(db, `rooms/${code}/players/${playerId}`), null);
  }

  startGame(code: string, mode: GameMode, initialGameState?: any): void {
    if (!db) return;
    update(ref(db, `rooms/${code}`), {
      gameMode: mode,
      status: 'PLAYING',
      gameState: initialGameState ?? null,
      updatedAt: Date.now(),
    });
  }

  updateGameState(code: string, gameState: any): void {
    if (!db) return;
    update(ref(db, `rooms/${code}`), { gameState, updatedAt: Date.now() });
  }

  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  onRoomUpdated(listener: EventListener): void { this.roomListeners.add(listener); }
  offRoomUpdated(listener: EventListener): void { this.roomListeners.delete(listener); }
  onError(listener: ErrorListener): void { this.errorListeners.add(listener); }

  clearRoom(): void {
    if (this.unsub) { this.unsub(); this.unsub = null; }
    this.currentCode = null;
    this.currentRoom = null;
  }

  destroy(): void {
    if (this.unsub) { this.unsub(); this.unsub = null; }
  }
}

export const firebaseSyncService = new FirebaseSyncService();
