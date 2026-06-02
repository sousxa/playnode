
import React, { useState, useEffect } from 'react';
import Home from './views/Home';
import Lobby from './views/Lobby';
import GameView from './views/GameView';
import { GameMode, Player, GameState } from './types';
import { localStorageSyncService } from './services/localStorageSync';
import { generateImpostorContent, generateWhoAmICharacters, generateDilemma } from './services/geminiService';

const App: React.FC = () => {
  // Gerar e persistir playerId única por dispositivo
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('pnode_pid');
    if (stored) {
      console.log(`[App] PlayerId recuperada do localStorage: ${stored}`);
      return stored;
    }
    
    const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`[App] PlayerId gerada (novo dispositivo): ${newId}`);
    localStorage.setItem('pnode_pid', newId);
    return newId;
  });
  const [userName, setUserName] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [isHost, setIsHost] = useState(false);
  const [initialRoomFromUrl, setInitialRoomFromUrl] = useState<string | null>(null);
  const [hasRoomState, setHasRoomState] = useState(false);
  
  const [gameState, setGameState] = useState<GameState>({
    mode: null,
    players: [],
    status: 'LOBBY',
    turnSystem: {
      turnOrder: [],
      currentTurnIndex: 0,
      currentPlayerId: '',
      turnType: 'sequential',
      roundNumber: 1,
      phase: 'setup'
    },
    data: null,
    privateData: {}
  });
  const [isLoading, setIsLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    // Registrar playerId no localStorage
    localStorage.setItem('pnode_pid', playerId);
    console.log(`[App] Conectando com playerId: ${playerId}`);
    
    // Checa se há um código de sala na URL
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) {
      console.log(`[App] Sala encontrada na URL: ${roomFromUrl}`);
      setInitialRoomFromUrl(roomFromUrl.toUpperCase());
    }

    // Registrar listener para atualizações de sala
    localStorageSyncService.onRoomUpdated((room) => {
      console.log(`[App] Sala atualizada. Jogadores: ${room.players.length}`, room.players.map((p: any) => p.name));
      
      setRoomCode(room.code);
      setIsHost(room.hostId === playerId);
      setGameState(room.gameState || {
        mode: room.gameMode,
        players: room.players || [],
        status: room.status,
        turnSystem: {
          turnOrder: [],
          currentTurnIndex: 0,
          currentPlayerId: '',
          turnType: 'sequential',
          roundNumber: 1,
          phase: 'setup'
        },
        data: room.gameState || null,
        privateData: {}
      });
      setHasRoomState(true);
    });

    localStorageSyncService.onError((msg) => {
      console.error(`[App] Erro: ${msg}`);
      setJoinError(msg);
      alert(msg);
    });

    return () => {
      localStorageSyncService.destroy();
    };
  }, [playerId]);

  const handleStartSession = async (name: string, code?: string) => {
    console.log(`[App] ═══════════════════════════════════════════════════`);
    console.log(`[App] Iniciando sessão`);
    console.log(`[App] PlayerId: ${playerId}`);
    console.log(`[App] Nome: ${name}`);
    console.log(`[App] Ação: ${code ? `Entrar na sala ${code.toUpperCase()}` : 'Criar nova sala'}`);
    console.log(`[App] ═══════════════════════════════════════════════════`);
    
    setUserName(name);
    setJoinError(null);
    
    try {
      if (code) {
        const cleanCode = code.toUpperCase().trim();
        console.log(`[App] ▸ Entrar em sala: ${cleanCode}`);
        setIsLoading(true);
        const result = await localStorageSyncService.joinRoom(cleanCode, name, playerId);
        console.log(`[App] ✓ Entrada bem-sucedida! Jogadores: ${result.players.length}`);
        
        // Forçar update imediato da UI
        setRoomCode(result.code);
        setIsHost(result.hostId === playerId);
        setGameState(result.gameState || {
          mode: result.gameMode,
          players: result.players || [],
          status: result.status,
          turnSystem: {
            turnOrder: [],
            currentTurnIndex: 0,
            currentPlayerId: '',
            turnType: 'sequential',
            roundNumber: 1,
            phase: 'setup'
          },
          data: result.gameState || null,
          privateData: {}
        });
        setHasRoomState(true);
      } else {
        console.log(`[App] ▸ Criar nova sala`);
        const result = localStorageSyncService.createRoom(name, playerId);
        console.log(`[App] ✓ Sala criada! Código: ${result.code}`);
        
        // Forçar update imediato da UI
        setRoomCode(result.code);
        setIsHost(result.hostId === playerId);
        setGameState(result.gameState || {
          mode: result.gameMode,
          players: result.players || [],
          status: result.status,
          turnSystem: {
            turnOrder: [],
            currentTurnIndex: 0,
            currentPlayerId: '',
            turnType: 'sequential',
            roundNumber: 1,
            phase: 'setup'
          },
          data: result.gameState || null,
          privateData: {}
        });
        setHasRoomState(true);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao entrar na sala';
      console.error(`[App] ✗ Erro ao iniciar sessão: ${errorMsg}`);
      console.error(`[App] Salas disponíveis no localStorage:`, 
        Object.keys(localStorage).filter(k => k.startsWith('playnode_room_')));
      setJoinError(errorMsg);
      setUserName(''); // Reset para tentar novamente
      setHasRoomState(false);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (mode: GameMode): Promise<void> => {
    setIsLoading(true);
    try {
      const players = gameState.players;
      let updatedPlayers = players.map(p => ({ ...p }));
      let gameData: any = {};

      if (mode === GameMode.IMPOSTOR) {
        const categories = ['animais', 'comidas', 'filmes', 'esportes', 'países', 'objetos', 'profissões'];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const word = await generateImpostorContent(category);
        const impostorId = players[Math.floor(Math.random() * players.length)].id;

        updatedPlayers = players.map(p => ({
          ...p,
          hasActedThisTurn: false,
          privateData: p.id === impostorId
            ? { role: 'impostor' }
            : { role: 'player', word }
        }));

        gameData = { secretWord: word, category, impostorId, guesses: {}, votes: {} };

      } else if (mode === GameMode.QUEM_SOU_EU) {
        const characters = await generateWhoAmICharacters(players.length, 'personagens famosos brasileiros e internacionais');
        const assignments: Record<string, string> = {};

        updatedPlayers = players.map((p, i) => {
          assignments[p.id] = characters[i] || `Personagem ${i + 1}`;
          return { ...p, hasActedThisTurn: false, privateData: { myCharacter: assignments[p.id] } };
        });

        gameData = { assignments };

      } else if (mode === GameMode.DILEMAS) {
        const dilemma = await generateDilemma();
        gameData = { ...dilemma, votes: {} };
      }

      const turnOrder = updatedPlayers.map(p => p.id);
      const isSimultaneous = mode === GameMode.DILEMAS;

      const initialGameState: GameState = {
        mode,
        players: updatedPlayers,
        status: 'PLAYING',
        turnSystem: {
          turnOrder,
          currentTurnIndex: 0,
          currentPlayerId: turnOrder[0] || '',
          turnType: isSimultaneous ? 'simultaneous' : 'sequential',
          roundNumber: 1,
          phase: isSimultaneous ? 'playing' : 'setup'
        },
        data: gameData,
        privateData: {}
      };

      localStorageSyncService.startGame(roomCode, mode, initialGameState);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar jogo';
      console.error('[App] Erro ao iniciar jogo:', msg);
      alert('Erro ao gerar conteúdo. Verifique a conexão com a IA.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetGame = () => {
    setUserName('');
    setHasRoomState(false);
    setRoomCode('');
    setGameState({
      mode: null,
      players: [],
      status: 'LOBBY',
      turnSystem: {
        turnOrder: [],
        currentTurnIndex: 0,
        currentPlayerId: '',
        turnType: 'sequential',
        roundNumber: 1,
        phase: 'setup'
      },
      data: null,
      privateData: {}
    });
  };

  if (!userName || !hasRoomState) {
    return <Home onJoin={handleStartSession} initialCode={initialRoomFromUrl || undefined} />;
  }

  if (gameState.status === 'LOBBY') {
    return (
      <Lobby 
        roomCode={roomCode}
        isHost={isHost}
        players={gameState.players} 
        onStartGame={startGame} 
      />
    );
  }

  return (
    <GameView
      state={gameState}
      onReset={resetGame}
      playerId={playerId}
      roomCode={roomCode}
    />
  );
};

export default App;
