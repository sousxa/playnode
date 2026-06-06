import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import Home from './views/Home';
import Lobby from './views/Lobby';
import GameRoom from './views/GameRoom';
import GameConfig, { type ConfigExtras } from './views/GameConfig';
import Ranking from './components/Ranking';
import Reactions from './components/Reactions';
import { GameMode } from './types';
import type { GameConfig as EngineConfig } from './engine/types';
import { localStorageSyncService } from './services/localStorageSync';
import { firebaseSyncService } from './services/firebaseSync';
import { firebaseEnabled, authReady } from './services/firebase';
import { addRecentRoom } from './services/recentRooms';

// Jogos que já têm partida ONLINE sincronizada.
const ONLINE_GAMES = new Set<GameMode>([
  GameMode.AMIGOS_DE_MERDA, GameMode.QUEM_SOU_EU, GameMode.IMPOSTOR,
  GameMode.STOP, GameMode.CARTAS_PODRES, GameMode.CIDADE_DORME, GameMode.VERDADE_OU_DESAFIO,
]);

// Serviços de sincronização com a mesma API (escolhidos por modo).
type SyncService = typeof localStorageSyncService | typeof firebaseSyncService;

const App: React.FC = () => {
  // Identidade local (fallback p/ modo offline / mesmo aparelho).
  const [localId] = useState(() => {
    const stored = localStorage.getItem('pnode_pid');
    if (stored) return stored;
    const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('pnode_pid', newId);
    return newId;
  });
  // Login anônimo (Firebase): o uid vira a identidade online. Resolve em SEGUNDO
  // PLANO — não bloqueia a tela; a entrada em sala online é que espera o uid.
  const [authUid, setAuthUid] = useState<string | null>(null);
  useEffect(() => {
    if (!firebaseEnabled) return;
    let alive = true;
    authReady.then((uid) => { if (alive) setAuthUid(uid); });
    return () => { alive = false; };
  }, []);
  // Identidade DA SESSÃO: definida ao entrar/criar (online = uid; local = id local).
  // É estável — não troca quando o login anônimo resolve no meio (evita o host
  // "perder" o status no modo mesmo aparelho). Default = id local.
  const [playerId, setPlayerId] = useState(localId);
  const playerIdRef = useRef(playerId);
  playerIdRef.current = playerId;

  const [userName, setUserName] = useState('');
  const hasRoomRef = useRef(false);
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [hostId, setHostId] = useState('');
  // Lê o ?room=CODE da URL JÁ no primeiro render (QR/link de convite).
  // Tem que ser síncrono: se for via useEffect, a Home monta antes e não prefche o código.
  const [initialRoomFromUrl] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const r = new URLSearchParams(window.location.search).get('room');
    return r ? r.toUpperCase() : null;
  });
  const [hasRoomState, setHasRoomState] = useState(false);
  hasRoomRef.current = hasRoomState;
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [roomMode, setRoomMode] = useState<'online' | 'local'>('online');

  const [configuringGame, setConfiguringGame] = useState<GameMode | null>(null);
  const [activeGame, setActiveGame] = useState<{ mode: GameMode; config: EngineConfig } | null>(null);
  const [sessionScores, setSessionScores] = useState<Record<string, number>>({});
  const [showRanking, setShowRanking] = useState(false);

  // Serviço de sync ativo na sessão (localStorage = mesmo aparelho, firebase = online).
  const syncRef = useRef<SyncService>(localStorageSyncService);

  const reportScores = (scores: Record<string, number>) => {
    if (roomMode === 'online') {
      // Online: só o host grava no ranking da sala; todos veem via onRanking.
      if (isHost) firebaseSyncService.addToRanking(roomCode, scores);
    } else {
      setSessionScores((prev) => {
        const next = { ...prev };
        for (const [id, v] of Object.entries(scores)) next[id] = (next[id] ?? 0) + (v ?? 0);
        return next;
      });
    }
  };

  // Online: ranking da sala em tempo real.
  useEffect(() => {
    if (roomMode !== 'online' || !roomCode) return;
    const unsub = firebaseSyncService.onRanking(roomCode, (r) => setSessionScores(r));
    return unsub;
  }, [roomMode, roomCode]);

  // Evita sair da sala sem querer: avisa antes de recarregar/fechar a aba.
  useEffect(() => {
    if (!hasRoomState) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasRoomState]);

  useEffect(() => {
    const onRoom = (room: any) => {
      const ps = room.players || [];
      const myId = playerIdRef.current; // sempre o id atual da sessão (sem stale closure)
      // Fui expulso/removido: não estou mais na lista mas tinha uma sala aberta.
      if (hasRoomRef.current && ps.length > 0 && !ps.some((p: any) => p.id === myId)) {
        toast('Você saiu da sala.');
        setUserName(''); setHasRoomState(false); setRoomCode(''); setPlayers([]);
        setIsHost(false); setHostId(''); setActiveGame(null); setConfiguringGame(null); setShowRanking(false);
        return;
      }
      // Migração de host: se o host saiu e eu sou o 1º da fila, assumo a sala.
      if (room.code && ps.length > 0 && !ps.some((p: any) => p.id === room.hostId) && ps[0].id === myId) {
        syncRef.current.claimHost(room.code, myId);
      }
      setRoomCode(room.code);
      setIsHost(room.hostId === myId);
      setHostId(room.hostId || '');
      setPlayers(ps.map((p: any) => ({ id: p.id, name: p.name })));
      setHasRoomState(true);

      // Online: seguir o host quando uma partida começa/termina.
      if (syncRef.current === firebaseSyncService) {
        if (room.status === 'PLAYING' && room.gameMode) {
          setActiveGame((prev) => prev || { mode: room.gameMode, config: room.config });
        } else if (room.status === 'LOBBY') {
          setActiveGame((prev) => (prev ? null : prev));
        }
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartSession = async (name: string, code?: string, mode?: 'online' | 'local') => {
    const wantsOnline = (mode ?? 'online') === 'online';
    // Garante o uid do Firebase ANTES de abrir sala online (espera o login resolver).
    let uid: string | null = authUid;
    if (wantsOnline && firebaseEnabled && !uid) {
      uid = await authReady;
      if (uid) setAuthUid(uid);
    }
    // Entrar numa sala ONLINE sem ter conectado ao servidor daria "sala não
    // encontrada" enganoso (cairia no localStorage). Avisa que é falta de conexão.
    if (code && wantsOnline && firebaseEnabled && !uid) {
      throw new Error('Sem conexão com o servidor agora 📡 — confira a internet e tente de novo.');
    }
    const useOnline = wantsOnline && firebaseEnabled && !!uid;
    const myId = useOnline ? (uid as string) : localId;
    playerIdRef.current = myId; // identidade estável da sessão (já vale antes do setState)
    setPlayerId(myId);
    const sync = useOnline ? firebaseSyncService : localStorageSyncService;
    syncRef.current = sync;
    setUserName(name);
    setRoomMode(useOnline ? 'online' : 'local');
    setSessionScores({});

    if (wantsOnline && !firebaseEnabled) {
      toast('Online indisponível (config Firebase faltando) — jogando no mesmo aparelho.');
    } else if (wantsOnline && !uid) {
      toast('Não foi possível autenticar com o servidor — jogando no mesmo aparelho.');
    }

    try {
      if (code) {
        const result: any = await sync.joinRoom(code.toUpperCase().trim(), name, myId);
        setRoomCode(result.code);
        setIsHost(result.hostId === myId);
        setHostId(result.hostId || '');
        setPlayers((result.players || []).map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        if (useOnline) addRecentRoom(result.code, name);
        toast.success(`Entrou na sala ${result.code}!`);
      } else {
        const result: any = await sync.createRoom(name, myId);
        setRoomCode(result.code);
        setIsHost(true);
        setHostId(myId);
        setPlayers((result.players || []).map((p: any) => ({ id: p.id, name: p.name })));
        setHasRoomState(true);
        if (useOnline) addRecentRoom(result.code, name);
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

  // Host: passar o host pra outra pessoa.
  const handleMakeHost = (id: string) => {
    if (roomMode !== 'online' || !isHost || id === playerId) return;
    syncRef.current.claimHost(roomCode, id);
    toast.success('Host transferido!');
  };

  // Host: expulsar alguém da sala.
  const handleKick = (id: string, name: string) => {
    if (roomMode !== 'online' || !isHost || id === playerId) return;
    if (!window.confirm(`Expulsar ${name} da sala?`)) return;
    syncRef.current.removeLocalPlayer(roomCode, id);
    toast(`${name} foi removido(a).`);
  };

  const handleLeave = () => {
    if (!window.confirm('Sair da sala? Você vai perder seu lugar na partida.')) return;
    try { syncRef.current.leaveRoom(roomCode, playerId); } catch {}
    setUserName('');
    setHasRoomState(false);
    setRoomCode('');
    setPlayers([]);
    setIsHost(false);
    setHostId('');
    setActiveGame(null);
    setConfiguringGame(null);
    setShowRanking(false);
  };

  const selectGame = (mode: GameMode) => {
    const min = mode === GameMode.CIDADE_DORME ? 4 : mode === GameMode.CARTAS_PODRES ? 3 : mode === GameMode.DILEMAS ? 1 : 2;
    if (players.length < min) {
      toast.error(`Esse jogo precisa de pelo menos ${min} jogadores!`);
      return;
    }
    if (roomMode === 'online' && !ONLINE_GAMES.has(mode)) {
      toast('🚧 Esse jogo ainda não tem versão online — jogue no modo "Mesmo aparelho". Em breve! 🚀');
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
      stopCategories: extras.stopCategories,
      stopVoteSeconds: extras.stopVoteSeconds,
      whoAmIMode: extras.whoAmIMode,
    };
    if (roomMode === 'online') {
      // host transmite o início; os outros entram via onRoom (status PLAYING).
      syncRef.current.startGame(roomCode, configuringGame, config);
    }
    setActiveGame({ mode: configuringGame, config });
    setConfiguringGame(null);
  };

  const exitGame = () => {
    // Online: só o host volta ao menu (encerra a partida pra todos). Os outros seguem o host.
    if (roomMode === 'online') {
      if (!isHost) { toast('Só o host pode voltar ao menu.'); return; }
      syncRef.current.endGame(roomCode);
    }
    setActiveGame(null);
  };

  // ── Render ──
  let screen: React.ReactNode;
  if (!userName || !hasRoomState) {
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
        online={roomMode === 'online'}
        roomCode={roomCode}
        playerId={playerId}
        isHost={isHost}
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
        myId={playerId}
        hostId={hostId}
        onlineMode={roomMode === 'online'}
        onSelectGame={selectGame}
        onAddPlayer={handleAddPlayer}
        onMakeHost={handleMakeHost}
        onKick={handleKick}
        onShowRanking={() => setShowRanking(true)}
        onLeave={handleLeave}
      />
    );
  }

  const screenKey = !userName || !hasRoomState
    ? 'home'
    : showRanking
    ? 'ranking'
    : activeGame
    ? 'game'
    : configuringGame
    ? 'config'
    : 'lobby';

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={screenKey}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="h-full"
        >
          {screen}
        </motion.div>
      </AnimatePresence>
      {roomMode === 'online' && hasRoomState && roomCode && (
        <Reactions roomCode={roomCode} playerId={playerId} playerName={userName} />
      )}
      <Toaster position="top-center" richColors theme="system" />
    </>
  );
};

export default App;
