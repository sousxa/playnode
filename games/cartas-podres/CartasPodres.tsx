import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Crown, Eye } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, type CartasState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
  onReportScores?: (scores: Record<string, number>) => void;
  onRanking?: () => void;
}

const BlackCard: React.FC<{ text: string }> = ({ text }) => (
  <div className="bg-text-primary text-bg rounded-3xl p-6 shadow-soft">
    <p className="font-display font-bold text-xl leading-snug overflow-wrap-anywhere">{text}</p>
  </div>
);

const CartasPodres: React.FC<Props> = ({ config, onExit, onReportScores, onRanking }) => {
  const [state, setState] = useState<CartasState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  useEffect(() => {
    if (state.phase === 'roundResult') confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  }, [state.phase]);

  useEffect(() => {
    if (state.phase === 'gameOver') onReportScores?.(state.scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  const judge = state.players[state.judgeIdx];
  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="Cartas Podres" round={state.round} totalRounds={state.totalRounds} onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (state.phase === 'gameOver') {
    return wrap(<GameOver title="Fim de jogo!" players={state.players} scores={state.scores} onPlayAgain={playAgain} onExit={onExit} onRanking={onRanking} />);
  }

  if (state.phase === 'judgeReveal') {
    return wrap(
      <div className="space-y-5 text-center">
        <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm bg-warning/15 text-warning px-3 py-1.5 rounded-full">
          <Crown size={14} /> Juiz: {judge.name}
        </span>
        <BlackCard text={state.black} />
        <p className="font-sans text-text-secondary text-sm">Os outros jogadores vão escolher a carta mais engraçada. Passem o aparelho!</p>
        <Button onClick={() => dispatch({ type: 'BEGIN' })}>Começar a rodada 👉</Button>
      </div>
    );
  }

  if (state.phase === 'submit') {
    const pid = state.submitOrder[state.submitIdx];
    const player = state.players.find((p) => p.id === pid)!;
    return wrap(
      <SubmitTurn
        key={pid}
        playerName={player.name}
        black={state.black}
        hand={state.hands[pid]}
        progress={`${state.submitIdx + 1}/${state.submitOrder.length}`}
        onSubmit={(card) => dispatch({ type: 'SUBMIT', card })}
      />
    );
  }

  if (state.phase === 'judge') {
    return wrap(
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm bg-warning/15 text-warning px-3 py-1.5 rounded-full">
          <Crown size={14} /> {judge.name}, escolha a melhor!
        </span>
        <BlackCard text={state.black} />
        <div className="space-y-2">
          {state.submissions.map((s, i) => (
            <button
              key={i}
              onClick={() => dispatch({ type: 'JUDGE_PICK', index: i })}
              className="w-full text-left p-4 rounded-2xl bg-surface border border-line text-text-primary font-display font-bold active:scale-[0.98] hover:border-warning transition-all overflow-wrap-anywhere"
            >
              {s.card}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // roundResult
  const winner = state.players.find((p) => p.id === state.winnerId);
  const isLast = state.round >= state.totalRounds;
  return wrap(
    <div className="space-y-5 text-center">
      <h2 className="font-display font-extrabold text-2xl text-success">🏆 {winner?.name} venceu a rodada!</h2>
      <BlackCard text={state.black} />
      <div className="bg-surface border-2 border-success/40 rounded-3xl p-5">
        <p className="font-display font-bold text-lg text-text-primary overflow-wrap-anywhere">{state.winnerCard}</p>
      </div>
      <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>{isLast ? 'Ver resultado 🏆' : 'Próxima rodada 👉'}</Button>
    </div>
  );
};

const SubmitTurn: React.FC<{
  playerName: string;
  black: string;
  hand: string[];
  progress: string;
  onSubmit: (card: string) => void;
}> = ({ playerName, black, hand, progress, onSubmit }) => {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center"><Eye className="text-accent" size={28} /></div>
        <p className="font-sans text-text-secondary">Mão de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{playerName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · toque para ver suas cartas</p>
      </button>
    );
  }
  return (
    <div className="space-y-4">
      <BlackCard text={black} />
      <p className="font-sans text-text-secondary text-sm text-center">{playerName}, escolha sua carta:</p>
      <div className="space-y-2">
        {hand.map((c) => (
          <button
            key={c}
            onClick={() => onSubmit(c)}
            className="w-full text-left p-4 rounded-2xl bg-surface border border-line text-text-primary font-display font-bold active:scale-[0.98] hover:border-accent transition-all overflow-wrap-anywhere"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CartasPodres;
