import React from 'react';
import { X, Wrench } from 'lucide-react';

interface GameHeaderProps {
  title: string;
  round?: number;
  totalRounds?: number;
  onExit?: () => void;
  /** Host: reinicia a partida se travar (mostra o botão de "destravar"). */
  onForceRestart?: () => void;
}

/** Cabeçalho padrão das telas de jogo: título, rodada, sair e destravar (host). */
const GameHeader: React.FC<GameHeaderProps> = ({ title, round, totalRounds, onExit, onForceRestart }) => (
  <header className="flex items-center justify-between py-2">
    {onExit ? (
      <button
        onClick={onExit}
        aria-label="Sair do jogo"
        className="w-10 h-10 rounded-2xl bg-surface border border-line text-text-secondary flex items-center justify-center active:scale-90 transition-transform"
      >
        <X size={18} />
      </button>
    ) : <span className="w-10" />}

    <div className="text-center">
      <h1 className="font-display font-bold text-text-primary leading-none">{title}</h1>
      {round != null && totalRounds != null && (
        <p className="font-sans text-xs text-text-muted mt-0.5">Rodada {round} de {totalRounds}</p>
      )}
    </div>

    {onForceRestart ? (
      <button
        onClick={() => { if (window.confirm('Travou? Isso REINICIA a partida deste jogo pra todos. Continuar?')) onForceRestart(); }}
        aria-label="Destravar (reiniciar partida)"
        title="Destravar"
        className="w-10 h-10 rounded-2xl bg-surface border border-line text-text-secondary flex items-center justify-center active:scale-90 transition-transform"
      >
        <Wrench size={16} />
      </button>
    ) : <span className="w-10" />}
  </header>
);

export default GameHeader;
