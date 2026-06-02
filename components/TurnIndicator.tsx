import React from 'react';
import { TurnSystem, Player } from '../types';

interface TurnIndicatorProps {
  turnSystem: TurnSystem;
  players: Player[];
  currentPlayerId: string;
}

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnSystem,
  players,
  currentPlayerId
}) => {
  const currentPlayer = players.find(p => p.id === turnSystem.currentPlayerId);
  const isMyTurn = turnSystem.currentPlayerId === currentPlayerId;

  return (
    <div className="turn-indicator mb-6 p-4 bg-white rounded-xl shadow-sm border-2 border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Rodada {turnSystem.roundNumber}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          turnSystem.phase === 'playing' ? 'bg-blue-100 text-blue-800' :
          turnSystem.phase === 'voting' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {turnSystem.phase === 'playing' ? 'Jogando' :
           turnSystem.phase === 'voting' ? 'Votação' :
           turnSystem.phase}
        </span>
      </div>

      {turnSystem.turnType === 'sequential' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Ordem dos turnos:</span>
            <span className="text-sm text-gray-500">
              {turnSystem.currentTurnIndex + 1} de {turnSystem.turnOrder.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {turnSystem.turnOrder.map((playerId, index) => {
              const player = players.find(p => p.id === playerId);
              const isCurrent = index === turnSystem.currentTurnIndex;
              const isPast = index < turnSystem.currentTurnIndex;

              return (
                <div
                  key={playerId}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isCurrent
                      ? 'bg-blue-500 text-white shadow-lg scale-105'
                      : isPast
                      ? 'bg-gray-200 text-gray-600'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {player?.name || 'Jogador'}
                  {isCurrent && (
                    <span className="ml-2 animate-pulse">🎯</span>
                  )}
                </div>
              );
            })}
          </div>

          {currentPlayer && (
            <div className={`p-3 rounded-lg text-center font-semibold ${
              isMyTurn
                ? 'bg-green-100 text-green-800 border-2 border-green-300'
                : 'bg-blue-50 text-blue-800'
            }`}>
              {isMyTurn ? (
                <>🎉 É sua vez, {currentPlayer.name}!</>
              ) : (
                <>Vez de: {currentPlayer.name}</>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-800 mb-2">
            Turnos Simultâneos
          </div>
          <div className="text-sm text-gray-600">
            Todos os jogadores agem ao mesmo tempo
          </div>
          <div className="mt-3 flex justify-center space-x-2">
            {players
              .filter(p => p.isActive)
              .map(player => (
                <div
                  key={player.id}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    player.hasActedThisTurn
                      ? 'bg-green-100 text-green-800'
                      : player.id === currentPlayerId
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {player.name}
                  {player.hasActedThisTurn && <span className="ml-1">✓</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TurnIndicator;