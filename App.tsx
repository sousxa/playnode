import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import Home from './views/Home';
import Lobby from './views/Lobby';
import GameRoom from './views/GameRoom';
import AgeGate from './components/AgeGate';
import { GameMode } from './types';
import type { GameConfig } from './engine/types';
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
  const [alcoholicMode, setAlcoholicMode] = useState(false);
  const [roomMode, setRoomMode] = useState<'online' | 'local'>('online');

  // Jogo em andamento (single-device). null = ainda no lobby.
  const [activeGame, setActiveGame] = useState<{ mode: GameMode; config: GameConfig } | null>(null);

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

  const startGame = async (mode: GameMode, opts?: { alcoholicMode?: boolean }) => {
    if (players.length < 2 && mode !== GameMode.DILEMAS) {
      toast.error('Adicione pelo menos 2 jogadores!');
      return;
    }
    const config: GameConfig = {
      players: players.map((p) => ({ id: p.id, name: p.name })),
      alcoholicMode: opts?.alcoholicMode ?? alcoholicMode,
    };
    setActiveGame({ mode, config });
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
  } else {
    screen = (
      <Lobby
        roomCode={roomCode}
        isHost={isHost}
        players={players}
        alcoholicMode={alcoholicMode}
        onlineMode={roomMode === 'online'}
        onAlcoholicChange={setAlcoholicMode}
        onStartGame={startGame}
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
