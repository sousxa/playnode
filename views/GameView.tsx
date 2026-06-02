
import React from 'react';
import Button from '../components/Button';
import TurnIndicator from '../components/TurnIndicator';
import PrivateInfoDisplay from '../components/PrivateInfoDisplay';
import { GameState, GameMode } from '../types';
import { localStorageSyncService } from '../services/localStorageSync';

interface GameViewProps {
  state: GameState;
  onReset: () => void;
  playerId: string;
  roomCode: string;
}

const GameView: React.FC<GameViewProps> = ({ state, onReset, playerId, roomCode }) => {

  const players = state.players;
  const turnSystem = state.turnSystem;
  const isMyTurn = turnSystem.currentPlayerId === playerId;
  const currentPlayer = players.find(p => p.id === turnSystem.currentPlayerId);

  const activePlayers = players.filter(p => p.isActive);
  const allPlayersActed = activePlayers.length > 0 &&
    activePlayers.every(p => p.hasActedThisTurn);

  /**
   * Persiste uma alteração no estado do jogo, sincronizando entre as abas.
   */
  const persist = (mutate: (draft: GameState) => void) => {
    const draft: GameState = JSON.parse(JSON.stringify(state));
    mutate(draft);
    localStorageSyncService.updateGameState(roomCode, draft);
  };

  // --- LÓGICA DE TURNOS / FASES ---

  const nextTurn = () => {
    persist(draft => {
      const ts = draft.turnSystem;
      const nextIndex = ts.currentTurnIndex + 1;

      if (nextIndex >= ts.turnOrder.length) {
        ts.phase = 'playing';
        ts.currentTurnIndex = 0;
        ts.currentPlayerId = ts.turnOrder[0] || '';
        draft.players.forEach(p => { p.hasActedThisTurn = false; });
      } else {
        ts.currentTurnIndex = nextIndex;
        ts.currentPlayerId = ts.turnOrder[nextIndex];
      }
    });
  };

  const startVoting = () => {
    persist(draft => {
      draft.turnSystem.phase = 'voting';
      draft.players.forEach(p => { p.hasActedThisTurn = false; });
      draft.data = draft.data || {};
      draft.data.votes = {};
    });
  };

  // O grupo decide presencialmente em quem votar; o toque no acusado
  // registra a escolha coletiva e revela o resultado.
  const accuseImpostor = (accusedId: string) => {
    persist(draft => {
      const caught = accusedId === draft.data.impostorId;
      draft.data.accusedId = accusedId;
      draft.data.winner = caught ? 'GRUPO VENCEU!' : 'IMPOSTOR FUGIU!';
      draft.data.caught = caught;
      draft.turnSystem.phase = 'finished';
      draft.status = 'FINISHED';
    });
  };

  const castDilemmaVote = (option: 'A' | 'B') => {
    persist(draft => {
      draft.data.votes = draft.data.votes || {};
      draft.data.votes[playerId] = option;
      const voter = draft.players.find(p => p.id === playerId);
      if (voter) voter.hasActedThisTurn = true;
    });
  };

  const showDilemmaResults = () => {
    persist(draft => {
      draft.turnSystem.phase = 'results';
    });
  };

  const finishWhoAmI = () => {
    persist(draft => {
      draft.turnSystem.phase = 'finished';
      draft.status = 'FINISHED';
    });
  };

  // --- HELPERS DE ESTILO ---
  const sectionTitle = "font-pixel text-lg sm:text-xl text-arcade-yellow glow-yellow leading-relaxed";

  // --- RENDERING LOGIC FOR EACH MODE ---

  const renderImpostor = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div className="font-pixel text-arcade-cyan">CARREGANDO...</div>;
      const isViewingPlayer = currentPlayer.id === playerId;

      return (
        <div className="space-y-5">
          <TurnIndicator turnSystem={turnSystem} players={players} currentPlayerId={playerId} />
          <div className="text-center space-y-2">
            <p className="font-pixel text-[10px] text-arcade-green glow-green">
              {isViewingPlayer ? 'SUA VEZ' : 'PASSE O APARELHO PARA'}
            </p>
            <h3 className="font-pixel text-2xl text-arcade-pink glow-pink break-words">{currentPlayer.name}</h3>
          </div>
          <PrivateInfoDisplay
            key={currentPlayer.id}
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="IMPOSTOR"
          />
          <Button onClick={nextTurn}>PRÓXIMO ▶</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="space-y-6 text-center">
          <h2 className={sectionTitle}>FAÇAM<br/>PERGUNTAS!</h2>
          <div className="p-5 bg-arcade-panel border-4 border-black shadow-hard text-left space-y-3 font-retro text-xl text-arcade-cyan">
            <p>▸ perguntem uns aos outros sobre a palavra</p>
            <p>▸ o impostor finge que sabe</p>
            <p>▸ descubram quem é o impostor</p>
          </div>
          <Button onClick={startVoting}>INICIAR VOTAÇÃO</Button>
          <Button variant="ghost" onClick={onReset}>SAIR</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'voting') {
      return (
        <div className="space-y-5 text-center">
          <h2 className={sectionTitle}>QUEM É O<br/>IMPOSTOR?</h2>
          <p className="font-retro text-xl text-arcade-cyan leading-tight">decidam juntos e toquem no acusado</p>
          <div className="grid grid-cols-2 gap-3">
            {players.filter(p => p.isActive).map(player => (
              <button
                key={player.id}
                onClick={() => accuseImpostor(player.id)}
                className="font-pixel text-[11px] p-4 border-4 border-black shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all bg-arcade-panel2 text-arcade-cyan hover:bg-arcade-pink hover:text-white"
              >
                {player.name}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // finished
    const impostor = players.find(p => p.id === state.data?.impostorId);
    const accused = players.find(p => p.id === state.data?.accusedId);
    return (
      <div className="space-y-5 text-center">
        <h2 className={`font-pixel text-2xl leading-relaxed ${state.data?.caught ? 'text-arcade-green glow-green' : 'text-arcade-pink glow-pink'}`}>
          {state.data?.winner || 'FIM!'}
        </h2>
        <div className="bg-arcade-panel border-4 border-black shadow-hard p-5 space-y-3">
          <p className="font-pixel text-[10px] text-arcade-cyan">A PALAVRA ERA</p>
          <p className="font-pixel text-xl text-arcade-yellow glow-yellow break-words">{state.data?.secretWord}</p>
          <p className="font-pixel text-[10px] text-arcade-cyan mt-3">O IMPOSTOR ERA</p>
          <p className="font-pixel text-lg text-arcade-pink glow-pink">🕵️ {impostor?.name || '???'}</p>
          {accused && <p className="font-retro text-lg text-arcade-line mt-2">grupo acusou: {accused.name}</p>}
        </div>
        <Button variant="danger" onClick={onReset}>JOGAR DE NOVO</Button>
      </div>
    );
  };

  const renderWhoAmI = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div className="font-pixel text-arcade-cyan">CARREGANDO...</div>;
      const isViewingPlayer = currentPlayer.id === playerId;
      return (
        <div className="space-y-5">
          <TurnIndicator turnSystem={turnSystem} players={players} currentPlayerId={playerId} />
          <div className="text-center space-y-2">
            <p className="font-pixel text-[10px] text-arcade-green glow-green">PERSONAGEM DE</p>
            <h3 className="font-pixel text-2xl text-arcade-pink glow-pink break-words">{currentPlayer.name}</h3>
          </div>
          <PrivateInfoDisplay
            key={currentPlayer.id}
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="QUEM_SOU_EU"
          />
          <Button onClick={nextTurn}>{isViewingPlayer ? 'VI ✓' : 'PRÓXIMO ▶'}</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="space-y-6 text-center">
          <h2 className={sectionTitle}>FAÇA<br/>PERGUNTAS!</h2>
          <p className="font-retro text-2xl text-arcade-cyan leading-tight">
            faça perguntas de "sim ou não" para descobrir quem você é
          </p>
          <Button onClick={finishWhoAmI}>REVELAR TODOS</Button>
          <Button variant="ghost" onClick={onReset}>SAIR</Button>
        </div>
      );
    }

    // finished
    return (
      <div className="space-y-5 text-center">
        <h2 className="font-pixel text-xl text-arcade-green glow-green leading-relaxed">PERSONAGENS!</h2>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="bg-arcade-panel border-4 border-black shadow-hard p-3 flex justify-between items-center">
              <span className="font-retro text-xl text-arcade-cyan">{p.name}</span>
              <span className="font-pixel text-[11px] text-arcade-yellow glow-yellow">🎭 {state.data?.assignments?.[p.id] || '???'}</span>
            </div>
          ))}
        </div>
        <Button variant="danger" onClick={onReset}>JOGAR DE NOVO</Button>
      </div>
    );
  };

  const renderDilemma = () => {
    if (turnSystem.phase === 'results') {
      const votes: Record<string, 'A' | 'B'> = state.data.votes || {};
      const countA = Object.values(votes).filter(v => v === 'A').length;
      const countB = Object.values(votes).filter(v => v === 'B').length;
      const total = countA + countB || 1;
      const pctA = Math.round((countA / total) * 100);
      const pctB = Math.round((countB / total) * 100);

      return (
        <div className="space-y-6 text-center">
          <h2 className="font-pixel text-base text-arcade-yellow glow-yellow leading-relaxed break-words">{state.data.scenario}</h2>
          <div className="space-y-4">
            <div className="bg-arcade-panel border-4 border-black shadow-hard p-4 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-retro text-xl text-arcade-pink">A: {state.data.optionA}</span>
                <span className="font-pixel text-sm text-arcade-pink glow-pink">{pctA}%</span>
              </div>
              <div className="w-full bg-arcade-bg border-2 border-black h-4">
                <div className="bg-arcade-pink h-full transition-all" style={{ width: `${pctA}%` }} />
              </div>
              <p className="font-retro text-lg text-arcade-line mt-1">{countA} voto(s)</p>
            </div>
            <div className="bg-arcade-panel border-4 border-black shadow-hard p-4 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-retro text-xl text-arcade-cyan">B: {state.data.optionB}</span>
                <span className="font-pixel text-sm text-arcade-cyan glow-cyan">{pctB}%</span>
              </div>
              <div className="w-full bg-arcade-bg border-2 border-black h-4">
                <div className="bg-arcade-cyan h-full transition-all" style={{ width: `${pctB}%` }} />
              </div>
              <p className="font-retro text-lg text-arcade-line mt-1">{countB} voto(s)</p>
            </div>
          </div>
          <Button variant="danger" onClick={onReset}>JOGAR DE NOVO</Button>
        </div>
      );
    }

    const myVote = state.data.votes?.[playerId];
    return (
      <div className="space-y-5">
        <div className="text-center space-y-3">
          <span className="inline-block font-pixel text-[10px] bg-arcade-pink text-white px-3 py-2 border-2 border-black">DILEMA</span>
          <h2 className="font-pixel text-base text-arcade-yellow glow-yellow leading-relaxed break-words">{state.data.scenario}</h2>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => castDilemmaVote('A')}
            className={`w-full p-5 border-4 border-black shadow-hard text-left transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
              myVote === 'A' ? 'bg-arcade-pink text-white ring-4 ring-arcade-yellow' : 'bg-arcade-panel2 text-arcade-cyan'
            }`}
          >
            <span className="font-pixel text-[10px] block mb-2 text-arcade-yellow">OPÇÃO A {myVote === 'A' && '✓'}</span>
            <span className="font-retro text-2xl leading-tight">{state.data.optionA}</span>
          </button>
          <button
            onClick={() => castDilemmaVote('B')}
            className={`w-full p-5 border-4 border-black shadow-hard text-left transition-all active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
              myVote === 'B' ? 'bg-arcade-cyan text-black ring-4 ring-arcade-yellow' : 'bg-arcade-panel2 text-arcade-cyan'
            }`}
          >
            <span className="font-pixel text-[10px] block mb-2 text-arcade-yellow">OPÇÃO B {myVote === 'B' && '✓'}</span>
            <span className="font-retro text-2xl leading-tight">{state.data.optionB}</span>
          </button>
        </div>
        <div className="text-center space-y-3">
          <p className="font-pixel text-[10px] text-arcade-green glow-green">
            {Object.keys(state.data.votes || {}).length} / {activePlayers.length} VOTARAM
          </p>
          <Button onClick={showDilemmaResults} disabled={!myVote}>VER RESULTADOS</Button>
          <Button variant="ghost" onClick={onReset}>SAIR</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center max-w-lg mx-auto w-full p-5">
        {state.mode === GameMode.IMPOSTOR && renderImpostor()}
        {state.mode === GameMode.QUEM_SOU_EU && renderWhoAmI()}
        {state.mode === GameMode.DILEMAS && renderDilemma()}
      </div>
    </div>
  );
};

export default GameView;
