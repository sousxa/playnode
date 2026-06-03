/**
 * Sincronização de salas ONLINE via Firebase Realtime Database.
 * Mesma API do localStorageSyncService, para o App escolher um ou outro
 * conforme o modo (online x mesmo aparelho). Salas vivem em /rooms/<CODE>.
 *
 * Jogadores ficam num MAPA (/rooms/<CODE>/players/<playerId>) para evitar
 * corrida quando vários entram ao mesmo tempo; o listener converte em array.
 */
import { ref, set, get, update, onValue, off, onDisconnect, push, onChildAdded, runTransaction, query, orderByChild, endAt } from 'firebase/database';
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

  /**
   * Varre e apaga salas "fantasma": as antigas (updatedAt > 2h) que ficaram
   * vazias (ninguém conectado) e qualquer sala muito velha (> 24h). É best-effort
   * e roda em segundo plano ao criar uma sala — limpa as cascas que sobram quando
   * alguém fecha a aba sem clicar em "Sair". Requer índice `.indexOn: updatedAt`.
   */
  private async sweepStaleRooms(): Promise<void> {
    if (!db) return;
    try {
      const now = Date.now();
      const STALE = 2 * 60 * 60 * 1000; // 2h sem atividade
      const HARD = 24 * 60 * 60 * 1000; // 24h = morta de vez
      const q = query(ref(db, 'rooms'), orderByChild('updatedAt'), endAt(now - STALE));
      const snap = await get(q);
      const val = snap.val();
      if (!val) return;
      const updates: Record<string, null> = {};
      for (const [code, room] of Object.entries<any>(val)) {
        const players = room?.players ? Object.keys(room.players).length : 0;
        const age = now - (room?.updatedAt ?? 0);
        if (players === 0 || age > HARD) updates[code] = null;
      }
      if (Object.keys(updates).length) await update(ref(db, 'rooms'), updates);
    } catch {
      /* sem permissão / offline: ignora */
    }
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
    void this.sweepStaleRooms(); // limpa cascas antigas em segundo plano
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
    const me = { id: playerId, name: playerName, isActive: true, hasActedThisTurn: false, joinedAt: Date.now() };
    await set(ref(db, `rooms/${clean}/players/${playerId}`), me);
    this.currentCode = clean;
    this.armDisconnect(clean, playerId);
    this.subscribe(clean);
    // Retorna a sala JÁ com o próprio jogador incluído (evita lista "sem você" no seu aparelho).
    const val = snap.val();
    val.players = { ...(val.players || {}), [playerId]: me };
    return snapshotToRoom(val);
  }

  /** Sai da sala: cancela a auto-remoção, remove o jogador e apaga a sala se ficou vazia. */
  async leaveRoom(code: string, playerId: string): Promise<void> {
    if (!db) return;
    const pRef = ref(db, `rooms/${code}/players/${playerId}`);
    try { await onDisconnect(pRef).cancel(); } catch {}
    await set(pRef, null);
    // Se não sobrou ninguém, apaga a sala inteira (evita "cascas" vazias acumulando).
    try {
      const snap = await get(ref(db, `rooms/${code}/players`));
      const remaining = snap.val();
      if (!remaining || Object.keys(remaining).length === 0) {
        await set(ref(db, `rooms/${code}`), null);
      }
    } catch {}
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

  /** Host inicia uma partida online: marca PLAYING + jogo + config (estado é criado pelo host depois). */
  startGame(code: string, mode: GameMode, config?: any): void {
    if (!db) return;
    update(ref(db, `rooms/${code}`), {
      gameMode: mode,
      status: 'PLAYING',
      config: config ? JSON.parse(JSON.stringify(config)) : null,
      gameState: null,
      updatedAt: Date.now(),
    });
  }

  /** Volta a sala pro lobby (fim de jogo / sair do jogo). */
  endGame(code: string): void {
    if (!db) return;
    update(ref(db, `rooms/${code}`), { status: 'LOBBY', gameMode: null, gameState: null, config: null, updatedAt: Date.now() });
  }

  updateGameState(code: string, gameState: any): void {
    if (!db) return;
    // set substitui o estado inteiro; sanitiza undefined (Firebase rejeita).
    set(ref(db, `rooms/${code}/gameState`), JSON.parse(JSON.stringify(gameState)));
  }

  /** Soma pontos ao ranking acumulado da sala (atômico). */
  addToRanking(code: string, scores: Record<string, number>): void {
    if (!db) return;
    runTransaction(ref(db, `rooms/${code}/ranking`), (cur: Record<string, number> | null) => {
      const next = { ...(cur || {}) };
      for (const [id, v] of Object.entries(scores)) next[id] = (next[id] || 0) + (v || 0);
      return next;
    });
  }

  /** Assina o ranking acumulado da sala. */
  onRanking(code: string, cb: (ranking: Record<string, number>) => void): () => void {
    if (!db) return () => {};
    const r = ref(db, `rooms/${code}/ranking`);
    const handler = onValue(r, (snap) => cb(snap.val() || {}));
    return () => off(r, 'value', handler);
  }

  /** Envia uma reação/zoeira para a sala (tomate, cutucada, etc.). Efêmera: some sozinha. */
  sendReaction(code: string, type: string, fromId: string, fromName: string): void {
    if (!db) return;
    const rRef = push(ref(db, `rooms/${code}/reactions`), { type, fromId, fromName, ts: Date.now() });
    // Não deixa as reações acumularem no banco: remove após uns segundos (e se cair a conexão).
    try { onDisconnect(rRef).remove(); } catch {}
    setTimeout(() => { set(rRef, null).catch(() => {}); }, 6000);
  }

  /** Escuta reações novas da sala (ignora as antigas anteriores à inscrição). */
  onReaction(code: string, cb: (r: { type: string; fromId: string; fromName: string; ts: number }) => void): () => void {
    if (!db) return () => {};
    const r = ref(db, `rooms/${code}/reactions`);
    const since = Date.now() - 1500;
    const handler = onChildAdded(r, (snap) => {
      const v = snap.val();
      if (v && v.ts >= since) cb(v);
    });
    return () => off(r, 'child_added', handler);
  }

  /** Assina o estado do jogo (engine) em tempo real. Retorna unsubscribe. */
  onGameState(code: string, cb: (gameState: any) => void): () => void {
    if (!db) return () => {};
    const gsRef = ref(db, `rooms/${code}/gameState`);
    const handler = onValue(gsRef, (snap) => cb(snap.val()));
    return () => off(gsRef, 'value', handler);
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
