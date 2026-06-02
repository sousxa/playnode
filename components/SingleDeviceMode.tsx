import React, { useState } from 'react';

interface SingleDeviceModeProps {
  isHost: boolean;
  onAddPlayer: (name: string) => void;
  online?: boolean;
}

const SingleDeviceMode: React.FC<SingleDeviceModeProps> = ({ isHost, onAddPlayer, online }) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name || !isHost) return;
    onAddPlayer(name);
    setNewPlayerName('');
  };

  if (!isHost) return null;

  return (
    <div className="space-y-3 p-4 rounded-3xl bg-surface-2 border-2 border-dashed border-line">
      <div>
        <h3 className="font-display font-bold text-text-primary">➕ Adicionar jogador</h3>
        <p className="font-sans text-sm text-text-secondary leading-snug">
          {online ? 'adicione quem está junto de você (ou peça pra entrarem pelo QR)' : 'adicione amigos que vão jogar neste celular'}
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
          className="flex-1 min-w-0 px-4 py-2.5 rounded-2xl bg-bg border-2 border-line text-text-primary font-sans placeholder:text-text-muted outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handleAddPlayer}
          disabled={!newPlayerName.trim()}
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