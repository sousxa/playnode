import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, type StopState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
}

const ROUND_SECONDS = 90;

const Stop: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<StopState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));
  const [secs, setSecs] = useState(ROUND_SECONDS);

  // Timer da rodada
  useEffect(() => {
    if (state.phase !== 'playing') return;
    setSecs(ROUND_SECONDS);
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) { clearInterval(id); dispatch({ type: 'STOP' }); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [state.phase, state.round]);

  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="Stop!" round={state.round} totalRounds={state.totalRounds} onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (state.phase === 'gameOver') {
    return wrap(
      <div className="flex-1 flex flex-col justify-center text-center space-y-6">
        <div className="text-6xl">📝</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim do Stop!</h2>
        <p className="font-sans text-text-secondary">Somem os pontos: resposta única = 10, repetida = 5.</p>
        <div className="space-y-3">
          <Button variant="success" onClick={playAgain}>🔄 Jogar de novo</Button>
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>
    );
  }

  if (state.phase === 'roundEnd') {
    return wrap(
      <div className="space-y-5 text-center">
        <h2 className="font-display font-extrabold text-4xl text-danger">STOP! 🛑</h2>
        <p className="font-sans text-text-secondary">Confiram as respostas em grupo e somem os pontos.</p>
        <div className="bg-surface border border-line rounded-3xl p-5">
          <p className="font-sans text-text-secondary text-sm">A letra era</p>
          <p className="font-display font-extrabold text-5xl text-accent">{state.letter}</p>
        </div>
        <Button onClick={() => dispatch({ type: 'NEXT' })}>{state.round >= state.totalRounds ? 'Finalizar 🏁' : 'Próxima letra 👉'}</Button>
      </div>
    );
  }

  // playing
  const danger = secs <= 10;
  return wrap(
    <div className="space-y-5 text-center">
      <div>
        <p className="font-sans text-text-secondary text-sm">Letra</p>
        <motion.p key={state.letter} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display font-extrabold text-7xl text-gradient leading-none">
          {state.letter}
        </motion.p>
      </div>
      <div className={`font-display font-extrabold text-2xl ${danger ? 'text-danger' : 'text-text-secondary'}`}>
        ⏱️ {secs}s
      </div>
      <div className="bg-surface border border-line rounded-3xl p-4 space-y-1.5 text-left">
        {state.categories.map((c, i) => (
          <div key={c} className="flex items-center gap-2 font-display font-bold text-text-primary">
            <span className="w-6 h-6 rounded-lg bg-accent/15 text-accent text-xs flex items-center justify-center shrink-0">{i + 1}</span>
            {c}
          </div>
        ))}
      </div>
      <Button variant="danger" onClick={() => dispatch({ type: 'STOP' })}>STOP! 🛑</Button>
    </div>
  );
};

export default Stop;
