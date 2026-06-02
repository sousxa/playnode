import React, { useState } from 'react';
import Button from './Button';
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
    <div className="space-y-4 p-4 bg-indigo-50 rounded-xl border-2 border-dashed border-indigo-300">
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-widest">
          📱 Modo Single Device
        </h3>
        <p className="text-xs text-indigo-600">
          Você está em modo local. Adicione jogadores manualmente.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Nome do jogador..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              handleAddPlayer();
            }
          }}
          disabled={isAdding}
          className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
        />
        <Button
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim() || isAdding}
          variant="secondary"
          className="text-sm px-4"
        >
          Adicionar
        </Button>
      </div>

      <div className="text-xs text-indigo-600 text-center">
        {players.length} jogador{players.length !== 1 ? 'es' : ''} adicionado{players.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
};

export default SingleDeviceMode;