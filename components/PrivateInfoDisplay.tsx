import React, { useState } from 'react';

interface PrivateInfoDisplayProps {
  playerId: string;
  currentPlayerId: string;
  privateData?: any;
  gameMode: string;
  onReveal?: () => void;
}

const PrivateInfoDisplay: React.FC<PrivateInfoDisplayProps> = ({
  privateData,
  gameMode,
  onReveal
}) => {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    onReveal?.();
  };

  const renderPrivateInfo = () => {
    if (!privateData) return <div className="text-fun-muted">Sem dados</div>;

    switch (gameMode) {
      case 'IMPOSTOR':
        if (privateData.role === 'impostor') {
          return (
            <div className="text-center">
              <div className="text-6xl mb-3">🕵️</div>
              <h3 className="font-fun font-bold text-3xl text-fun-pink">Você é o Impostor!</h3>
              <p className="text-fun-muted mt-2 text-lg">Descubra a palavra sem ser pego</p>
            </div>
          );
        }
        return (
          <div className="text-center">
            <div className="text-5xl mb-2">🤫</div>
            <p className="font-fun text-fun-muted text-lg">A palavra secreta é</p>
            <p className="font-fun font-bold text-4xl text-fun-purple mt-1 break-words">{privateData.word}</p>
            <p className="text-fun-muted mt-2">Proteja do impostor!</p>
          </div>
        );

      case 'QUEM_SOU_EU':
        return (
          <div className="text-center">
            <div className="text-5xl mb-2">🎭</div>
            <p className="font-fun text-fun-muted text-lg">Você é</p>
            <p className="font-fun font-bold text-3xl text-fun-purple mt-1 break-words">{privateData.myCharacter}</p>
          </div>
        );

      default:
        return <div className="text-fun-muted text-lg">🤔 Jogo em andamento</div>;
    }
  };

  return (
    <div className="bg-white rounded-4xl shadow-soft p-6 min-h-[230px] flex flex-col justify-center">
      {!revealed ? (
        <div className="text-center">
          <div className="text-6xl mb-3">🔒</div>
          <p className="font-fun text-fun-muted text-lg mb-5 leading-snug">
            Informação secreta<br/>só você pode ver
          </p>
          <button
            onClick={handleReveal}
            className="font-fun font-semibold px-7 py-3 rounded-3xl bg-gradient-to-r from-fun-green to-fun-sky text-white shadow-soft-sky active:scale-95 transition-all"
          >
            🔓 Revelar
          </button>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 duration-300">{renderPrivateInfo()}</div>
      )}
    </div>
  );
};

export default PrivateInfoDisplay;
