
import React, { useState } from 'react';
import { VenetianMask, Drama, Flame, Link2, Check, ChevronRight, Martini } from 'lucide-react';
import SingleDeviceMode from '../components/SingleDeviceMode';
import ThemeToggle from '../components/ThemeToggle';
import { GameMode } from '../types';

interface LobbyProps {
  roomCode: string;
  isHost: boolean;
  players: { id: string; name: string }[];
  alcoholicMode: boolean;
  onAlcoholicChange: (v: boolean) => void;
  onStartGame: (mode: GameMode, opts?: { alcoholicMode?: boolean }) => void;
}

const GAMES = [
  { mode: GameMode.IMPOSTOR, title: 'O Impostor', desc: 'Um não sabe a palavra', Icon: VenetianMask, color: 'text-danger', bg: 'bg-danger/15' },
  { mode: GameMode.QUEM_SOU_EU, title: 'Quem Sou Eu?', desc: 'Adivinhe seu personagem', Icon: Drama, color: 'text-warning', bg: 'bg-warning/15' },
  { mode: GameMode.DILEMAS, title: 'Dilemas', desc: 'Votação polêmica', Icon: Flame, color: 'text-accent', bg: 'bg-accent/15' },
];

const Lobby: React.FC<LobbyProps> = ({ roomCode, isHost, players, alcoholicMode, onAlcoholicChange, onStartGame }) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 pb-4 text-center relative">
        <div className="absolute top-5 right-5"><ThemeToggle /></div>
        <p className="font-sans text-sm text-text-muted uppercase tracking-widest">Código da sala</p>
        <h2 className="font-display font-extrabold text-5xl text-gradient tracking-wider">{roomCode || '----'}</h2>
        <div className="flex flex-col items-center gap-3 mt-3">
          <div className="bg-white p-2.5 rounded-3xl shadow-lg">
            <img src={qrUrl} alt="QR Code" className="w-24 h-24 rounded-xl" />
          </div>
          <button
            onClick={handleCopy}
            className={`font-display font-bold text-sm px-4 py-2 rounded-2xl border transition-colors flex items-center gap-2 ${copied ? 'bg-success text-white border-success' : 'bg-surface text-accent border-line'}`}
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {copied ? 'Copiado!' : 'Copiar convite'}
          </button>
        </div>
      </header>

      <main className="px-5 flex-1 min-h-0 overflow-y-auto space-y-6 pb-10">
        <section>
          <h3 className="font-display font-bold text-text-secondary mb-2 ml-1">Jogadores ({players.length})</h3>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const isMe = p.id === localStorage.getItem('pnode_pid');
              return (
                <span
                  key={p.id}
                  className={`font-sans font-medium px-4 py-2 rounded-2xl border ${isMe ? 'bg-accent text-white border-accent' : 'bg-surface text-text-primary border-line'}`}
                >
                  {isMe ? '🙋 Você' : `👤 ${p.name}`}
                </span>
              );
            })}
          </div>
        </section>

        {isHost && <SingleDeviceMode roomCode={roomCode} isHost={isHost} players={players} />}

        {isHost ? (
          <>
            {/* Toggle modo alcoólico */}
            <button
              onClick={() => onAlcoholicChange(!alcoholicMode)}
              className="w-full flex items-center gap-3 p-4 rounded-3xl bg-surface border border-line text-left"
            >
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${alcoholicMode ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-text-muted'}`}>
                <Martini size={20} />
              </div>
              <div className="flex-1">
                <p className="font-display font-bold text-text-primary">Modo alcoólico 🍻</p>
                <p className="font-sans text-xs text-text-muted">Libera conteúdo adulto (18+)</p>
              </div>
              <span className={`w-12 h-7 rounded-full p-1 transition-colors ${alcoholicMode ? 'bg-danger' : 'bg-surface-2'}`}>
                <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${alcoholicMode ? 'translate-x-5' : ''}`} />
              </span>
            </button>

            <section className="space-y-3">
              <h3 className="font-display font-bold text-text-secondary ml-1">Escolha o jogo</h3>
              {GAMES.map(({ mode, title, desc, Icon, color, bg }) => (
                <button
                  key={mode}
                  onClick={() => onStartGame(mode, { alcoholicMode })}
                  className="w-full p-4 bg-surface border border-line rounded-3xl text-left flex items-center gap-4 active:scale-[0.98] hover:border-accent transition-all"
                >
                  <div className={`w-14 h-14 shrink-0 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
                    <Icon size={26} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xl text-text-primary">{title}</h4>
                    <p className="font-sans text-text-muted text-sm">{desc}</p>
                  </div>
                  <ChevronRight className="text-text-muted ml-auto" size={20} />
                </button>
              ))}
            </section>
          </>
        ) : (
          <div className="p-8 text-center bg-surface border border-line rounded-4xl flex flex-col items-center mt-4">
            <div className="w-3 h-3 bg-accent rounded-full animate-ping mb-4" />
            <p className="font-display font-bold text-lg text-text-primary">Aguardando o host…</p>
            <p className="font-sans text-text-muted text-sm mt-1">ele vai escolher um jogo!</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Lobby;
