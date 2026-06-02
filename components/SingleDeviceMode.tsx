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
    <div className="space-y-3 p-4 rounded-4xl bg-fun-purple/5 border-2 border-dashed border-fun-purple2/40">
      <div>
        <h3 className="font-fun font-semibold text-fun-ink">
          📱 Mesmo aparelho
        </h3>
        <p className="font-fun text-sm text-fun-muted leading-snug">
          adicione amigos que vão jogar neste celular
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome do amigo"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddPlayer();
            }
          }}
          disabled={isAdding}
          className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-white border-2 border-fun-purple2/30 text-fun-ink font-fun placeholder:text-fun-muted/60 outline-none focus:border-fun-purple focus:ring-4 focus:ring-fun-purple/15 transition-all"
        />
        <button
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim() || isAdding}
          className="shrink-0 font-fun font-semibold px-5 rounded-2xl bg-gradient-to-r from-fun-green to-fun-sky text-white shadow-soft-sky active:scale-95 transition-all disabled:opacity-40"
        >
          + Add
        </button>
      </div>
    </div>
  );
};

export default SingleDeviceMode;