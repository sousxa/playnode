import React from 'react';
import { TurnSystem, Player } from '../types';

interface TurnIndicatorProps {
  turnSystem: TurnSystem;
  players: Player[];
  currentPlayerId: string;
}

const phaseLabel: Record<string, string> = {
  setup: 'PREPARO',
  playing: 'JOGANDO',
  voting: 'VOTAÇÃO',
  results: 'RESULTADO',
  finished: 'FIM',
};

const TurnIndicator: React.FC<TurnIndicatorProps> = ({
  turnSystem,
  players,
  currentPlayerId
}) => {
  const isMyTurn = turnSystem.currentPlayerId === currentPlayerId;

  return (
    <div className="bg-arcade-panel border-4 border-black shadow-hard p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-pixel text-[10px] text-arcade-cyan glow-cyan">RODADA {turnSystem.roundNumber}</span>
        <span className="font-pixel text-[10px] text-arcade-yellow glow-yellow">{phaseLabel[turnSystem.phase] || turnSystem.phase}</span>
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
                  className={`font-retro text-lg px-3 py-1 border-2 border-black ${
                    isCurrent ? 'bg-arcade-yellow text-black' : isPast ? 'bg-arcade-line text-arcade-bg' : 'bg-arcade-panel2 text-arcade-cyan'
                  }`}
                >
                  {player?.name || '???'}{isCurrent && ' 🎯'}
                </span>
              );
            })}
          </div>
          <p className={`font-pixel text-[10px] text-center py-1 ${isMyTurn ? 'text-arcade-green glow-green' : 'text-arcade-cyan'}`}>
            {turnSystem.currentTurnIndex + 1} / {turnSystem.turnOrder.length}
          </p>
        </>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {players.filter(p => p.isActive).map(player => (
            <span
              key={player.id}
              className={`font-retro text-lg px-3 py-1 border-2 border-black ${
                player.hasActedThisTurn ? 'bg-arcade-green text-black' : 'bg-arcade-panel2 text-arcade-cyan'
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
