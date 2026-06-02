import React, { useState, useEffect, useRef } from 'react';
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
const DISPLAY_LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

const Stop: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<StopState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secs, setSecs] = useState(ROUND_SECONDS);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('?');
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // limpa respostas a cada nova rodada
  useEffect(() => { setAnswers({}); }, [state.round]);

  // timer da rodada
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

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    spinTimer.current = setInterval(() => setDisplay(DISPLAY_LETTERS[Math.floor(Math.random() * DISPLAY_LETTERS.length)]), 70);
    setTimeout(() => {
      if (spinTimer.current) clearInterval(spinTimer.current);
      setSpinning(false);
      dispatch({ type: 'SPIN' });
    }, 1700);
  };

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
        <p className="font-sans text-text-secondary">Resposta única = 10 pts · repetida = 5 · inválida = 0</p>
        <div className="space-y-3">
          <Button variant="success" onClick={playAgain}>🔄 Jogar de novo</Button>
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>,
    );
  }

  // ── roleta ──
  if (state.phase === 'spin') {
    return wrap(
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
        <p className="font-sans text-text-secondary">Sorteie a letra da rodada</p>
        <motion.div
          animate={spinning ? { rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: spinning ? Infinity : 0, duration: 0.25 }}
          className="w-44 h-44 rounded-[2.5rem] bg-gradient-to-br from-accent to-fun-pink flex items-center justify-center shadow-soft"
          style={{ boxShadow: '0 10px 0 rgb(var(--color-accent-dark))' }}
        >
          <span className="font-display font-extrabold text-8xl text-white">{spinning ? display : '🎰'}</span>
        </motion.div>
        <Button onClick={spin} disabled={spinning}>{spinning ? 'Girando…' : 'Sortear letra 🎰'}</Button>
      </div>,
    );
  }

  // ── jogando: preencher os campos ──
  if (state.phase === 'playing') {
    const danger = secs <= 10;
    return wrap(
      <div className="space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-bg/80 backdrop-blur py-2 z-10">
          <div className="flex items-center gap-2">
            <span className="font-sans text-text-muted text-sm">Letra</span>
            <span className="font-display font-extrabold text-4xl text-gradient leading-none">{state.letter}</span>
          </div>
          <span className={`font-display font-extrabold text-xl ${danger ? 'text-danger' : 'text-text-secondary'}`}>⏱️ {secs}s</span>
        </div>

        <div className="space-y-2">
          {state.categories.map((c) => (
            <div key={c}>
              <label className="font-sans text-xs text-text-muted ml-1">{c}</label>
              <input
                type="text"
                value={answers[c] ?? ''}
                onChange={(e) => setAnswers((a) => ({ ...a, [c]: e.target.value }))}
                placeholder={`${c} com ${state.letter}…`}
                className="w-full p-3 rounded-2xl bg-surface border-2 border-line text-text-primary font-sans outline-none focus:border-accent transition-colors"
              />
            </div>
          ))}
        </div>

        <Button variant="danger" onClick={() => dispatch({ type: 'STOP' })}>STOP! 🛑</Button>
      </div>,
    );
  }

  // ── review ──
  const isLast = state.round >= state.totalRounds;
  return wrap(
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="font-display font-extrabold text-2xl text-danger">STOP! 🛑</h2>
        <p className="font-sans text-text-secondary text-sm">Letra <b className="text-accent">{state.letter}</b> · confiram e pontuem juntos</p>
      </div>
      <div className="bg-surface border border-line rounded-3xl divide-y divide-line">
        {state.categories.map((c) => (
          <div key={c} className="flex justify-between items-center p-3">
            <span className="font-sans text-text-muted text-sm">{c}</span>
            <span className="font-display font-bold text-text-primary overflow-wrap-anywhere text-right">{answers[c]?.trim() || '—'}</span>
          </div>
        ))}
      </div>
      <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Finalizar 🏁' : 'Próxima letra 👉'}</Button>
    </div>,
  );
};

export default Stop;
