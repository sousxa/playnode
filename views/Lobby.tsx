
import React, { useState } from 'react';
import SingleDeviceMode from '../components/SingleDeviceMode';
import { Player, GameMode } from '../types';

interface LobbyProps {
  roomCode: string;
  isHost: boolean;
  players: Player[];
  onStartGame: (mode: GameMode) => Promise<void>;
}

const GAMES = [
  { mode: GameMode.IMPOSTOR, title: 'O Impostor', desc: 'Um não sabe a palavra', icon: 'fa-user-secret', grad: 'from-fun-pink to-fun-coral' },
  { mode: GameMode.QUEM_SOU_EU, title: 'Quem Sou Eu?', desc: 'Descubra seu personagem', icon: 'fa-id-badge', grad: 'from-fun-yellow to-fun-coral' },
  { mode: GameMode.DILEMAS, title: 'Dilemas', desc: 'Votação polêmica', icon: 'fa-bolt', grad: 'from-fun-sky to-fun-purple' },
];

const Lobby: React.FC<LobbyProps> = ({ roomCode, isHost, players, onStartGame }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async (mode: GameMode) => {
    if (players.length < 2 && mode !== GameMode.DILEMAS) {
      alert("Convide pelo menos mais um amigo para testar!");
      return;
    }
    setLoading(true);
    try {
      await onStartGame(mode);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 text-center space-y-4">
        <div>
          <p className="font-fun text-sm text-fun-muted uppercase tracking-widest">Código da sala</p>
          <h2 className="font-fun font-bold text-5xl text-transparent bg-clip-text bg-gradient-to-r from-fun-purple to-fun-pink tracking-wider">{roomCode || '----'}</h2>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-3 rounded-4xl shadow-soft">
            <img src={qrUrl} alt="QR Code para entrar" className="w-28 h-28 rounded-xl" />
          </div>

          <button
            onClick={handleCopy}
            className={`font-fun font-semibold text-sm px-5 py-2.5 rounded-3xl shadow-soft-sm active:scale-95 transition-all ${copied ? 'bg-fun-green text-white' : 'bg-white text-fun-purple'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-link'} mr-2`}></i>
            {copied ? 'Copiado!' : 'Copiar convite'}
          </button>
        </div>
      </header>

      <main className="px-5 flex-1 min-h-0 overflow-y-auto space-y-6 pb-10">
        <section>
          <h3 className="font-fun font-semibold text-fun-muted mb-2 ml-1">Jogadores ({players.length})</h3>
          <div className="flex flex-wrap gap-2">
            {players.map(p => {
              const isMe = p.id === localStorage.getItem('pnode_pid');
              return (
                <span
                  key={p.id}
                  className={`font-fun px-4 py-2 rounded-2xl shadow-soft-sm animate-in zoom-in-50 ${isMe ? 'bg-gradient-to-r from-fun-purple to-fun-pink text-white' : 'bg-white text-fun-ink'}`}
                >
                  {isMe ? '🙋 Você' : `👤 ${p.name}`}
                </span>
              );
            })}
          </div>
        </section>

        {isHost && (
          <SingleDeviceMode roomCode={roomCode} isHost={isHost} players={players} />
        )}

        {isHost ? (
          <section className="space-y-3">
            <h3 className="font-fun font-semibold text-fun-muted ml-1">Escolha o jogo</h3>

            {GAMES.map(g => (
              <button
                key={g.mode}
                onClick={() => !loading && handleStart(g.mode)}
                disabled={loading}
                className="w-full p-4 bg-white rounded-4xl shadow-soft-sm text-left flex items-center gap-4 active:scale-[0.98] hover:shadow-soft transition-all disabled:opacity-50"
              >
                <div className={`w-14 h-14 shrink-0 rounded-3xl bg-gradient-to-br ${g.grad} text-white flex items-center justify-center shadow-soft-sm`}>
                  <i className={`fas ${g.icon} text-2xl`}></i>
                </div>
                <div className="min-w-0">
                  <h4 className="font-fun font-bold text-xl text-fun-ink">{g.title}</h4>
                  <p className="font-fun text-fun-muted text-sm">{g.desc}</p>
                </div>
                <i className="fas fa-chevron-right text-fun-purple2 ml-auto"></i>
              </button>
            ))}
          </section>
        ) : (
          <div className="p-8 text-center bg-white rounded-4xl shadow-soft flex flex-col items-center mt-4">
            <div className="w-14 h-14 rounded-full bg-fun-purple/10 flex items-center justify-center mb-4">
              <div className="w-3 h-3 bg-fun-purple rounded-full animate-ping"></div>
            </div>
            <p className="font-fun font-bold text-lg text-fun-ink">Aguardando o host…</p>
            <p className="font-fun text-fun-muted text-sm mt-1">ele vai escolher um jogo!</p>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-white/85 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-fun-purple border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-fun font-semibold text-fun-purple text-xl">Preparando o jogo…</p>
        </div>
      )}
    </div>
  );
};

export default Lobby;
