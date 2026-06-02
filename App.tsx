import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import Home from './views/Home';
import Lobby from './views/Lobby';
import GameRoom from './views/GameRoom';
import GameConfig, { type ConfigExtras } from './views/GameConfig';
import AgeGate from './components/AgeGate';
import { GameMode } from './types';
import type { GameConfig as EngineConfig } from './engine/types';
import { localStorageSyncService } from './services/localStorageSync';

const AGE_KEY = 'catdecks-age-ok';

const App: React.FC = () => {
  const [playerId] = useState(() => {
    const stored = localStorage.getItem('pnode_pid');
    if (stored) return stored;
    const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('pnode_pid', newId);
    return newId;
  });

  const [ageOk, setAgeOk] = useState(() => localStorage.getItem(AGE_KEY) === '1');
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [initialRoomFromUrl, setInitialRoomFromUrl] = useState<string | null>(null);
  const [hasRoomState, setHasRoomState] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [roomMode, setRoomMode] = useState<'online' | 'local'>('online');

  // Jogo sendo configurado (tela GameConfig). null = não está configurando.
  const [configuringGame, setConfiguringGame] = useState<GameMode | null>(null);
  // Jogo em andamento (single-device). null = ainda no lobby.
  const [activeGame, setActiveGame] = useState<{ mode: GameMode; config: EngineConfig } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) setInitialRoomFromUrl(roomFromUrl.toUpperCase());

    localStorageSyncService.onRoomUpdated((room) => {
      setRoomCode(room.code);
      setIsHost(room.hostId === playerId);
      setPlayers(room.players.map((p: any) => ({ id: p.id, name: p.name })));
      setHasRoomState(true);
    });
    localStorageSyncService.onError((msg) => toast.error(msg));

    return () => localStorageSyncService.destroy();
  }, [playerId]);

  const handleStartSession = async (name: string, code?: string, mode?: 'online' | 'local') => {
    setUserName(name);
    setRoomMode(mode ?? 'online');
    if ((mode ?? 'online') === 'online' && !code) {
      toast('🚧 Multiplayer online chega em breve — jogando no mesmo aparelho por enquanto');
    }
    try {
      if (code) {
        const result = await localStorageSyncService.joinRoom(code.toUpperCase().trim(), name, playerId);
        setRoomCode(result.code);
        setIsHost(result.hostId === playerId);
        setPlayers(result.players.map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        toast.success(`Entrou na sala ${result.code}!`);
      } else {
        const result = localStorageSyncService.createRoom(name, playerId);
        setRoomCode(result.code);
        setIsHost(true);
        setPlayers(result.players.map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        toast.success(`Sala ${result.code} criada!`);
      }
    } catch (error) {
      setUserName('');
      setHasRoomState(false);
      throw error;
    }
  };

  // Lobby: escolheu um jogo → vai para a tela de configuração.
  const selectGame = (mode: GameMode) => {
    if (players.length < 2 && mode !== GameMode.DILEMAS) {
      toast.error('Adicione pelo menos 2 jogadores!');
      return;
    }
    setConfiguringGame(mode);
  };

  // GameConfig: confirmou → monta a config e inicia o jogo.
  const confirmConfig = (extras: ConfigExtras) => {
    if (!configuringGame) return;
    const config: EngineConfig = {
      players: players.map((p) => ({ id: p.id, name: p.name })),
      alcoholicMode: extras.alcoholicMode,
      rounds: extras.rounds,
      categoryId: extras.categoryId,
      impostorCount: extras.impostorCount,
      intensityLevel: extras.intensityLevel,
    };
    setActiveGame({ mode: configuringGame, config });
    setConfiguringGame(null);
  };

  const exitGame = () => setActiveGame(null);

  const confirmAge = () => {
    localStorage.setItem(AGE_KEY, '1');
    setAgeOk(true);
  };

  // ── Render ──
  let screen: React.ReactNode;
  if (!ageOk) {
    screen = <AgeGate onConfirm={confirmAge} />;
  } else if (!userName || !hasRoomState) {
    screen = <Home onJoin={handleStartSession} initialCode={initialRoomFromUrl || undefined} />;
  } else if (activeGame) {
    screen = <GameRoom mode={activeGame.mode} config={activeGame.config} onExit={exitGame} />;
  } else if (configuringGame) {
    screen = (
      <GameConfig
        mode={configuringGame}
        playerCount={players.length}
        onBack={() => setConfiguringGame(null)}
        onStart={confirmConfig}
      />
    );
  } else {
    screen = (
      <Lobby
        roomCode={roomCode}
        isHost={isHost}
        players={players}
        onlineMode={roomMode === 'online'}
        onSelectGame={selectGame}
      />
    );
  }

  return (
    <>
      {screen}
      <Toaster position="top-center" richColors theme="system" />
    </>
  );
};

export default App;
