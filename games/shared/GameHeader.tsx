import React from 'react';
import { X } from 'lucide-react';

interface GameHeaderProps {
  title: string;
  round?: number;
  totalRounds?: number;
  onExit?: () => void;
}

/** Cabeçalho padrão das telas de jogo: título, rodada e botão de sair. */
const GameHeader: React.FC<GameHeaderProps> = ({ title, round, totalRounds, onExit }) => (
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

    <span className="w-10" />
  </header>
);

export default GameHeader;
