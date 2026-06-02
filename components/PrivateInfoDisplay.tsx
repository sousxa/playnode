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
    if (!privateData) return <div>Sem dados privados</div>;

    switch (gameMode) {
      case 'IMPOSTOR':
        if (isViewingOwnInfo) {
          return privateData.role === 'impostor' ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🕵️‍♂️</div>
              <h3 className="text-4xl font-black text-rose-600">VOCÊ É O IMPOSTOR!</h3>
              <p className="text-lg text-rose-500 mt-2">Descubra a palavra secreta sem ser pego</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">🛡️</div>
              <h3 className="text-4xl font-black text-indigo-950">Palavra Secreta:</h3>
              <p className="text-6xl font-black text-indigo-600 mt-4">{privateData.word}</p>
              <p className="text-lg text-indigo-500 mt-2">Proteja esta palavra do impostor</p>
            </div>
          );
        } else {
          return (
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-xl text-green-600">Informação revelada com sucesso</p>
            </div>
          );
        }

      case 'QUEM_SOU_EU':
        if (isViewingOwnInfo) {
          return (
            <div className="text-center">
              <div className="text-6xl mb-4">🎭</div>
              <h3 className="text-4xl font-black text-indigo-950">Seu Personagem:</h3>
              <p className="text-4xl font-black text-indigo-600 mt-4">{privateData.myCharacter}</p>
              <p className="text-lg text-indigo-500 mt-2">Ninguém mais sabe quem você é</p>
            </div>
          );
        } else {
          return (
            <div className="text-center">
              <div className="text-4xl mb-4">👁️</div>
              <p className="text-xl text-blue-600">Personagem revelado para todos</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">{privateData.myCharacter}</p>
            </div>
          );
        }

      case 'DILEMAS':
        return (
          <div className="text-center">
            <div className="text-4xl mb-4">🤔</div>
            <p className="text-xl text-purple-600">Dilema moral em andamento</p>
          </div>
        );

      default:
        return <div>Modo de jogo não suportado</div>;
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-dashed border-indigo-100 min-h-[300px] flex flex-col justify-center shadow-inner">
      {!revealed ? (
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-xl text-slate-600 mb-6">
            {isViewingOwnInfo
              ? 'Informação privada - apenas você pode ver'
              : 'Informação privada - revele apenas para o jogador'
            }
          </p>
          <button
            onClick={handleReveal}
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xl hover:bg-indigo-700 transition-colors"
          >
            🔓 Revelar Informação
          </button>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 duration-300">
          {renderPrivateInfo()}
        </div>
      )}
    </div>
  );
};

export default PrivateInfoDisplay;