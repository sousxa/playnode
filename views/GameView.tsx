
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
      draft.data.winner = caught ? 'O grupo venceu! 🎉' : 'O Impostor escapou! 🕵️';
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

  const heading = "font-fun font-bold text-3xl text-fun-ink";

  // --- RENDERING LOGIC FOR EACH MODE ---

  const renderImpostor = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div className="font-fun text-fun-muted">Carregando…</div>;
      const isViewingPlayer = currentPlayer.id === playerId;

      return (
        <div className="space-y-5">
          <TurnIndicator turnSystem={turnSystem} players={players} currentPlayerId={playerId} />
          <div className="text-center space-y-1">
            <p className="font-fun text-fun-muted">{isViewingPlayer ? 'Sua vez' : 'Passe o aparelho para'}</p>
            <h3 className="font-fun font-bold text-3xl text-fun-purple break-words">{currentPlayer.name}</h3>
          </div>
          <PrivateInfoDisplay
            key={currentPlayer.id}
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="IMPOSTOR"
          />
          <Button onClick={nextTurn}>Próximo 👉</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="space-y-5 text-center">
          <h2 className={heading}>Façam perguntas! 💬</h2>
          <div className="p-5 bg-white rounded-4xl shadow-soft text-left space-y-2 font-fun text-fun-ink">
            <p>👉 Perguntem uns aos outros sobre a palavra</p>
            <p>🕵️ O impostor finge que sabe</p>
            <p>🎯 Descubram quem é o impostor</p>
          </div>
          <Button onClick={startVoting}>Iniciar votação 🗳️</Button>
          <Button variant="ghost" onClick={onReset}>Sair</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'voting') {
      return (
        <div className="space-y-5 text-center">
          <h2 className={heading}>Quem é o impostor? 🕵️</h2>
          <p className="font-fun text-fun-muted">Decidam juntos e toquem no acusado</p>
          <div className="grid grid-cols-2 gap-3">
            {players.filter(p => p.isActive).map(player => (
              <button
                key={player.id}
                onClick={() => accuseImpostor(player.id)}
                className="font-fun font-semibold p-4 rounded-3xl bg-white text-fun-ink shadow-soft-sm active:scale-95 hover:bg-fun-pink hover:text-white transition-all"
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
        <h2 className={`font-fun font-bold text-3xl ${state.data?.caught ? 'text-fun-green' : 'text-fun-pink'}`}>
          {state.data?.winner || 'Fim de jogo!'}
        </h2>
        <div className="bg-white rounded-4xl shadow-soft p-6 space-y-2">
          <p className="font-fun text-fun-muted">A palavra era</p>
          <p className="font-fun font-bold text-3xl text-fun-purple break-words">{state.data?.secretWord}</p>
          <p className="font-fun text-fun-muted mt-3">O impostor era</p>
          <p className="font-fun font-bold text-2xl text-fun-pink">🕵️ {impostor?.name || '???'}</p>
          {accused && <p className="font-fun text-sm text-fun-muted mt-2">O grupo acusou: {accused.name}</p>}
        </div>
        <Button variant="danger" onClick={onReset}>Jogar de novo 🔄</Button>
      </div>
    );
  };

  const renderWhoAmI = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div className="font-fun text-fun-muted">Carregando…</div>;
      const isViewingPlayer = currentPlayer.id === playerId;
      return (
        <div className="space-y-5">
          <TurnIndicator turnSystem={turnSystem} players={players} currentPlayerId={playerId} />
          <div className="text-center space-y-1">
            <p className="font-fun text-fun-muted">Personagem de</p>
            <h3 className="font-fun font-bold text-3xl text-fun-purple break-words">{currentPlayer.name}</h3>
          </div>
          <PrivateInfoDisplay
            key={currentPlayer.id}
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="QUEM_SOU_EU"
          />
          <Button onClick={nextTurn}>{isViewingPlayer ? 'Já vi ✓' : 'Próximo 👉'}</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="space-y-5 text-center">
          <h2 className={heading}>Faça perguntas! 💬</h2>
          <p className="font-fun text-fun-muted text-lg leading-snug">
            Faça perguntas de "sim ou não" para descobrir quem você é
          </p>
          <Button onClick={finishWhoAmI}>Revelar todos 🎭</Button>
          <Button variant="ghost" onClick={onReset}>Sair</Button>
        </div>
      );
    }

    // finished
    return (
      <div className="space-y-5 text-center">
        <h2 className={`${heading} text-fun-green`}>Personagens! 🎭</h2>
        <div className="space-y-2">
          {players.map(p => (
            <div key={p.id} className="bg-white rounded-3xl shadow-soft-sm p-4 flex justify-between items-center">
              <span className="font-fun text-fun-ink">{p.name}</span>
              <span className="font-fun font-bold text-fun-purple">🎭 {state.data?.assignments?.[p.id] || '???'}</span>
            </div>
          ))}
        </div>
        <Button variant="danger" onClick={onReset}>Jogar de novo 🔄</Button>
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
          <h2 className="font-fun font-bold text-2xl text-fun-ink break-words">{state.data.scenario}</h2>
          <div className="space-y-4">
            <div className="bg-white rounded-4xl shadow-soft p-5 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-fun font-semibold text-fun-pink">A: {state.data.optionA}</span>
                <span className="font-fun font-bold text-fun-pink">{pctA}%</span>
              </div>
              <div className="w-full bg-fun-purple/10 rounded-full h-3">
                <div className="bg-gradient-to-r from-fun-pink to-fun-coral h-3 rounded-full transition-all" style={{ width: `${pctA}%` }} />
              </div>
              <p className="font-fun text-sm text-fun-muted mt-1">{countA} voto(s)</p>
            </div>
            <div className="bg-white rounded-4xl shadow-soft p-5 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-fun font-semibold text-fun-sky">B: {state.data.optionB}</span>
                <span className="font-fun font-bold text-fun-sky">{pctB}%</span>
              </div>
              <div className="w-full bg-fun-purple/10 rounded-full h-3">
                <div className="bg-gradient-to-r from-fun-sky to-fun-purple h-3 rounded-full transition-all" style={{ width: `${pctB}%` }} />
              </div>
              <p className="font-fun text-sm text-fun-muted mt-1">{countB} voto(s)</p>
            </div>
          </div>
          <Button variant="danger" onClick={onReset}>Jogar de novo 🔄</Button>
        </div>
      );
    }

    const myVote = state.data.votes?.[playerId];
    return (
      <div className="space-y-5">
        <div className="text-center space-y-3">
          <span className="inline-block font-fun font-semibold text-sm bg-fun-pink/15 text-fun-pink px-4 py-1.5 rounded-full">Dilema 🔥</span>
          <h2 className="font-fun font-bold text-2xl text-fun-ink break-words leading-tight">{state.data.scenario}</h2>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => castDilemmaVote('A')}
            className={`w-full p-5 rounded-4xl text-left shadow-soft active:scale-[0.98] transition-all ${
              myVote === 'A' ? 'bg-gradient-to-r from-fun-pink to-fun-coral text-white ring-4 ring-fun-yellow/60' : 'bg-white text-fun-ink'
            }`}
          >
            <span className={`font-fun text-sm block mb-1 ${myVote === 'A' ? 'text-white/80' : 'text-fun-muted'}`}>Opção A {myVote === 'A' && '✓'}</span>
            <span className="font-fun font-semibold text-lg">{state.data.optionA}</span>
          </button>
          <button
            onClick={() => castDilemmaVote('B')}
            className={`w-full p-5 rounded-4xl text-left shadow-soft active:scale-[0.98] transition-all ${
              myVote === 'B' ? 'bg-gradient-to-r from-fun-sky to-fun-purple text-white ring-4 ring-fun-yellow/60' : 'bg-white text-fun-ink'
            }`}
          >
            <span className={`font-fun text-sm block mb-1 ${myVote === 'B' ? 'text-white/80' : 'text-fun-muted'}`}>Opção B {myVote === 'B' && '✓'}</span>
            <span className="font-fun font-semibold text-lg">{state.data.optionB}</span>
          </button>
        </div>
        <div className="text-center space-y-3">
          <p className="font-fun text-sm text-fun-muted">
            {Object.keys(state.data.votes || {}).length} de {activePlayers.length} votaram
            {allPlayersActed && ' — todos votaram! 🎉'}
          </p>
          <Button onClick={showDilemmaResults} disabled={!myVote}>Ver resultados 📊</Button>
          <Button variant="ghost" onClick={onReset}>Sair</Button>
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
