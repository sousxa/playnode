import React from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import type { Player } from '../../engine/types';

interface GameOverProps {
  title?: string;
  players: Player[];
  scores?: Record<string, number>;
  onPlayAgain: () => void;
  onExit: () => void;
  onRanking?: () => void;
  /** Online: só o host joga de novo / volta ao menu (false esconde esses botões). */
  canControl?: boolean;
}

/** Tela final reutilizável: ranking opcional por pontos + jogar de novo. */
const GameOver: React.FC<GameOverProps> = ({ title = 'Fim de jogo!', players, scores, onPlayAgain, onExit, onRanking, canControl = true }) => {
  const ranked = scores
    ? [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
    : players;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col justify-center space-y-6 text-center">
      <div>
        <div className="text-6xl mb-2">🏆</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{title}</h2>
      </div>

      {scores && (
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div key={p.id} className="bg-surface border border-line rounded-2xl p-3 flex items-center justify-between">
              <span className="font-display font-bold text-text-primary">
                {i === 0 ? '👑' : `${i + 1}º`} {p.name}
              </span>
              <span className="font-display font-bold text-accent">{scores[p.id] ?? 0} pts</span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {canControl && <Button variant="success" onClick={onPlayAgain}>🔄 Jogar de novo</Button>}
        {onRanking && <Button variant="secondary" onClick={onRanking}>🏆 Ranking da sala</Button>}
        {canControl ? (
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">Aguardando o host…</p>
        )}
      </div>
    </motion.div>
  );
};

export default GameOver;
