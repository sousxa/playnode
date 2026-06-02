
// Simulação de Socket.io usando SharedWorker para permitir testes entre navegadores
import { GameMode } from '../types';
import { generateImpostorContent, generateWhoAmICharacters, generateDilemma } from './geminiService';

class SocketService {
  private worker: SharedWorker | null = null;
  private listeners: Record<string, Function[]> = {};
  private currentRoom: any = null;
  private joinPendingRequests: Map<string, { resolve: Function; timeout: NodeJS.Timeout }> = new Map();

  constructor() {
    this.initSharedWorker();
  }

  private initSharedWorker() {
    try {
      // Create a blob URL for the worker script
      const workerScript = `
        const rooms = new Map();
        const clients = new Map(); // port -> playerId

        self.onconnect = function(e) {
          const port = e.ports[0];
          
          port.onmessage = function(event) {
            const { type, payload, clientId } = event.data;

            if (type === 'create-room') {
              // Host criando uma nova sala
              rooms.set(payload.code, payload);
              clients.set(port, payload.hostId);
              
              // Broadcast para todos os clientes
              clients.forEach((playerId, clientPort) => {
                const filteredRoom = filterGameStateForPlayer(payload, playerId);
                clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
              });
            } 
            else if (type === 'join-room') {
              // Novo jogador tentando entrar
              const room = rooms.get(payload.code);
              
              if (room) {
                // Registra o novo client
                clients.set(port, payload.playerId);
                
                // Verifica se jogador já existe (evita duplicação)
                const exists = room.players.find((p: any) => p.id === payload.playerId);
                if (!exists) {
                  // Adiciona novo jogador ao array
                  room.players.push({ 
                    id: payload.playerId, 
                    name: payload.playerName,
                    isActive: true,
                    hasActedThisTurn: false
                  });
                  
                  console.log('Player adicionado. Total agora:', room.players.length);
                }
                
                // Broadcast para TODOS os clientes (incluindo o que acabou de entrar)
                clients.forEach((playerId, clientPort) => {
                  const filteredRoom = filterGameStateForPlayer(room, playerId);
                  clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
                });
              }
            } 
            else if (type === 'update-room') {
              // Atualização geral da sala
              const updatedRoom = payload;
              rooms.set(updatedRoom.code, updatedRoom);
              
              // Broadcast para todos os clientes
              clients.forEach((playerId, clientPort) => {
                const filteredRoom = filterGameStateForPlayer(updatedRoom, playerId);
                clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
              });
            } 
            else if (type === 'request-sync') {
              // Cliente solicitando sincronização (ex: ao recarregar)
              rooms.forEach((room, code) => {
                const filteredRoom = filterGameStateForPlayer(room, clientId);
                port.postMessage({ type: 'sync-room', payload: filteredRoom });
              });
            }
          };

          port.onclose = function() {
            console.log('Client desconectado');
            clients.delete(port);
          };
        };

        function filterGameStateForPlayer(room, playerId) {
          const filteredRoom = { ...room };
          
          // Manter players[] completo para todos (não filtrar)
          // Cada jogador precisa ver TODOS os outros jogadores
          if (filteredRoom.gameState && filteredRoom.gameState.players) {
            filteredRoom.gameState.players = filteredRoom.gameState.players.map(player => ({
              ...player,
              // Apenas filtrar dados privados do jogador
              privateData: player.id === playerId ? player.privateData : undefined
            }));
          }

          // Filtrar dados privados globais
          if (filteredRoom.gameState && filteredRoom.gameState.privateData) {
            filteredRoom.gameState.privateData = {
              [playerId]: filteredRoom.gameState.privateData[playerId] || null
            };
          }

          return filteredRoom;
        }
      `;

      const blob = new Blob([workerScript], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);

      this.worker = new SharedWorker(workerUrl);

      this.worker.port.onmessage = (event) => {
        const { type, payload } = event.data;
        console.log(`[SharedWorker Received] ${type}`, payload);

        if (type === 'sync-room') {
          this.currentRoom = payload;
          this.saveRoomToStorage(payload);
          this.trigger('room-updated', payload);

          // Resolve any pending join requests for this room
          if (this.joinPendingRequests.has(payload.code)) {
            const pending = this.joinPendingRequests.get(payload.code);
            if (pending) {
              clearTimeout(pending.timeout);
              pending.resolve(payload);
              this.joinPendingRequests.delete(payload.code);
            }
          }
        }
      };

      this.worker.port.start();
    } catch (error) {
      console.warn('SharedWorker not supported, falling back to BroadcastChannel');
      this.fallbackToBroadcastChannel();
    }
  }

  private fallbackToBroadcastChannel() {
    const channel = new BroadcastChannel('playnode_room_sync');

    channel.onmessage = (event) => {
      const { type, payload } = event.data;
      console.log(`[BroadcastChannel Received] ${type}`, payload);

      if (type === 'sync-room') {
        this.currentRoom = payload;
        this.saveRoomToStorage(payload);
        this.trigger('room-updated', payload);

        if (this.joinPendingRequests.has(payload.code)) {
          const pending = this.joinPendingRequests.get(payload.code);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(payload);
            this.joinPendingRequests.delete(payload.code);
          }
        }
      }

      if (type === 'request-sync' && this.currentRoom && this.currentRoom.hostId === localStorage.getItem('pnode_pid')) {
        channel.postMessage({ type: 'sync-room', payload: this.currentRoom });
      }
    };

    this.worker = { port: channel } as any;
  }

  private broadcast(type: string, payload: any) {
    if (this.worker) {
      this.worker.port.postMessage({ type, payload, clientId: localStorage.getItem('pnode_pid') });
    }
  }

  private trigger(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  private saveRoomToStorage(room: any) {
    localStorage.setItem(`pnode_room_${room.code}`, JSON.stringify(room));
  }

  private getRoomFromStorage(code: string) {
    const stored = localStorage.getItem(`pnode_room_${code}`);
    return stored ? JSON.parse(stored) : null;
  }

  // Filtra dados do jogo para um jogador específico
  private filterGameStateForPlayer(fullGameState: any, playerId: string): any {
    if (!fullGameState) return fullGameState;

    const filteredState = { ...fullGameState };

    // Remove dados privados globais que não são desse jogador
    if (filteredState.privateData) {
      filteredState.privateData = {
        [playerId]: filteredState.privateData[playerId] || null
      };
    }

    // Atualiza dados privados dos jogadores
    filteredState.players = filteredState.players.map((player: any) => ({
      ...player,
      privateData: player.id === playerId ? player.privateData : undefined
    }));

    return filteredState;
  }

  // Envia estado filtrado para um cliente específico
  private sendFilteredStateToClient(clientPort: any, room: any, playerId: string) {
    const filteredRoom = {
      ...room,
      gameState: this.filterGameStateForPlayer(room.gameState, playerId)
    };
    clientPort.postMessage({ type: 'sync-room', payload: filteredRoom });
  }

  connect() {
    console.log("PlayNode Sync Ativo (SharedWorker/BroadcastChannel)");
    // Request sync from any existing rooms
    this.broadcast('request-sync', { pid: localStorage.getItem('pnode_pid') });
  }

  createRoom(playerName: string, playerId: string) {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.currentRoom = {
      code,
      hostId: playerId,
      players: [{ id: playerId, name: playerName }],
      status: 'LOBBY',
      gameMode: null,
      gameState: null
    };
    this.saveRoomToStorage(this.currentRoom);
    this.trigger('room-updated', this.currentRoom);
    this.broadcast('create-room', this.currentRoom);
  }

  /**
   * Modo Single-Device: Adicionar jogador manualmente pela host
   * Útil quando todos os jogadores estão no mesmo dispositivo
   */
  addLocalPlayer(code: string, playerId: string, playerName: string) {
    if (!this.currentRoom || this.currentRoom.code !== code) {
      throw new Error('Sala não encontrada');
    }

    // Verificar se é host
    // (Note: This check is done on the UI level, but we can add backend validation if needed)

    // Verificar se jogador já existe
    const exists = this.currentRoom.players.find((p: any) => p.id === playerId);
    if (exists) {
      console.warn(`[SingleDevice] Jogador ${playerId} já existe`);
      return;
    }

    // Adicionar jogador
    this.currentRoom.players.push({
      id: playerId,
      name: playerName,
      isActive: true,
      hasActedThisTurn: false
    });

    console.log(`[SingleDevice] Player ${playerId} (${playerName}) adicionado. Total agora: ${this.currentRoom.players.length}`);

    // Salvar e sincronizar
    this.saveRoomToStorage(this.currentRoom);
    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  /**
   * Modo Single-Device: Remover jogador
   */
  removeLocalPlayer(code: string, playerId: string) {
    if (!this.currentRoom || this.currentRoom.code !== code) {
      throw new Error('Sala não encontrada');
    }

    // Não permitir remover host
    if (playerId === this.currentRoom.hostId) {
      throw new Error('Não é possível remover o host');
    }

    // Remover jogador
    this.currentRoom.players = this.currentRoom.players.filter((p: any) => p.id !== playerId);

    console.log(`[SingleDevice] Player ${playerId} removido. Total agora: ${this.currentRoom.players.length}`);

    // Salvar e sincronizar
    this.saveRoomToStorage(this.currentRoom);
    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  joinRoom(code: string, playerName: string, playerId: string) {
    return new Promise<void>((resolve, reject) => {
      // First, try to get room from localStorage
      let room = this.getRoomFromStorage(code);

      if (room) {
        // Room found in storage
        const exists = room.players.find((p: any) => p.id === playerId);
        
        // IMPORTANTE: Apenas adiciona se NÃO existe já
        if (!exists) {
          room.players.push({ 
            id: playerId, 
            name: playerName,
            isActive: true,
            hasActedThisTurn: false 
          });
          console.log(`[Local Storage] Player ${playerId} adicionado. Total agora: ${room.players.length}`);
          this.saveRoomToStorage(room);
        }
        
        this.currentRoom = room;
        this.trigger('room-updated', room);
        this.broadcast('update-room', room);
        resolve();
        return;
      }

      // Room not in storage, request sync from SharedWorker
      console.log(`[SharedWorker] Solicitando sincronização da sala ${code}`);
      this.broadcast('join-room', { code, playerName, playerId });

      // Set up a pending request with timeout
      const timeout = setTimeout(() => {
        this.joinPendingRequests.delete(code);
        reject(new Error('Sala não encontrada. Verifique o código e tente novamente.'));
      }, 5000);

      this.joinPendingRequests.set(code, {
        resolve: (syncedRoom: any) => {
          const exists = syncedRoom.players.find((p: any) => p.id === playerId);
          
          // IMPORTANTE: Apenas adiciona se NÃO existe
          if (!exists) {
            syncedRoom.players.push({ 
              id: playerId, 
              name: playerName,
              isActive: true,
              hasActedThisTurn: false 
            });
            console.log(`[SharedWorker Sync] Player ${playerId} adicionado. Total agora: ${syncedRoom.players.length}`);
          }
          
          this.saveRoomToStorage(syncedRoom);
          this.currentRoom = syncedRoom;
          this.trigger('room-updated', syncedRoom);
          this.broadcast('update-room', syncedRoom);
          resolve();
        },
        timeout
      });
    });
  }

  async startGame(code: string, mode: GameMode) {
    if (!this.currentRoom) return;
    
    this.trigger('loading', true);
    try {
      let data = {};
      if (mode === GameMode.IMPOSTOR) {
        const word = await generateImpostorContent('Geral');
        const impostorIndex = Math.floor(Math.random() * this.currentRoom.players.length);
        data = { secretWord: word, impostorId: this.currentRoom.players[impostorIndex].id, guesses: {} };
      } else if (mode === GameMode.QUEM_SOU_EU) {
        const chars = await generateWhoAmICharacters(this.currentRoom.players.length, 'Famosos');
        const assignments: any = {};
        this.currentRoom.players.forEach((p: any, i: number) => assignments[p.id] = chars[i]);
        data = { assignments };
      } else if (mode === GameMode.DILEMAS) {
        data = await generateDilemma();
        data.votes = {};
      }

      // Inicializar sistema de turnos
      const turnOrder = this.currentRoom.players.map((p: any) => p.id);
      this.shuffleArray(turnOrder); // embaralhar ordem inicial

      this.currentRoom.status = 'PLAYING';
      this.currentRoom.gameMode = mode;
      this.currentRoom.gameState = {
        mode,
        players: this.currentRoom.players.map((p: any) => ({
          ...p,
          isActive: true,
          hasActedThisTurn: false
        })),
        status: 'PLAYING',
        turnSystem: {
          turnOrder,
          currentTurnIndex: 0,
          currentPlayerId: turnOrder[0],
          turnType: mode === GameMode.DILEMAS ? 'simultaneous' : 'sequential',
          roundNumber: 1,
          phase: 'setup'
        },
        data,
        privateData: {} // será preenchido pelo initializePrivateData
      };
      
      this.trigger('room-updated', this.currentRoom);
      this.broadcast('update-room', this.currentRoom);
    } catch (e) {
      this.trigger('error', 'Erro ao gerar jogo com IA');
    } finally {
      this.trigger('loading', false);
    }
  }

  // Avançar para o próximo turno
  nextTurn(code: string) {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return;

    const turnSystem = this.currentRoom.gameState.turnSystem;
    
    if (turnSystem.turnType === 'sequential') {
      // Avançar para próximo jogador na ordem circular
      turnSystem.currentTurnIndex = (turnSystem.currentTurnIndex + 1) % turnSystem.turnOrder.length;
      turnSystem.currentPlayerId = turnSystem.turnOrder[turnSystem.currentTurnIndex];
      
      // Resetar flag de ação para todos os jogadores
      this.currentRoom.gameState.players.forEach((p: any) => {
        p.hasActedThisTurn = false;
      });
      
      // Se voltou para o primeiro jogador, é uma nova rodada
      if (turnSystem.currentTurnIndex === 0) {
        turnSystem.roundNumber++;
      }
    } else {
      // Para turnos simultâneos, apenas avançar rodada
      turnSystem.roundNumber++;
    }

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  // Jogador fez sua ação no turno atual
  playerActed(code: string, playerId: string) {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return;

    const player = this.currentRoom.gameState.players.find((p: any) => p.id === playerId);
    if (player) {
      player.hasActedThisTurn = true;
    }

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  // Verificar se todos os jogadores ativos agiram
  allPlayersActed(): boolean {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return false;

    const turnSystem = this.currentRoom.gameState.turnSystem;
    if (turnSystem.turnType === 'simultaneous') {
      return this.currentRoom.gameState.players
        .filter((p: any) => p.isActive)
        .every((p: any) => p.hasActedThisTurn);
    } else {
      // Para turnos sequenciais, verificar se o jogador atual agiu
      const currentPlayer = this.currentRoom.gameState.players.find((p: any) => p.id === turnSystem.currentPlayerId);
      return currentPlayer ? currentPlayer.hasActedThisTurn : false;
    }
  }

  // Iniciar fase de votação
  startVoting(code: string) {
    if (!this.currentRoom || this.currentRoom.status !== 'PLAYING') return;

    this.currentRoom.gameState.turnSystem.phase = 'voting';
    
    // Resetar votos se necessário
    if (this.currentRoom.gameMode === GameMode.DILEMAS) {
      this.currentRoom.gameState.data.votes = {};
    }

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  // Sistema de Votação Avançado
  createVotingSession(code: string, question: string, options: VoteOption[], type: VoteType = VoteType.SECRET) {
    if (!this.currentRoom) return null;

    const session: VotingSession = {
      id: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      question,
      options,
      votes: {},
      isActive: true,
      showResults: false,
      createdAt: Date.now()
    };

    // Inicializar sistema de votação se não existir
    if (!this.currentRoom.gameState.voting) {
      this.currentRoom.gameState.voting = {
        history: []
      };
    }

    this.currentRoom.gameState.voting.currentSession = session;
    this.currentRoom.gameState.turnSystem.phase = 'voting';

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);

    return session.id;
  }

  // Votar em uma opção
  castVote(code: string, playerId: string, optionId: string) {
    if (!this.currentRoom?.gameState.voting?.currentSession) return false;

    const session = this.currentRoom.gameState.voting.currentSession;

    if (!session.isActive) return false;

    // Validar se a opção existe
    const validOption = session.options.find(opt => opt.id === optionId);
    if (!validOption) return false;

    // Registrar voto (sobrescrever se já votou)
    session.votes[playerId] = optionId;

    // Para votação aberta, mostrar resultados em tempo real
    if (session.type === VoteType.OPEN) {
      this.trigger('room-updated', this.currentRoom);
      this.broadcast('update-room', this.currentRoom);
    }

    return true;
  }

  // Finalizar sessão de votação e calcular resultados
  endVotingSession(code: string): VotingSummary | null {
    if (!this.currentRoom?.gameState.voting?.currentSession) return null;

    const session = this.currentRoom.gameState.voting.currentSession;
    session.isActive = false;
    session.endedAt = Date.now();
    session.showResults = true;

    // Calcular resultados
    const voteCounts: Record<string, { count: number; voters: string[] }> = {};

    // Inicializar contadores
    session.options.forEach(option => {
      voteCounts[option.id] = { count: 0, voters: [] };
    });

    // Contar votos
    Object.entries(session.votes).forEach(([playerId, optionId]) => {
      if (voteCounts[optionId]) {
        voteCounts[optionId].count++;
        voteCounts[optionId].voters.push(playerId);
      }
    });

    // Calcular percentuais e encontrar vencedor
    const totalVotes = Object.values(voteCounts).reduce((sum, opt) => sum + opt.count, 0);
    const results: VotingResult[] = session.options.map(option => ({
      optionId: option.id,
      count: voteCounts[option.id].count,
      percentage: totalVotes > 0 ? (voteCounts[option.id].count / totalVotes) * 100 : 0,
      voters: session.type === VoteType.OPEN ? voteCounts[option.id].voters : []
    }));

    // Encontrar vencedor (ou empates)
    const maxVotes = Math.max(...results.map(r => r.count));
    const winners = results.filter(r => r.count === maxVotes);

    const summary: VotingSummary = {
      sessionId: session.id,
      totalVotes,
      results,
      isTie: winners.length > 1,
      tieOptions: winners.length > 1 ? winners.map(w => w.optionId) : undefined,
      winner: winners.length === 1 ? winners[0].optionId : undefined
    };

    // Mover para histórico
    this.currentRoom.gameState.voting.history.push(session);
    this.currentRoom.gameState.voting.currentSession = undefined;

    // Avançar para fase de resultados
    this.currentRoom.gameState.turnSystem.phase = 'results';

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);

    return summary;
  }

  // Obter resultados atuais (para votação aberta)
  getVotingResults(code: string): VotingResult[] | null {
    if (!this.currentRoom?.gameState.voting?.currentSession) return null;

    const session = this.currentRoom.gameState.voting.currentSession;
    if (!session.showResults && session.type === VoteType.SECRET) return null;

    const voteCounts: Record<string, { count: number; voters: string[] }> = {};

    session.options.forEach(option => {
      voteCounts[option.id] = { count: 0, voters: [] };
    });

    Object.entries(session.votes).forEach(([playerId, optionId]) => {
      if (voteCounts[optionId]) {
        voteCounts[optionId].count++;
        voteCounts[optionId].voters.push(playerId);
      }
    });

    const totalVotes = Object.values(voteCounts).reduce((sum, opt) => sum + opt.count, 0);

    return session.options.map(option => ({
      optionId: option.id,
      count: voteCounts[option.id].count,
      percentage: totalVotes > 0 ? (voteCounts[option.id].count / totalVotes) * 100 : 0,
      voters: session.type === VoteType.OPEN ? voteCounts[option.id].voters : []
    }));
  }

  // Finalizar jogo
  finishGame(code: string, winner: string, reason: string) {
    if (!this.currentRoom) return;

    this.currentRoom.status = 'FINISHED';
    this.currentRoom.gameState.status = 'FINISHED';
    this.currentRoom.gameState.data.winner = winner;
    this.currentRoom.gameState.data.finishReason = reason;

    this.trigger('room-updated', this.currentRoom);
    this.broadcast('update-room', this.currentRoom);
  }

  // Utilitário para embaralhar array
  private shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Inicializa dados privados para um jogo
  private initializePrivateData(mode: GameMode, players: any[]): { data: any, privateData: Record<string, any>, playersWithPrivateData: any[] } {
    let data = {};
    let privateData: Record<string, any> = {};
    let playersWithPrivateData = [...players];

    if (mode === GameMode.IMPOSTOR) {
      // Simular geração de palavra (em produção seria via API)
      const words = ['Elefante', 'Computador', 'Chocolate', 'Montanha'];
      const word = words[Math.floor(Math.random() * words.length)];
      const impostorIndex = Math.floor(Math.random() * players.length);
      const impostorId = players[impostorIndex].id;

      data = {
        secretWord: word,
        category: 'Geral',
        guesses: {},
        impostorRevealed: false
      };

      // Dados privados: cada jogador sabe se é impostor ou a palavra
      players.forEach(player => {
        if (player.id === impostorId) {
          privateData[player.id] = { role: 'impostor', word: null };
          playersWithPrivateData.find(p => p.id === player.id).privateData = { role: 'impostor' };
        } else {
          privateData[player.id] = { role: 'civil', word };
          playersWithPrivateData.find(p => p.id === player.id).privateData = { role: 'civil', word };
        }
      });

    } else if (mode === GameMode.QUEM_SOU_EU) {
      // Simular geração de personagens
      const characters = ['Albert Einstein', 'Marie Curie', 'Leonardo da Vinci', 'Steve Jobs'];
      const assignments: any = {};

      data = { assignments };

      // Dados privados: cada jogador sabe seu próprio personagem
      players.forEach((player, index) => {
        const character = characters[index % characters.length];
        assignments[player.id] = character;
        privateData[player.id] = { myCharacter: character };
        playersWithPrivateData.find(p => p.id === player.id).privateData = { myCharacter: character };
      });

    } else if (mode === GameMode.DILEMAS) {
      data = {
        scenario: 'Você encontra uma carteira com R$ 1000 na rua...',
        optionA: 'Devolver para o dono',
        optionB: 'Guardar o dinheiro',
        votes: {}
      };
    }

    return { data, privateData, playersWithPrivateData };
  }

  onRoomUpdated(callback: (room: any) => void) {
    this.on('room-updated', callback);
  }

  onError(callback: (msg: string) => void) {
    this.on('error', callback);
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
}

export const socketService = new SocketService();
