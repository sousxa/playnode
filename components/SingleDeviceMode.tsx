import React, { useState } from 'react';
import { localStorageSyncService } from '../services/localStorageSync';

interface SingleDeviceModeProps {
  roomCode: string;
  isHost: boolean;
  players: Array<{ id: string; name: string }>;
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
    <div className="space-y-3 p-4 rounded-3xl bg-surface-2 border-2 border-dashed border-line">
      <div>
        <h3 className="font-display font-bold text-text-primary">📱 Mesmo aparelho</h3>
        <p className="font-sans text-sm text-text-secondary leading-snug">
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
          className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-bg border-2 border-line text-text-primary font-sans placeholder:text-text-muted outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim() || isAdding}
          className="shrink-0 font-display font-bold px-5 rounded-2xl bg-success text-white active:scale-95 transition-transform disabled:opacity-40"
          style={{ boxShadow: '0 4px 0 rgb(var(--color-success-dark))' }}
        >
          + Add
        </button>
      </div>
    </div>
  );
};

export default SingleDeviceMode;