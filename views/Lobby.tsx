
import React, { useState } from 'react';
import Button from '../components/Button';
import SingleDeviceMode from '../components/SingleDeviceMode';
import { Player, GameMode } from '../types';

interface LobbyProps {
  roomCode: string;
  isHost: boolean;
  players: Player[];
  onStartGame: (mode: GameMode) => Promise<void>;
}

const GAMES = [
  { mode: GameMode.IMPOSTOR, title: 'O IMPOSTOR', desc: 'um não sabe a palavra', icon: 'fa-user-secret', color: 'bg-arcade-pink', text: 'text-white' },
  { mode: GameMode.QUEM_SOU_EU, title: 'QUEM SOU EU?', desc: 'descubra seu personagem', icon: 'fa-id-badge', color: 'bg-arcade-yellow', text: 'text-black' },
  { mode: GameMode.DILEMAS, title: 'DILEMAS', desc: 'votação polêmica', icon: 'fa-bolt', color: 'bg-arcade-cyan', text: 'text-black' },
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
      <header className="p-6 border-b-4 border-arcade-line text-center space-y-4 bg-arcade-panel">
        <div>
          <p className="font-pixel text-[10px] text-arcade-green glow-green mb-3 tracking-widest">CÓDIGO DA SALA</p>
          <h2 className="font-pixel text-4xl text-arcade-yellow glow-yellow tracking-widest">{roomCode || '----'}</h2>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="bg-white p-2 border-4 border-black shadow-hard">
            <img src={qrUrl} alt="QR Code para entrar" className="w-28 h-28" style={{ imageRendering: 'pixelated' }} />
          </div>

          <button
            onClick={handleCopy}
            className={`font-pixel text-[10px] px-4 py-3 border-4 border-black shadow-hard active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all ${copied ? 'bg-arcade-green text-black' : 'bg-arcade-panel2 text-arcade-cyan'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-link'} mr-2`}></i>
            {copied ? 'COPIADO!' : 'COPIAR CONVITE'}
          </button>
        </div>
      </header>

      <main className="p-5 flex-1 min-h-0 overflow-y-auto space-y-6 pb-10">
        <section>
          <h3 className="font-pixel text-[10px] text-arcade-cyan glow-cyan mb-3">
            JOGADORES ({players.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {players.map(p => {
              const isMe = p.id === localStorage.getItem('pnode_pid');
              return (
                <span
                  key={p.id}
                  className={`font-retro text-xl px-4 py-2 border-4 border-black shadow-hard ${isMe ? 'bg-arcade-green text-black' : 'bg-arcade-panel2 text-arcade-cyan'}`}
                >
                  {isMe ? '★ VOCÊ' : `▸ ${p.name}`}
                </span>
              );
            })}
          </div>
        </section>

        {isHost && (
          <SingleDeviceMode roomCode={roomCode} isHost={isHost} players={players} />
        )}

        {isHost ? (
          <section className="space-y-4">
            <h3 className="font-pixel text-[10px] text-arcade-pink glow-pink">ESCOLHA O JOGO</h3>

            {GAMES.map(g => (
              <button
                key={g.mode}
                onClick={() => !loading && handleStart(g.mode)}
                disabled={loading}
                className="w-full p-4 bg-arcade-panel border-4 border-black shadow-hard text-left flex items-center gap-4 active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
              >
                <div className={`w-14 h-14 shrink-0 ${g.color} ${g.text} border-4 border-black flex items-center justify-center`}>
                  <i className={`fas ${g.icon} text-2xl`}></i>
                </div>
                <div className="min-w-0">
                  <h4 className="font-pixel text-sm text-arcade-yellow">{g.title}</h4>
                  <p className="font-retro text-lg text-arcade-cyan">{g.desc}</p>
                </div>
                <i className="fas fa-chevron-right text-arcade-line ml-auto"></i>
              </button>
            ))}
          </section>
        ) : (
          <div className="p-8 text-center bg-arcade-panel border-4 border-arcade-line flex flex-col items-center mt-6">
            <div className="font-pixel text-arcade-yellow text-2xl glow-yellow mb-4 blink">...</div>
            <p className="font-pixel text-xs text-arcade-cyan glow-cyan leading-relaxed">AGUARDANDO O HOST</p>
            <p className="font-retro text-lg text-arcade-line mt-2">o host vai escolher um jogo</p>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-arcade-bg/95 backdrop-blur-sm flex flex-col items-center justify-center z-[60]">
          <div className="font-pixel text-arcade-green text-2xl glow-green blink mb-4">LOADING</div>
          <p className="font-retro text-2xl text-arcade-cyan">preparando o jogo...</p>
        </div>
      )}
    </div>
  );
};

export default Lobby;
