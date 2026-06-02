import React, { useState } from 'react';

interface PrivateInfoDisplayProps {
  playerId: string;
  currentPlayerId: string;
  privateData?: any;
  gameMode: string;
  onReveal?: () => void;
}

const PrivateInfoDisplay: React.FC<PrivateInfoDisplayProps> = ({
  playerId,
  currentPlayerId,
  privateData,
  gameMode,
  onReveal
}) => {
  const [revealed, setRevealed] = useState(false);
  const isViewingOwnInfo = playerId === currentPlayerId;

  const handleReveal = () => {
    setRevealed(true);
    onReveal?.();
  };

  const renderPrivateInfo = () => {
    if (!privateData) return <div className="font-retro text-2xl text-arcade-line">sem dados</div>;

    switch (gameMode) {
      case 'IMPOSTOR':
        if (privateData.role === 'impostor') {
          return (
            <div className="text-center">
              <div className="text-6xl mb-4">🕵️</div>
              <h3 className="font-pixel text-xl text-arcade-pink glow-pink leading-relaxed">VOCÊ É O<br/>IMPOSTOR!</h3>
              <p className="font-retro text-xl text-arcade-cyan mt-4">descubra a palavra sem ser pego</p>
            </div>
          );
        }
        return (
          <div className="text-center">
            <div className="text-5xl mb-3">🤫</div>
            <p className="font-pixel text-[10px] text-arcade-green glow-green mb-3">A PALAVRA É</p>
            <p className="font-pixel text-2xl text-arcade-yellow glow-yellow break-words leading-relaxed">{privateData.word}</p>
            <p className="font-retro text-xl text-arcade-cyan mt-4">proteja do impostor!</p>
          </div>
        );

      case 'QUEM_SOU_EU':
        return (
          <div className="text-center">
            <div className="text-5xl mb-3">🎭</div>
            <p className="font-pixel text-[10px] text-arcade-green glow-green mb-3">VOCÊ É</p>
            <p className="font-pixel text-xl text-arcade-yellow glow-yellow break-words leading-relaxed">{privateData.myCharacter}</p>
          </div>
        );

      default:
        return <div className="font-retro text-2xl text-arcade-cyan">🤔 jogo em andamento</div>;
    }
  };

  return (
    <div className="bg-arcade-panel border-4 border-black shadow-hard p-6 min-h-[240px] flex flex-col justify-center">
      {!revealed ? (
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="font-retro text-2xl text-arcade-cyan mb-6 leading-tight">
            informação secreta<br/>só você pode ver
          </p>
          <button
            onClick={handleReveal}
            className="font-pixel text-xs uppercase px-6 py-4 bg-arcade-green text-black border-4 border-black shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            🔓 REVELAR
          </button>
        </div>
      ) : (
        renderPrivateInfo()
      )}
    </div>
  );
};

export default PrivateInfoDisplay;
