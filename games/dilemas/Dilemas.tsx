import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, tallyVotes, type DilemasState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
}

const Dilemas: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<DilemasState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  const dilemma = state.dilemmas[state.currentIdx];

  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="Dilemas" round={state.currentIdx + 1} totalRounds={state.dilemmas.length} onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (state.phase === 'gameOver') {
    return wrap(
      <div className="flex-1 flex flex-col justify-center text-center space-y-6">
        <div className="text-6xl">🤯</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim dos dilemas!</h2>
        <p className="font-sans text-text-secondary">A galera se revelou 😏</p>
        <div className="space-y-3">
          <Button variant="success" onClick={playAgain}>🔄 Jogar de novo</Button>
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'results') {
    const { a, b } = tallyVotes(state);
    const total = a + b || 1;
    const pa = Math.round((a / total) * 100);
    const pb = Math.round((b / total) * 100);
    const isLast = state.currentIdx + 1 >= state.dilemmas.length;
    return wrap(
      <div className="space-y-6">
        <h2 className="font-display font-extrabold text-xl text-text-primary text-center overflow-wrap-anywhere">{dilemma.scenario}</h2>
        <ResultBar label={`A: ${dilemma.optionA}`} pct={pa} count={a} variant="accent" />
        <ResultBar label={`B: ${dilemma.optionB}`} pct={pb} count={b} variant="warning" />
        <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Finalizar 🏁' : 'Próximo dilema 👉'}</Button>
      </div>
    );
  }

  // voting (sequencial, secreto)
  const voter = state.players[state.voterIdx];
  return wrap(
    <VoteTurn
      key={voter.id}
      voterName={voter.name}
      dilemma={dilemma}
      progress={`${state.voterIdx + 1}/${state.players.length}`}
      onVote={(choice) => dispatch({ type: 'CAST_VOTE', choice })}
    />
  );
};

const ResultBar: React.FC<{ label: string; pct: number; count: number; variant: 'accent' | 'warning' }> = ({ label, pct, count, variant }) => (
  <div className="bg-surface border border-line rounded-3xl p-4">
    <div className="flex justify-between items-center mb-2">
      <span className="font-display font-bold text-text-primary text-sm overflow-wrap-anywhere">{label}</span>
      <span className={`font-display font-bold ${variant === 'accent' ? 'text-accent' : 'text-warning'}`}>{pct}%</span>
    </div>
    <div className="w-full h-3 rounded-full bg-surface-2 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        className={`h-full rounded-full ${variant === 'accent' ? 'bg-accent' : 'bg-warning'}`}
      />
    </div>
    <p className="font-sans text-xs text-text-muted mt-1">{count} voto(s)</p>
  </div>
);

const VoteTurn: React.FC<{
  voterName: string;
  dilemma: { scenario: string; optionA: string; optionB: string };
  progress: string;
  onVote: (c: 'A' | 'B') => void;
}> = ({ voterName, dilemma, progress, onVote }) => {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-danger/15 flex items-center justify-center">
          <Flame className="text-danger" size={28} />
        </div>
        <p className="font-sans text-text-secondary">Voto secreto de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{voterName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · toque para ver o dilema</p>
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <span className="inline-block font-display font-bold text-xs bg-danger/15 text-danger px-3 py-1.5 rounded-full">DILEMA 🔥</span>
        <h2 className="font-display font-extrabold text-2xl text-text-primary overflow-wrap-anywhere leading-tight">{dilemma.scenario}</h2>
      </div>
      <button
        onClick={() => onVote('A')}
        className="w-full p-5 rounded-3xl bg-accent text-white text-left active:scale-[0.98] transition-transform"
        style={{ boxShadow: '0 4px 0 rgb(var(--color-accent-dark))' }}
      >
        <span className="font-sans text-xs text-white/70 block mb-1">Opção A</span>
        <span className="font-display font-bold text-lg">{dilemma.optionA}</span>
      </button>
      <button
        onClick={() => onVote('B')}
        className="w-full p-5 rounded-3xl bg-warning text-white text-left active:scale-[0.98] transition-transform"
        style={{ boxShadow: '0 4px 0 rgb(var(--color-warning-dark))' }}
      >
        <span className="font-sans text-xs text-white/70 block mb-1">Opção B</span>
        <span className="font-display font-bold text-lg">{dilemma.optionB}</span>
      </button>
    </div>
  );
};

export default Dilemas;
