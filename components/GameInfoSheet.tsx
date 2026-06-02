import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Button from './Button';
import { GameMode } from '../types';
import { GAME_INFO, GAME_TITLES } from '../games/metadata';

interface GameInfoSheetProps {
  mode: GameMode | null;
  isHost: boolean;
  onClose: () => void;
  onPlay: (mode: GameMode) => void;
}

/** Modal que sobe de baixo explicando o jogo e como jogar. */
const GameInfoSheet: React.FC<GameInfoSheetProps> = ({ mode, isHost, onClose, onPlay }) => {
  const info = mode ? GAME_INFO[mode] : null;

  return (
    <AnimatePresence>
      {mode && info && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed bottom-0 inset-x-0 z-50 bg-surface rounded-t-4xl border-t border-line p-6 pb-safe max-h-[85dvh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 rounded-full bg-line mx-auto mb-5" />
            <button onClick={onClose} aria-label="Fechar" className="absolute top-5 right-5 w-9 h-9 rounded-2xl bg-surface-2 text-text-secondary flex items-center justify-center">
              <X size={18} />
            </button>

            <div className="text-center mb-5">
              <div className="text-5xl mb-2">{info.emoji}</div>
              <h2 className="font-display font-extrabold text-2xl text-text-primary">{GAME_TITLES[mode]}</h2>
              <p className="font-sans text-text-secondary mt-1">{info.tagline}</p>
              <span className="inline-block mt-2 font-sans text-xs px-3 py-1 rounded-full bg-accent/10 text-accent">{info.players}</span>
            </div>

            <h3 className="font-display font-bold text-text-secondary text-sm mb-2 ml-1">Como jogar</h3>
            <ol className="space-y-2 mb-6">
              {info.howTo.map((step, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-lg bg-accent/15 text-accent font-display font-bold text-xs flex items-center justify-center mt-0.5">{i + 1}</span>
                  <span className="font-sans text-text-primary leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            {isHost ? (
              <Button onClick={() => onPlay(mode)}>Jogar este 🎮</Button>
            ) : (
              <p className="text-center font-sans text-sm text-text-muted py-3">Só o host inicia a partida — escolham juntos! 😉</p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default GameInfoSheet;
