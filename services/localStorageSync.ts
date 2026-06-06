/**
 * Sistema de sincronização baseado em localStorage + eventos
 * Alternativa robusta ao SharedWorker que funciona melhor entre dispositivos
 */

import { GameMode } from '../types';

export interface Room {
  code: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    isActive: boolean;
    hasActedThisTurn: boolean;
  }>;
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  gameMode: GameMode | null;
  gameState: any;
  createdAt: number;
  updatedAt: number;
}

type EventListener = (room: Room) => void;
type ErrorListener = (message: string) => void;

class LocalStorageSyncService {
  private currentRoom: Room | null = null;
  private roomListeners: Set<EventListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private pollIntervalTime = 500; // Poll a cada 500ms
  private lastUpdateTimestamp = 0;

  constructor() {
    this.initPolling();
    this.setupStorageListener();
  }

  /**
   * Escuta mudanças de storage de outras abas/dispositivos
   */
  private setupStorageListener() {
    window.addEventListener('storage', (e: StorageEvent) => {
      if (e.key && e.key.startsWith('playnode_room_')) {
        console.log('[LocalStorageSync] Storage mudou de outra aba:', e.key);
        this.checkForUpdates();
      }
    });
  }

  /**
   * Poll contínuo para sincronizar salas
   */
  private initPolling() {
    this.pollInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.pollIntervalTime);
  }

  /**
   * Verifica se houve atualizações nas salas
   */
  private checkForUpdates() {
    if (!this.currentRoom) return;

    const storageKey = `playnode_room_${this.currentRoom.code}`;
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        const room = JSON.parse(stored);
        
        // Se houver atualização mais recente, dispara listeners
        if (room.updatedAt > this.lastUpdateTimestamp) {
          this.lastUpdateTimestamp = room.updatedAt;
          this.currentRoom = room;
          this.notifyListeners();
        }
      } catch (e) {
        console.error('[LocalStorageSync] Erro ao parsear sala:', e);
      }
    }
  }

  /**
   * Cria uma nova sala
   */
  createRoom(playerName: string, playerId: string): Room {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    const room: Room = {
      code,
      hostId: playerId,
      players: [{
        id: playerId,
        name: playerName,
        isActive: true,
        hasActedThisTurn: false
      }],
      status: 'LOBBY',
      gameMode: null,
      gameState: null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.currentRoom = room;
    this.lastUpdateTimestamp = room.updatedAt;
    this.saveRoom(room);
    this.notifyListeners();

    console.log(`[LocalStorageSync] ✓ Sala criada: ${code}`);
    console.log(`[LocalStorageSync] Host: ${playerName} (${playerId})`);
    return room;
  }

  /**
   * Entra em uma sala existente
   */
  joinRoom(code: string, playerName: string, playerId: string): Promise<Room> {
    return new Promise((resolve, reject) => {
      // Garantir que código é maiúsculas
      const cleanCode = code.toUpperCase().trim();
      const storageKey = `playnode_room_${cleanCode}`;
      
      console.log(`[LocalStorageSync] Tentando entrar na sala: ${cleanCode}`);
      console.log(`[LocalStorageSync] PlayerId: ${playerId}, Nome: ${playerName}`);
      
      let attempts = 0;
      const maxAttempts = 40; // 20 segundos (40 x 500ms)

      const tryJoin = () => {
        attempts++;
        
        // Log a cada 5 tentativas
        if (attempts % 5 === 0) {
          console.log(`[LocalStorageSync] Tentativa ${attempts}/${maxAttempts} para encontrar sala ${cleanCode}`);
        }

        const stored = localStorage.getItem(storageKey);

        if (stored) {
          try {
            console.log(`[LocalStorageSync] ✓ Sala ${cleanCode} encontrada em localStorage`);
            const room = JSON.parse(stored);

            // Verifica se jogador já existe
            const exists = room.players.find((p: any) => p.id === playerId);

            if (!exists) {
              // Adiciona novo jogador
              room.players.push({
                id: playerId,
                name: playerName,
                isActive: true,
                hasActedThisTurn: false
              });
              
              console.log(`[LocalStorageSync] ✓ Player ${playerName} (${playerId}) adicionado. Total: ${room.players.length}`);
            } else {
              console.log(`[LocalStorageSync] ℹ Player ${playerName} já existe na sala`);
            }

            room.updatedAt = Date.now();
            this.currentRoom = room;
            this.lastUpdateTimestamp = room.updatedAt;
            this.saveRoom(room);
            
            // Disparar listeners imediatamente (importante para mesma aba)
            this.notifyListeners();
            
            console.log(`[LocalStorageSync] ✓ Entrada na sala ${cleanCode} bem-sucedida!`);
            resolve(room);
          } catch (e) {
            console.error(`[LocalStorageSync] ✗ Erro ao processar sala: ${e}`);
            reject(new Error('Erro ao processar sala'));
          }
        } else {
          if (attempts < maxAttempts) {
            // Continua tentando
            setTimeout(tryJoin, 500);
          } else {
            console.error(`[LocalStorageSync] ✗ Sala ${cleanCode} não encontrada após ${maxAttempts} tentativas`);
            console.log(`[LocalStorageSync] Salas disponíveis: ${Object.keys(localStorage).filter(k => k.startsWith('playnode_room_')).join(', ')}`);
            reject(new Error('Sala não encontrada. Verifique o código.'));
          }
        }
      };

      tryJoin();
    });
  }

  /**
   * Adiciona um jogador localmente (modo single-device)
   */
  addLocalPlayer(code: string, playerId: string, playerName: string): void {
    if (!this.currentRoom || this.currentRoom.code !== code.toUpperCase()) {
      console.error(`[LocalStorageSync] Sala ${code} não encontrada para adicionar jogador`);
      throw new Error('Sala não encontrada');
    }

    const exists = this.currentRoom.players.find(p => p.id === playerId);
    if (exists) {
      console.warn(`[LocalStorageSync] Jogador ${playerId} já existe na sala`);
      return;
    }

    this.currentRoom.players.push({
      id: playerId,
      name: playerName,
      isActive: true,
      hasActedThisTurn: false
    });

    this.currentRoom.updatedAt = Date.now();
    this.lastUpdateTimestamp = this.currentRoom.updatedAt;
    this.saveRoom(this.currentRoom);
    this.notifyListeners();

    console.log(`[LocalStorageSync] ✓ Player ${playerName} (${playerId}) adicionado localmente. Total: ${this.currentRoom.players.length}`);
  }

  /**
   * Remove um jogador
   */
  removeLocalPlayer(code: string, playerId: string): void {
    if (!this.currentRoom || this.currentRoom.code !== code.toUpperCase()) {
      throw new Error('Sala não encontrada');
    }

    if (playerId === this.currentRoom.hostId) {
      throw new Error('Não é possível remover o host');
    }

    this.currentRoom.players = this.currentRoom.players.filter(p => p.id !== playerId);
    this.currentRoom.updatedAt = Date.now();
    this.lastUpdateTimestamp = this.currentRoom.updatedAt;
    this.saveRoom(this.currentRoom);
    this.notifyListeners();

    console.log(`[LocalStorageSync] Player removido. Total: ${this.currentRoom.players.length}`);
  }

  /**
   * Inicia um jogo
   */
  startGame(code: string, mode: GameMode, initialGameState?: any): void {
    if (!this.currentRoom || this.currentRoom.code !== code.toUpperCase()) {
      throw new Error('Sala não encontrada');
    }

    this.currentRoom.gameMode = mode;
    this.currentRoom.status = 'PLAYING';

    if (initialGameState) {
      this.currentRoom.gameState = initialGameState;
      if (initialGameState.players) {
        this.currentRoom.players = initialGameState.players;
      }
    }

    this.currentRoom.updatedAt = Date.now();
    this.lastUpdateTimestamp = this.currentRoom.updatedAt;
    this.saveRoom(this.currentRoom);
    this.notifyListeners();

    console.log(`[LocalStorageSync] Jogo iniciado em modo: ${mode}`);
  }

  /**
   * Atualiza estado do jogo
   */
  updateGameState(code: string, gameState: any): void {
    if (!this.currentRoom || this.currentRoom.code !== code.toUpperCase()) {
      throw new Error('Sala não encontrada');
    }

    this.currentRoom.gameState = gameState;
    this.currentRoom.updatedAt = Date.now();
    this.lastUpdateTimestamp = this.currentRoom.updatedAt;
    this.saveRoom(this.currentRoom);
    this.notifyListeners();
  }

  /**
   * Limpa a sala (desconectar)
   */
  clearRoom(): void {
    this.currentRoom = null;
    this.lastUpdateTimestamp = 0;
  }

  /** Paridade com o firebaseSync: sair = limpar a sala local. */
  leaveRoom(_code: string, _playerId: string): void {
    this.clearRoom();
  }

  /** Paridade com o firebaseSync (mesmo aparelho não tem migração de host). */
  claimHost(_code: string, _playerId: string): void {
    /* no-op */
  }

  /** Paridade com o firebaseSync (mesmo aparelho não sincroniza fim de jogo). */
  endGame(_code: string): void {
    /* no-op */
  }

  /**
   * Salva a sala no localStorage
   */
  private saveRoom(room: Room): void {
    const key = `playnode_room_${room.code}`;
    localStorage.setItem(key, JSON.stringify(room));
    console.log(`[LocalStorageSync] Sala ${room.code} salva no localStorage`);
  }

  /**
   * Obtém a sala atual
   */
  getCurrentRoom(): Room | null {
    return this.currentRoom;
  }

  /**
   * Registra listener para atualizações de sala
   */
  onRoomUpdated(listener: EventListener): void {
    this.roomListeners.add(listener);
  }

  /**
   * Remove listener
   */
  offRoomUpdated(listener: EventListener): void {
    this.roomListeners.delete(listener);
  }

  /**
   * Registra listener de erro
   */
  onError(listener: ErrorListener): void {
    this.errorListeners.add(listener);
  }

  /**
   * Notifica todos os listeners
   */
  private notifyListeners(): void {
    if (!this.currentRoom) return;

    this.roomListeners.forEach(listener => {
      try {
        listener(this.currentRoom!);
      } catch (e) {
        console.error('[LocalStorageSync] Erro ao notificar listener:', e);
      }
    });
  }

  /**
   * Notifica erro
   */
  private notifyError(message: string): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(message);
      } catch (e) {
        console.error('[LocalStorageSync] Erro ao notificar erro:', e);
      }
    });
  }

  /**
   * Limpa recursos
   */
  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }
}

export const localStorageSyncService = new LocalStorageSyncService();
