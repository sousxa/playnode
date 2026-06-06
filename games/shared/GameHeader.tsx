import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wrench, RotateCcw, Trophy } from 'lucide-react';

interface GameHeaderProps {
  title: string;
  round?: number;
  totalRounds?: number;
  onExit?: () => void;
  /** Host: reinicia só a rodada atual (mantém os pontos). */
  onRestartRound?: () => void;
  /** Host: reinicia a partida do zero (zera os pontos). */
  onRestartGame?: () => void;
}

/** Cabeçalho padrão das telas de jogo: título, rodada, sair e menu "destravar" (host). */
const GameHeader: React.FC<GameHeaderProps> = ({ title, round, totalRounds, onExit, onRestartRound, onRestartGame }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const canFix = !!(onRestartRound || onRestartGame);

  const restartRound = () => {
    setMenuOpen(false);
    if (window.confirm('Reiniciar a RODADA atual? Os pontos do placar são mantidos.')) onRestartRound?.();
  };
  const restartGame = () => {
    setMenuOpen(false);
    if (window.confirm('Reiniciar a PARTIDA do zero? Isso ZERA os pontos de todos.')) onRestartGame?.();
  };

  return (
    <header className="relative flex items-center justify-between py-2">
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

      {canFix ? (
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Destravar"
            title="Destravar"
            className={`w-10 h-10 rounded-2xl border flex items-center justify-center active:scale-90 transition-transform ${menuOpen ? 'bg-accent text-white border-accent' : 'bg-surface border-line text-text-secondary'}`}
          >
            <Wrench size={16} />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                {/* clique fora fecha */}
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Fechar menu"
                  onClick={() => setMenuOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="absolute right-0 top-12 z-50 w-60 rounded-2xl bg-surface border border-line shadow-soft overflow-hidden"
                >
                  <p className="px-4 pt-3 pb-1 font-sans text-xs text-text-muted">Travou? Destrave aqui 🔧</p>
                  {onRestartRound && (
                    <button
                      onClick={restartRound}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-surface-2 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center shrink-0">
                        <RotateCcw size={18} />
                      </span>
                      <span>
                        <span className="block font-display font-bold text-text-primary text-sm">Reiniciar rodada</span>
                        <span className="block font-sans text-xs text-text-muted">Recomeça a rodada · mantém os pontos</span>
                      </span>
                    </button>
                  )}
                  {onRestartGame && (
                    <button
                      onClick={restartGame}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border-t border-line active:bg-surface-2 transition-colors"
                    >
                      <span className="w-9 h-9 rounded-xl bg-danger/15 text-danger flex items-center justify-center shrink-0">
                        <Trophy size={18} />
                      </span>
                      <span>
                        <span className="block font-display font-bold text-text-primary text-sm">Reiniciar partida</span>
                        <span className="block font-sans text-xs text-text-muted">Começa do zero · apaga o placar</span>
                      </span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      ) : <span className="w-10" />}
    </header>
  );
};

export default GameHeader;
