import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hand } from 'lucide-react';
import Button from '../../components/Button';

interface CoverScreenProps {
  /** Nome de quem deve pegar o aparelho agora. */
  playerName: string;
  /** Conteúdo privado revelado após o toque. */
  children: React.ReactNode;
  /** Chamado quando o jogador termina de ver e passa adiante. */
  onDone: () => void;
  doneLabel?: string;
  instruction?: string;
}

/**
 * Tela de "passe o aparelho": esconde o conteúdo privado até o jogador certo
 * tocar para revelar. Garante a privacidade no modo single-device.
 *
 * Use com `key={playerId}` no pai para resetar o estado a cada jogador.
 */
const CoverScreen: React.FC<CoverScreenProps> = ({
  playerName,
  children,
  onDone,
  doneLabel = 'Pronto, passar 👉',
  instruction = 'Toque para ver em segredo',
}) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex-1 flex flex-col justify-center">
      <AnimatePresence mode="wait">
        {!revealed ? (
          <motion.button
            key="cover"
            onClick={() => setRevealed(true)}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center">
              <Hand className="text-accent" size={28} />
            </div>
            <p className="font-sans text-text-secondary">Passe o aparelho para</p>
            <h2 className="font-display font-extrabold text-3xl text-text-primary overflow-wrap-anywhere">{playerName}</h2>
            <p className="font-sans text-sm text-text-muted mt-2">{instruction}</p>
          </motion.button>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-surface border-2 border-line rounded-4xl p-8 min-h-[220px] flex flex-col justify-center text-center">
              {children}
            </div>
            <Button onClick={onDone}>{doneLabel}</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CoverScreen;
