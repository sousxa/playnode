
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { VenetianMask, Drama, Link2, Check, ChevronRight, Wifi, Skull, HeartCrack, Trophy, Layers, Timer, Moon, LogOut, Spade } from 'lucide-react';
import SingleDeviceMode from '../components/SingleDeviceMode';
import ThemeToggle from '../components/ThemeToggle';
import GameInfoSheet from '../components/GameInfoSheet';
import { GameMode } from '../types';

interface LobbyProps {
  roomCode: string;
  isHost: boolean;
  players: { id: string; name: string }[];
  myId?: string;
  hostId?: string;
  onlineMode?: boolean;
  onSelectGame: (mode: GameMode) => void;
  onShowRanking?: () => void;
  onAddPlayer: (name: string) => void;
  onLeave: () => void;
  onMakeHost?: (id: string) => void;
  onKick?: (id: string, name: string) => void;
}

const GAMES = [
  { mode: GameMode.IMPOSTOR, title: 'O Impostor', desc: 'Um não sabe a palavra', Icon: VenetianMask, color: 'text-danger', bg: 'bg-danger/15' },
  { mode: GameMode.QUEM_SOU_EU, title: 'Quem Sou Eu?', desc: 'Adivinhe seu personagem', Icon: Drama, color: 'text-warning', bg: 'bg-warning/15' },
  { mode: GameMode.AMIGOS_DE_MERDA, title: 'Amigos de Merda', desc: 'Quem é mais provável…', Icon: Skull, color: 'text-danger', bg: 'bg-danger/15' },
  { mode: GameMode.VERDADE_OU_DESAFIO, title: 'Verdade ou Desafio', desc: 'Clássico ousado', Icon: HeartCrack, color: 'text-warning', bg: 'bg-warning/15' },
  { mode: GameMode.CARTAS_PODRES, title: 'Cartas Podres', desc: 'Complete a frase mais podre', Icon: Layers, color: 'text-accent', bg: 'bg-accent/15' },
  { mode: GameMode.STOP, title: 'Stop! / Adedonha', desc: 'Letra, categorias e correria', Icon: Timer, color: 'text-success', bg: 'bg-success/15' },
  { mode: GameMode.CIDADE_DORME, title: 'A Cidade Dorme', desc: 'Dedução: ache o assassino', Icon: Moon, color: 'text-accent', bg: 'bg-accent/15' },
  { mode: GameMode.UNO_NO_MERCY, title: 'Uno No Mercy', desc: 'Uno brutal: +10 e eliminação', Icon: Spade, color: 'text-danger', bg: 'bg-danger/15' },
];

const Lobby: React.FC<LobbyProps> = ({ roomCode, isHost, players, myId, hostId, onlineMode, onSelectGame, onShowRanking, onAddPlayer, onLeave, onMakeHost, onKick }) => {
  const [copied, setCopied] = useState(false);
  const [infoMode, setInfoMode] = useState<GameMode | null>(null);
  const [actionPlayer, setActionPlayer] = useState<{ id: string; name: string } | null>(null);
  const canManage = !!isHost && !!onlineMode;

  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-wrapper p-5 space-y-5">
      <div className="flex items-center justify-between">
        <span className="font-display font-bold text-text-secondary">Sala</span>
        <ThemeToggle />
      </div>

      <div className="text-center">
        <p className="font-sans text-sm text-text-muted uppercase tracking-widest">Código da sala</p>
        <h2 className="font-display font-extrabold text-5xl text-gradient tracking-wider">{roomCode || '----'}</h2>
      </div>

      {onlineMode && (
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-success/10 border border-success/30">
          <Wifi className="text-success shrink-0 mt-0.5" size={18} />
          <p className="font-sans text-sm text-text-secondary">
            <b className="text-text-primary">Sala online 🟢</b> — seus amigos entram escaneando o QR ou com o código <b className="text-text-primary">{roomCode}</b>. Os nomes aparecem aqui na hora.
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className="bg-white p-2.5 rounded-3xl shadow-lg">
          <img src={qrUrl} alt="QR Code" className="w-28 h-28 rounded-xl" />
        </div>
        <button
          onClick={handleCopy}
          className={`font-display font-bold text-sm px-4 py-2 rounded-2xl border transition-colors flex items-center gap-2 ${copied ? 'bg-success text-white border-success' : 'bg-surface text-accent border-line'}`}
        >
          {copied ? <Check size={16} /> : <Link2 size={16} />}
          {copied ? 'Copiado!' : 'Copiar convite'}
        </button>
      </div>

      <section>
        <h3 className="font-display font-bold text-text-secondary mb-2 ml-1">Jogadores ({players.length})</h3>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const isMe = p.id === myId;
            const isHostP = p.id === hostId;
            const manage = canManage && !isMe; // host pode gerenciar os outros
            const cls = `font-sans font-medium px-4 py-2 rounded-2xl border ${isMe ? 'bg-accent text-white border-accent' : 'bg-surface text-text-primary border-line'}`;
            const label = <>{isHostP ? '👑 ' : isMe ? '🙋 ' : '👤 '}{isMe ? 'Você' : p.name}{isHostP && <span className="opacity-70 text-xs font-sans"> · host</span>}</>;
            return manage ? (
              <button key={p.id} onClick={() => setActionPlayer(p)} className={`${cls} active:scale-95 transition-transform`}>
                {label} <span className="opacity-50">⋯</span>
              </button>
            ) : (
              <span key={p.id} className={cls}>{label}</span>
            );
          })}
        </div>
      </section>

      <motion.button
        onClick={onShowRanking}
        style={{ boxShadow: '0 5px 0 rgb(var(--color-accent) / 0.25)' }}
        whileTap={{ y: 5, boxShadow: '0 0px 0 rgb(var(--color-accent) / 0.25)' }}
        whileHover={{ y: -2, boxShadow: '0 7px 0 rgb(var(--color-accent) / 0.25)' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-full flex items-center gap-3 p-4 rounded-3xl bg-accent/10 border-2 border-accent/30 text-left"
      >
        <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent flex items-center justify-center">
          <Trophy size={20} />
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-text-primary">Ranking da sala</p>
          <p className="font-sans text-xs text-text-muted">Pontos somados de todos os jogos</p>
        </div>
        <ChevronRight className="text-text-muted" size={20} />
      </motion.button>

      {/* No online a galera entra pelo link/QR; "adicionar jogador" só no mesmo aparelho. */}
      {!onlineMode && <SingleDeviceMode isHost={isHost} onAddPlayer={onAddPlayer} online={onlineMode} />}

      <section className="space-y-3">
        <h3 className="font-display font-bold text-text-secondary ml-1">
          Jogos {!isHost && <span className="font-sans font-normal text-text-muted text-sm">· só o host inicia</span>}
        </h3>
        {GAMES.map(({ mode, title, desc, Icon, color, bg }) => (
          <motion.button
            key={mode}
            onClick={() => setInfoMode(mode)}
            style={{ boxShadow: '0 5px 0 rgb(var(--color-border))' }}
            whileTap={{ y: 5, boxShadow: '0 0px 0 rgb(var(--color-border))' }}
            whileHover={{ y: -2, boxShadow: '0 7px 0 rgb(var(--color-border))' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-full p-4 bg-surface border-2 border-line rounded-3xl text-left flex items-center gap-4"
          >
            <div className={`w-14 h-14 shrink-0 rounded-2xl ${bg} ${color} flex items-center justify-center`}>
              <Icon size={26} />
            </div>
            <div className="min-w-0">
              <h4 className="font-display font-bold text-xl text-text-primary">{title}</h4>
              <p className="font-sans text-text-muted text-sm">{desc}</p>
            </div>
            <ChevronRight className="text-text-muted ml-auto" size={20} />
          </motion.button>
        ))}
      </section>

      <button
        onClick={onLeave}
        className="w-full flex items-center justify-center gap-2 py-3 font-display font-bold text-text-muted hover:text-danger transition-colors"
      >
        <LogOut size={18} /> Sair da sala
      </button>

      <GameInfoSheet
        mode={infoMode}
        isHost={isHost}
        onClose={() => setInfoMode(null)}
        onPlay={(m) => { setInfoMode(null); onSelectGame(m); }}
      />

      {/* Ações do host num jogador */}
      {actionPlayer && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setActionPlayer(null)}>
          <div className="w-full max-w-sm bg-surface border border-line rounded-3xl p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <p className="font-display font-bold text-lg text-text-primary text-center">{actionPlayer.name}</p>
            <button
              onClick={() => { onMakeHost?.(actionPlayer.id); setActionPlayer(null); }}
              className="w-full p-3 rounded-2xl bg-accent/10 border border-accent/30 text-accent font-display font-bold active:scale-[0.98] transition-transform"
            >
              👑 Tornar host
            </button>
            <button
              onClick={() => { onKick?.(actionPlayer.id, actionPlayer.name); setActionPlayer(null); }}
              className="w-full p-3 rounded-2xl bg-danger/10 border border-danger/30 text-danger font-display font-bold active:scale-[0.98] transition-transform"
            >
              🚫 Expulsar da sala
            </button>
            <button onClick={() => setActionPlayer(null)} className="w-full p-3 font-display font-bold text-text-muted">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
