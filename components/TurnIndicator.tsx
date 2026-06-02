import React from 'react';
import { TurnSystem, Player } from '../types';

interface TurnIndicatorProps {
  turnSystem: TurnSystem;
  players: Player[];
  currentPlayerId: string;
}

const phaseLabel: Record<string, string> = {
  setup: 'Preparo',
  playing: 'Jogando',
  voting: 'Votação',
  results: 'Resultado',
  finished: 'Fim',
};

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnSystem,
  players,
  currentPlayerId
}) => {
  const isMyTurn = turnSystem.currentPlayerId === currentPlayerId;

  return (
    <div className="bg-white rounded-4xl shadow-soft-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-fun font-semibold text-fun-ink">Rodada {turnSystem.roundNumber}</span>
        <span className="font-fun text-sm px-3 py-1 rounded-full bg-fun-purple/10 text-fun-purple">
          {phaseLabel[turnSystem.phase] || turnSystem.phase}
        </span>
      </div>

      {turnSystem.turnType === 'sequential' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {turnSystem.turnOrder.map((pid, index) => {
              const player = players.find(p => p.id === pid);
              const isCurrent = index === turnSystem.currentTurnIndex;
              const isPast = index < turnSystem.currentTurnIndex;
              return (
                <span
                  key={pid}
                  className={`font-fun text-sm px-3 py-1.5 rounded-2xl transition-all ${
                    isCurrent
                      ? 'bg-gradient-to-r from-fun-purple to-fun-pink text-white shadow-soft-sm'
                      : isPast ? 'bg-fun-green/20 text-fun-green' : 'bg-fun-purple/8 text-fun-muted'
                  }`}
                >
                  {player?.name || '???'}{isCurrent && ' 🎯'}{isPast && ' ✓'}
                </span>
              );
            })}
          </div>
          <p className={`font-fun text-sm text-center ${isMyTurn ? 'text-fun-green' : 'text-fun-muted'}`}>
            {turnSystem.currentTurnIndex + 1} de {turnSystem.turnOrder.length}
          </p>
        </>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {players.filter(p => p.isActive).map(player => (
            <span
              key={player.id}
              className={`font-fun text-sm px-3 py-1.5 rounded-2xl ${
                player.hasActedThisTurn ? 'bg-fun-green/20 text-fun-green' : 'bg-fun-purple/8 text-fun-muted'
              }`}
            >
              {player.name}{player.hasActedThisTurn && ' ✓'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TurnIndicator;
