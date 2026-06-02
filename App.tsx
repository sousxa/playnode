import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import Home from './views/Home';
import Lobby from './views/Lobby';
import GameRoom from './views/GameRoom';
import GameConfig, { type ConfigExtras } from './views/GameConfig';
import AgeGate from './components/AgeGate';
import Ranking from './components/Ranking';
import { GameMode } from './types';
import type { GameConfig as EngineConfig } from './engine/types';
import { localStorageSyncService } from './services/localStorageSync';
import { firebaseSyncService } from './services/firebaseSync';
import { firebaseEnabled } from './services/firebase';

const AGE_KEY = 'catdecks-age-ok';

// Serviços de sincronização com a mesma API (escolhidos por modo).
type SyncService = typeof localStorageSyncService | typeof firebaseSyncService;

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

  const [configuringGame, setConfiguringGame] = useState<GameMode | null>(null);
  const [activeGame, setActiveGame] = useState<{ mode: GameMode; config: EngineConfig } | null>(null);
  const [sessionScores, setSessionScores] = useState<Record<string, number>>({});
  const [showRanking, setShowRanking] = useState(false);

  // Serviço de sync ativo na sessão (localStorage = mesmo aparelho, firebase = online).
  const syncRef = useRef<SyncService>(localStorageSyncService);

  const reportScores = (scores: Record<string, number>) => {
    setSessionScores((prev) => {
      const next = { ...prev };
      for (const [id, v] of Object.entries(scores)) next[id] = (next[id] ?? 0) + (v ?? 0);
      return next;
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomFromUrl = params.get('room');
    if (roomFromUrl) setInitialRoomFromUrl(roomFromUrl.toUpperCase());

    const onRoom = (room: any) => {
      setRoomCode(room.code);
      setIsHost(room.hostId === playerId);
      setPlayers((room.players || []).map((p: any) => ({ id: p.id, name: p.name })));
      setHasRoomState(true);
    };
    const onErr = (msg: string) => toast.error(msg);

    // Registra nos dois serviços; só o ativo terá sala corrente.
    localStorageSyncService.onRoomUpdated(onRoom);
    localStorageSyncService.onError(onErr);
    if (firebaseEnabled) {
      firebaseSyncService.onRoomUpdated(onRoom);
      firebaseSyncService.onError(onErr);
    }

    return () => {
      localStorageSyncService.destroy();
      firebaseSyncService.destroy();
    };
  }, [playerId]);

  const handleStartSession = async (name: string, code?: string, mode?: 'online' | 'local') => {
    const useOnline = (mode ?? 'online') === 'online' && firebaseEnabled;
    const sync = useOnline ? firebaseSyncService : localStorageSyncService;
    syncRef.current = sync;
    setUserName(name);
    setRoomMode(useOnline ? 'online' : 'local');
    setSessionScores({});

    if ((mode ?? 'online') === 'online' && !firebaseEnabled) {
      toast('Online indisponível (config Firebase faltando) — jogando no mesmo aparelho.');
    }

    try {
      if (code) {
        const result: any = await sync.joinRoom(code.toUpperCase().trim(), name, playerId);
        setRoomCode(result.code);
        setIsHost(result.hostId === playerId);
        setPlayers((result.players || []).map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        toast.success(`Entrou na sala ${result.code}!`);
      } else {
        const result: any = await sync.createRoom(name, playerId);
        setRoomCode(result.code);
        setIsHost(true);
        setPlayers((result.players || []).map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        toast.success(`Sala ${result.code} criada!`);
      }
    } catch (error) {
      setUserName('');
      setHasRoomState(false);
      throw error;
    }
  };

  const handleAddPlayer = (name: string) => {
    const id = `local_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    syncRef.current.addLocalPlayer(roomCode, id, name);
  };

  const selectGame = (mode: GameMode) => {
    const min = mode === GameMode.CIDADE_DORME ? 4 : mode === GameMode.CARTAS_PODRES ? 3 : mode === GameMode.DILEMAS ? 1 : 2;
    if (players.length < min) {
      toast.error(`Esse jogo precisa de pelo menos ${min} jogadores!`);
      return;
    }
    setConfiguringGame(mode);
  };

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
  } else if (showRanking) {
    screen = <Ranking players={players} scores={sessionScores} onClose={() => setShowRanking(false)} />;
  } else if (activeGame) {
    screen = (
      <GameRoom
        mode={activeGame.mode}
        config={activeGame.config}
        onExit={exitGame}
        onReportScores={reportScores}
        onRanking={() => { setActiveGame(null); setShowRanking(true); }}
      />
    );
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
        onAddPlayer={handleAddPlayer}
        hasRanking={Object.values(sessionScores).some((v) => v > 0)}
        onShowRanking={() => setShowRanking(true)}
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
