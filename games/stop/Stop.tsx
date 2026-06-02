import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, type StopState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
  online?: boolean;
  roomCode?: string;
  playerId?: string;
  isHost?: boolean;
}

const ROUND_SECONDS = 90;
const DISPLAY_LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

const Stop: React.FC<Props> = ({ config, onExit, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const me = playerId || '';

  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [secs, setSecs] = useState(ROUND_SECONDS);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState('?');
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);

  useEffect(() => { setMyAnswers({}); submittedRef.current = false; }, [state?.round]);

  const submitted = !!(online && state && state.answers[me]);

  // timer da rodada
  useEffect(() => {
    if (state?.phase !== 'playing') return;
    setSecs(ROUND_SECONDS);
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (online) { if (!submittedRef.current) { submittedRef.current = true; dispatch({ type: 'SUBMIT', playerId: me, answers: myAnswers }); } }
          else dispatch({ type: 'STOP' });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.round]);

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

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Stop!" round={state.round} totalRounds={state.totalRounds} onExit={onExit} />}
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (!state) return wrap(<p className="text-center font-sans text-text-secondary">Conectando à partida…</p>, false);

  if (state.phase === 'gameOver') {
    return wrap(
      <div className="flex-1 flex flex-col justify-center text-center space-y-6">
        <div className="text-6xl">📝</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim do Stop!</h2>
        <p className="font-sans text-text-secondary">Resposta única = 10 pts · repetida = 5 · inválida = 0</p>
        <div className="space-y-3">
          {(!online || isHost) && <Button variant="success" onClick={reset}>🔄 Jogar de novo</Button>}
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>,
    );
  }

  // ── roleta ──
  if (state.phase === 'spin') {
    const canSpin = !online || isHost;
    return wrap(
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-8">
        <p className="font-sans text-text-secondary">{canSpin ? 'Sorteie a letra da rodada' : 'O host vai sortear a letra…'}</p>
        <motion.div
          animate={spinning ? { rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] } : {}}
          transition={{ repeat: spinning ? Infinity : 0, duration: 0.25 }}
          className="w-44 h-44 rounded-[2.5rem] bg-gradient-to-br from-accent to-fun-pink flex items-center justify-center"
          style={{ boxShadow: '0 10px 0 rgb(var(--color-accent-dark))' }}
        >
          <span className="font-display font-extrabold text-8xl text-white">{spinning ? display : '🎰'}</span>
        </motion.div>
        {canSpin && <Button onClick={spin} disabled={spinning}>{spinning ? 'Girando…' : 'Sortear letra 🎰'}</Button>}
      </div>,
    );
  }

  // ── jogando ──
  if (state.phase === 'playing') {
    if (submitted) {
      const count = Object.keys(state.answers).length;
      return wrap(
        <div className="flex-1 flex flex-col justify-center text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="font-display font-bold text-lg text-text-primary">Respostas enviadas!</p>
          <p className="font-sans text-text-muted text-sm">Aguardando os outros… {count}/{state.players.length}</p>
        </div>,
      );
    }
    const danger = secs <= 10;
    const submit = () => {
      if (online) { submittedRef.current = true; dispatch({ type: 'SUBMIT', playerId: me, answers: myAnswers }); }
      else dispatch({ type: 'STOP' });
    };
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
                value={myAnswers[c] ?? ''}
                onChange={(e) => setMyAnswers((a) => ({ ...a, [c]: e.target.value }))}
                placeholder={`${c} com ${state.letter}…`}
                className="w-full p-3 rounded-2xl bg-surface border-2 border-line text-text-primary font-sans outline-none focus:border-accent transition-colors"
              />
            </div>
          ))}
        </div>
        <Button variant="danger" onClick={submit}>{online ? 'Enviar respostas 🛑' : 'STOP! 🛑'}</Button>
      </div>,
    );
  }

  // ── review ──
  const isLast = state.round >= state.totalRounds;
  const canAdvance = !online || isHost;
  return wrap(
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="font-display font-extrabold text-2xl text-danger">STOP! 🛑</h2>
        <p className="font-sans text-text-secondary text-sm">Letra <b className="text-accent">{state.letter}</b> · confiram e pontuem juntos</p>
      </div>

      {online ? (
        <div className="space-y-3">
          {state.players.map((p) => (
            <div key={p.id} className="bg-surface border border-line rounded-3xl p-3">
              <p className="font-display font-bold text-text-primary mb-1">{p.name}</p>
              <div className="divide-y divide-line">
                {state.categories.map((c) => (
                  <div key={c} className="flex justify-between py-1 text-sm">
                    <span className="text-text-muted">{c}</span>
                    <span className="text-text-primary overflow-wrap-anywhere text-right">{state.answers[p.id]?.[c]?.trim() || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-3xl divide-y divide-line">
          {state.categories.map((c) => (
            <div key={c} className="flex justify-between items-center p-3">
              <span className="font-sans text-text-muted text-sm">{c}</span>
              <span className="font-display font-bold text-text-primary overflow-wrap-anywhere text-right">{myAnswers[c]?.trim() || '—'}</span>
            </div>
          ))}
        </div>
      )}

      {canAdvance ? (
        <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Finalizar 🏁' : 'Próxima letra 👉'}</Button>
      ) : (
        <p className="text-center font-sans text-sm text-text-muted">Aguardando o host continuar…</p>
      )}
    </div>,
  );
};

export default Stop;
