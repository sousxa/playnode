import React from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import Button from './Button';

interface RankingProps {
  players: { id: string; name: string }[];
  scores: Record<string, number>;
  onClose: () => void;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Ranking acumulado da sala (entre todos os jogos jogados). */
const Ranking: React.FC<RankingProps> = ({ players, scores, onClose }) => {
  const ranked = [...players].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));
  const hasScores = Object.values(scores).some((v) => Number(v) > 0);

  return (
    <div className="page-wrapper flex flex-col p-5">
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
            <Trophy className="text-accent" size={32} />
          </div>
          <h1 className="font-display font-extrabold text-3xl text-text-primary">Ranking da sala</h1>
          <p className="font-sans text-text-secondary text-sm mt-1">Pontos somados de todos os jogos</p>
        </div>

        {hasScores ? (
          <div className="space-y-2">
            {ranked.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center justify-between p-4 rounded-3xl border ${i === 0 ? 'bg-accent/10 border-accent/40' : 'bg-surface border-line'}`}
              >
                <span className="font-display font-bold text-text-primary flex items-center gap-2">
                  <span className="w-7 text-center">{MEDALS[i] ?? `${i + 1}º`}</span>
                  {p.name}
                </span>
                <span className="font-display font-extrabold text-accent">{scores[p.id] ?? 0} pts</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="font-sans text-text-muted text-center">Joguem uma partida com placar (Impostor, Quem Sou Eu, Amigos de Merda) para abrir o ranking! 🎯</p>
        )}

        <Button onClick={onClose}>Voltar ao menu</Button>
      </div>
    </div>
  );
};

export default Ranking;
