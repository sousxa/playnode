
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

  // Dados privados do jogador atual
  const myPrivateData = players.find(p => p.id === playerId)?.privateData;

  // Verificar se todos agiram (para turnos simultâneos)
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
        // Todos viram suas informações → começa a rodada de jogo
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

  // Computa o resultado da votação do Impostor e finaliza o jogo
  const finishImpostor = (draft: GameState) => {
    const votes: Record<string, string> = draft.data.votes || {};
    const tally: Record<string, number> = {};
    Object.values(votes).forEach(target => {
      tally[target] = (tally[target] || 0) + 1;
    });

    let accusedId = '';
    let max = -1;
    Object.entries(tally).forEach(([id, count]) => {
      if (count > max) { max = count; accusedId = id; }
    });

    const caught = accusedId === draft.data.impostorId;
    draft.data.accusedId = accusedId;
    draft.data.winner = caught ? 'Grupo venceu! 🎉' : 'O Impostor escapou! 🕵️';
    draft.turnSystem.phase = 'finished';
    draft.status = 'FINISHED';
  };

  const castImpostorVote = (targetId: string) => {
    persist(draft => {
      draft.data.votes = draft.data.votes || {};
      draft.data.votes[playerId] = targetId;
      const voter = draft.players.find(p => p.id === playerId);
      if (voter) voter.hasActedThisTurn = true;

      const everyoneVoted = draft.players
        .filter(p => p.isActive)
        .every(p => p.hasActedThisTurn);
      if (everyoneVoted) finishImpostor(draft);
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

  // --- RENDERING LOGIC FOR EACH MODE ---

  const renderImpostor = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div>Carregando...</div>;

      const isViewingPlayer = currentPlayer.id === playerId;

      return (
        <div className="text-center space-y-8">
          <TurnIndicator
            turnSystem={turnSystem}
            players={players}
            currentPlayerId={playerId}
          />

          <p className="text-slate-400 font-bold uppercase tracking-widest">
            {isViewingPlayer ? 'Sua vez:' : 'Passe o aparelho para:'}
          </p>
          <h3 className="text-5xl font-black text-indigo-600">{currentPlayer.name}</h3>

          <PrivateInfoDisplay
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="IMPOSTOR"
          />

          <Button onClick={nextTurn}>
            Próximo Jogador
          </Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-black text-indigo-950">FAÇAM PERGUNTAS!</h2>
          <div className="p-8 bg-indigo-600 text-white rounded-[2rem] text-left space-y-4">
            <p className="text-lg">• Façam perguntas uns aos outros sobre a palavra</p>
            <p className="text-lg">• O Impostor deve fingir que sabe a palavra</p>
            <p className="text-lg">• Os outros devem descobrir quem é o Impostor</p>
          </div>

          <Button onClick={startVoting}>
            Iniciar Votação
          </Button>
          <Button variant="ghost" onClick={onReset}>Voltar ao Menu</Button>
        </div>
      );
    }

    if (turnSystem.phase === 'voting') {
      const myVote = state.data.votes?.[playerId];
      const votedCount = Object.keys(state.data.votes || {}).length;

      return (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-black text-indigo-950">VOTAÇÃO!</h2>
          <p className="text-xl text-slate-600">Quem você acha que é o Impostor?</p>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {players.filter(p => p.isActive).map(player => (
              <button
                key={player.id}
                className={`p-4 border-2 rounded-xl transition-colors font-bold ${
                  myVote === player.id
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white border-gray-200 hover:border-indigo-400'
                }`}
                onClick={() => castImpostorVote(player.id)}
              >
                {player.name}
                {player.id === playerId && ' (você)'}
              </button>
            ))}
          </div>

          <p className="text-slate-400 font-bold">
            {votedCount} de {activePlayers.length} votaram
          </p>
        </div>
      );
    }

    // finished
    const impostor = players.find(p => p.id === state.data?.impostorId);
    const accused = players.find(p => p.id === state.data?.accusedId);
    return (
      <div className="text-center space-y-6">
        <h2 className="text-4xl font-black text-green-600">{state.data?.winner || 'Fim de jogo!'}</h2>
        <div className="bg-white p-6 rounded-[2rem] shadow-inner space-y-3">
          <p className="text-slate-500">A palavra era:</p>
          <p className="text-4xl font-black text-indigo-600">{state.data?.secretWord}</p>
          <p className="text-slate-500 mt-4">O Impostor era:</p>
          <p className="text-3xl font-black text-rose-600">🕵️ {impostor?.name || '???'}</p>
          {accused && (
            <p className="text-slate-400 text-sm">O grupo acusou: {accused.name}</p>
          )}
        </div>
        <Button variant="danger" onClick={onReset}>Novo Jogo</Button>
      </div>
    );
  };

  const renderWhoAmI = () => {
    if (turnSystem.phase === 'setup') {
      if (!currentPlayer) return <div>Carregando...</div>;

      const isViewingPlayer = currentPlayer.id === playerId;

      return (
        <div className="text-center space-y-6">
          <TurnIndicator
            turnSystem={turnSystem}
            players={players}
            currentPlayerId={playerId}
          />

          <p className="text-slate-400 font-bold uppercase tracking-widest">
            Personagem de:
          </p>
          <h3 className="text-5xl font-black text-indigo-600">{currentPlayer.name}</h3>

          <PrivateInfoDisplay
            playerId={currentPlayer.id}
            currentPlayerId={currentPlayer.id}
            privateData={currentPlayer.privateData}
            gameMode="QUEM_SOU_EU"
          />

          <Button onClick={nextTurn}>
            {isViewingPlayer ? 'Vi meu personagem' : 'Próximo'}
          </Button>
        </div>
      );
    }

    if (turnSystem.phase === 'playing') {
      return (
        <div className="text-center space-y-8">
          <h2 className="text-4xl font-black text-indigo-950">FAÇA PERGUNTAS!</h2>
          <p className="text-lg text-slate-600">
            Faça perguntas de "Sim ou Não" aos outros para descobrir quem você é.
          </p>

          <Button onClick={finishWhoAmI}>
            Revelar Todos os Personagens
          </Button>
          <Button variant="ghost" onClick={onReset}>Voltar ao Menu</Button>
        </div>
      );
    }

    // finished — revela todos os personagens
    return (
      <div className="text-center space-y-6">
        <h2 className="text-4xl font-black text-green-600">PERSONAGENS REVELADOS!</h2>
        <div className="space-y-3">
          {players.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
              <span className="font-bold text-slate-700">{p.name}</span>
              <span className="font-black text-indigo-600 text-xl">
                🎭 {state.data?.assignments?.[p.id] || '???'}
              </span>
            </div>
          ))}
        </div>
        <Button variant="danger" onClick={onReset}>Novo Jogo</Button>
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
        <div className="text-center space-y-8 py-10">
          <h2 className="text-3xl font-black text-slate-900">{state.data.scenario}</h2>

          <div className="space-y-4">
            <div className="bg-indigo-600 text-white p-6 rounded-[2rem] text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">A: {state.data.optionA}</span>
                <span className="font-black text-2xl">{pctA}%</span>
              </div>
              <div className="w-full bg-indigo-900/40 rounded-full h-3">
                <div className="bg-white h-3 rounded-full transition-all" style={{ width: `${pctA}%` }} />
              </div>
              <p className="text-indigo-200 text-sm mt-2">{countA} voto(s)</p>
            </div>

            <div className="bg-white border-4 border-indigo-600 text-indigo-700 p-6 rounded-[2rem] text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">B: {state.data.optionB}</span>
                <span className="font-black text-2xl">{pctB}%</span>
              </div>
              <div className="w-full bg-indigo-100 rounded-full h-3">
                <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${pctB}%` }} />
              </div>
              <p className="text-indigo-400 text-sm mt-2">{countB} voto(s)</p>
            </div>
          </div>

          <Button variant="danger" onClick={onReset}>Novo Jogo</Button>
        </div>
      );
    }

    const myVote = state.data.votes?.[playerId];

    return (
      <div className="h-full flex flex-col justify-between py-10 space-y-8">
        <div className="text-center space-y-4">
          <span className="bg-rose-100 text-rose-600 px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest">Dilema</span>
          <h2 className="text-3xl font-black text-slate-900 leading-tight">
            {state.data.scenario}
          </h2>
        </div>

        <div className="space-y-4 w-full">
          <button
            className={`w-full p-8 rounded-[2rem] text-xl font-bold text-left shadow-lg active:scale-95 transition-transform ${
              myVote === 'A' ? 'bg-indigo-800 text-white ring-4 ring-indigo-300' : 'bg-indigo-600 text-white'
            }`}
            onClick={() => castDilemmaVote('A')}
          >
            <span className="text-indigo-300 text-sm block mb-1">Opção A {myVote === 'A' && '✓'}</span>
            {state.data.optionA}
          </button>

          <div className="text-center font-black text-slate-300">OU</div>

          <button
            className={`w-full p-8 rounded-[2rem] text-xl font-bold text-left shadow-md active:scale-95 transition-transform ${
              myVote === 'B' ? 'bg-indigo-800 text-white ring-4 ring-indigo-300' : 'bg-white border-4 border-indigo-600 text-indigo-600'
            }`}
            onClick={() => castDilemmaVote('B')}
          >
            <span className={`text-sm block mb-1 ${myVote === 'B' ? 'text-indigo-200' : 'text-indigo-400'}`}>Opção B {myVote === 'B' && '✓'}</span>
            {state.data.optionB}
          </button>
        </div>

        <div className="text-center space-y-3">
          <p className="text-slate-400 font-bold">
            {Object.keys(state.data.votes || {}).length} de {activePlayers.length} votaram
          </p>
          {allPlayersActed && (
            <p className="text-green-600 font-semibold">Todos votaram!</p>
          )}
          <Button onClick={showDilemmaResults} disabled={!myVote}>Ver Resultados</Button>
          <Button variant="ghost" onClick={onReset}>Voltar ao Menu</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-indigo-50 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center max-w-lg mx-auto w-full p-5">
        {state.mode === GameMode.IMPOSTOR && renderImpostor()}
        {state.mode === GameMode.QUEM_SOU_EU && renderWhoAmI()}
        {state.mode === GameMode.DILEMAS && renderDilemma()}
      </div>
    </div>
  );
};

export default GameView;
