import React, { useState } from 'react';
import { localStorageSyncService } from '../services/localStorageSync';

interface SingleDeviceModeProps {
  roomCode: string;
  isHost: boolean;
  players: Array<{ id: string; name: string; isActive: boolean }>;
  onPlayerAdded?: () => void;
}

const SingleDeviceMode: React.FC<SingleDeviceModeProps> = ({
  roomCode,
  isHost,
  players,
  onPlayerAdded
}) => {
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddPlayer = () => {
    if (!newPlayerName.trim() || !isHost) return;

    setIsAdding(true);
    try {
      // Gerar ID único para o novo jogador
      const newPlayerId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Adicionar jogador manualmente
      localStorageSyncService.addLocalPlayer(roomCode, newPlayerId, newPlayerName.trim());
      
      setNewPlayerName('');
      if (onPlayerAdded) {
        onPlayerAdded();
      }
    } catch (error) {
      console.error('Erro ao adicionar jogador:', error);
      alert('Erro ao adicionar jogador');
    } finally {
      setIsAdding(false);
    }
  };

  if (!isHost) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 bg-arcade-panel2 border-4 border-arcade-line">
      <div>
        <h3 className="font-pixel text-[10px] text-arcade-yellow glow-yellow mb-1">
          📱 MESMO APARELHO
        </h3>
        <p className="font-retro text-lg text-arcade-cyan leading-tight">
          adicione amigos que vão jogar neste celular
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="nome..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddPlayer();
            }
          }}
          disabled={isAdding}
          className="flex-1 min-w-0 px-3 py-2 bg-arcade-bg border-4 border-black text-arcade-cyan font-retro text-xl placeholder:text-arcade-line outline-none focus:border-arcade-cyan"
        />
        <button
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim() || isAdding}
          className="shrink-0 font-pixel text-[10px] px-4 bg-arcade-green text-black border-4 border-black shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-40"
        >
          + ADD
        </button>
      </div>
    </div>
  );
};

export default SingleDeviceMode;