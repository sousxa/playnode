import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
  onReportScores?: (scores: Record<string, number>) => void;
  onRanking?: () => void;
  online?: boolean;
  roomCode?: string;
  playerId?: string;
  isHost?: boolean;
}

const ROUND_SECONDS = 90;
const DISPLAY_LETTERS = 'ABCDEFGHIJLMNOPRSTUV'.split('');

const Stop: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const me = playerId || '';

  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [secs, setSecs] = useState(ROUND_SECONDS);
  const [reveal, setReveal] = useState(false);
  const [display, setDisplay] = useState('🎰');
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const reportedRef = useRef(false);
  const answersRef = useRef(myAnswers);
  answersRef.current = myAnswers;

  // zera as respostas a cada nova rodada
  useEffect(() => { setMyAnswers({}); submittedRef.current = false; }, [state?.round]);

  const submitted = !!(online && state && state.answers[me]);

  const submitOnline = () => {
    if (!submittedRef.current) {
      submittedRef.current = true;
      dispatch({ type: 'SUBMIT', playerId: me, answers: answersRef.current });
    }
  };

  // ── ROLETA para TODOS: ao entrar em 'playing' com letra nova, anima e revela ──
  useEffect(() => {
    if (state?.phase !== 'playing' || !state.letter) { setReveal(false); return; }
    setReveal(true);
    revealTimer.current = setInterval(() => {
      setDisplay(DISPLAY_LETTERS[Math.floor(Math.random() * DISPLAY_LETTERS.length)]);
    }, 75);
    const t = setTimeout(() => {
      if (revealTimer.current) clearInterval(revealTimer.current);
      setDisplay(state.letter);
      setReveal(false);
    }, 1600);
    return () => { if (revealTimer.current) clearInterval(revealTimer.current); clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.letter, state?.round]);

  // ── timer da rodada (começa depois da roleta revelar) ──
  useEffect(() => {
    if (state?.phase !== 'playing' || reveal) return;
    setSecs(ROUND_SECONDS);
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(id);
          if (online) submitOnline();
          else dispatch({ type: 'STOP' });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.round, reveal]);

  // ── STOP global: se alguém chamou STOP, meu device envia o que tiver na hora ──
  useEffect(() => {
    if (!online || state?.phase !== 'playing') return;
    if (state.stoppedBy && !submittedRef.current && !state.answers[me]) {
      submitOnline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.stoppedBy, state?.phase]);

  // ── reporta o placar pro ranking da sala, uma vez, no fim ──
  useEffect(() => {
    if (online && state?.phase === 'gameOver' && !reportedRef.current) {
      reportedRef.current = true;
      onReportScores?.(state.scores);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  const wrap = (children: React.ReactNode, header = true, phaseKey = '') => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Stop!" round={state.round} totalRounds={state.totalRounds} onExit={onExit} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseKey}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  if (!state) return wrap(<p className="text-center font-sans text-text-secondary">Conectando à partida…</p>, false, 'loading');

  // ── tile da roleta (reaproveitado no spin e no reveal) ──
  const rouletteTile = (spinningNow: boolean, big = false) => (
    <motion.div
      animate={spinningNow ? { rotate: [0, 6, -6, 0], scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ repeat: spinningNow ? Infinity : 0, duration: 0.22 }}
      className={`${big ? 'w-52 h-52 rounded-[3rem]' : 'w-44 h-44 rounded-[2.5rem]'} bg-gradient-to-br from-accent to-fun-pink flex items-center justify-center mx-auto`}
      style={{ boxShadow: '0 10px 0 rgb(var(--color-accent-dark))' }}
    >
      <span className="font-display font-extrabold text-8xl text-white">{spinningNow ? display : state.letter || '🎰'}</span>
    </motion.div>
  );

  // ── GAME OVER ──
  if (state.phase === 'gameOver') {
    const ranked = [...state.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
    return wrap(
      <div className="flex flex-col justify-center text-center space-y-5">
        <div className="text-6xl">🏆</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim do Stop!</h2>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border-2 ${i === 0 ? 'bg-accent/10 border-accent' : 'bg-surface border-line'}`}>
              <span className="font-display font-bold text-text-primary">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`} {p.name}</span>
              <span className="font-display font-extrabold text-accent">{state.scores[p.id] ?? 0}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3 pt-2">
          {onRanking && <Button variant="success" onClick={onRanking}>🏆 Ver ranking da sala</Button>}
          {(!online || isHost) && <Button onClick={reset}>🔄 Jogar de novo</Button>}
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>,
      true,
      'gameOver',
    );
  }

  // ── SCORES (placar da rodada, online) ──
  if (state.phase === 'scores') {
    const ranked = [...state.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
    const isLast = state.round >= state.totalRounds;
    return wrap(
      <div className="space-y-5 text-center">
        <div>
          <p className="font-sans text-text-secondary text-sm">Rodada {state.round} · letra {state.letter}</p>
          <h2 className="font-display font-extrabold text-2xl text-text-primary">Pontuação 🧮</h2>
          <p className="font-sans text-text-muted text-xs mt-1">Única: +15 · repetida: +5 · inválida: 0</p>
        </div>
        <div className="space-y-2">
          {ranked.map((p, i) => (
            <div key={p.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border-2 ${i === 0 ? 'bg-accent/10 border-accent' : 'bg-surface border-line'}`}>
              <span className="font-display font-bold text-text-primary">{i + 1}º {p.name}</span>
              <span className="flex items-baseline gap-2">
                {(state.roundScores[p.id] ?? 0) > 0 && <span className="font-sans text-success text-sm">+{state.roundScores[p.id]}</span>}
                <span className="font-display font-extrabold text-accent text-lg">{state.scores[p.id] ?? 0}</span>
              </span>
            </div>
          ))}
        </div>
        {(!online || isHost) ? (
          <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Resultado final 🏁' : 'Próxima rodada 👉'}</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">Aguardando o host continuar…</p>
        )}
      </div>,
      true,
      'scores',
    );
  }

  // ── SPIN (roleta) ──
  if (state.phase === 'spin') {
    const canSpin = !online || isHost;
    return wrap(
      <div className="flex flex-col justify-center items-center text-center space-y-8">
        <p className="font-sans text-text-secondary">{canSpin ? 'Sorteie a letra da rodada' : 'O host vai sortear a letra…'}</p>
        {rouletteTile(false)}
        {canSpin && <Button onClick={() => dispatch({ type: 'SPIN' })}>Sortear letra 🎰</Button>}
      </div>,
      true,
      `spin-${state.round}`,
    );
  }

  // ── PLAYING ──
  if (state.phase === 'playing') {
    // roleta revelando a letra (em TODOS os aparelhos)
    if (reveal) {
      return wrap(
        <div className="flex flex-col justify-center items-center text-center space-y-6">
          <p className="font-sans text-text-secondary">A letra é…</p>
          {rouletteTile(true, true)}
        </div>,
        true,
        `reveal-${state.round}`,
      );
    }

    if (submitted) {
      const count = Object.keys(state.answers).length;
      return wrap(
        <div className="flex flex-col justify-center text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="font-display font-bold text-lg text-text-primary">Respostas enviadas!</p>
          {state.stoppedBy && <p className="font-display font-bold text-danger">🛑 STOP foi chamado!</p>}
          <p className="font-sans text-text-muted text-sm">Aguardando os outros… {count}/{state.players.length}</p>
        </div>,
        true,
        'submitted',
      );
    }

    const danger = secs <= 10;
    return wrap(
      <div className="space-y-4">
        {/* LETRA GRANDE no topo */}
        <div className="sticky top-0 z-10 -mx-1 bg-bg/85 backdrop-blur rounded-b-3xl pb-2">
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <span className="font-sans text-text-muted text-xs uppercase tracking-wide">Letra</span>
              <motion.span
                initial={{ scale: 0.4, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14 }}
                className="font-display font-extrabold text-6xl leading-none text-gradient drop-shadow"
              >
                {state.letter}
              </motion.span>
            </div>
            <span className={`font-display font-extrabold text-2xl ${danger ? 'text-danger animate-pulse' : 'text-text-secondary'}`}>⏱️ {secs}s</span>
          </div>
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
        <Button variant="danger" onClick={() => (online ? dispatch({ type: 'CALL_STOP', playerId: me, answers: answersRef.current }) : dispatch({ type: 'STOP' }))}>
          STOP! 🛑
        </Button>
        {online && <p className="text-center font-sans text-xs text-text-muted">Apertar STOP congela a rodada de todo mundo</p>}
      </div>,
      true,
      `playing-${state.round}`,
    );
  }

  // ── REVIEW (votação de validade, online) ──
  if (online) {
    const cat = state.categories[state.reviewIdx];
    const isLastCat = state.reviewIdx >= state.categories.length - 1;
    const canAdvance = !online || isHost;
    return wrap(
      <div className="space-y-4">
        <div className="text-center">
          <p className="font-sans text-text-muted text-xs uppercase tracking-wide">
            Categoria {state.reviewIdx + 1}/{state.categories.length} · letra <b className="text-accent">{state.letter}</b>
          </p>
          <h2 className="font-display font-extrabold text-2xl text-text-primary">{cat}</h2>
          <p className="font-sans text-text-secondary text-xs mt-1">Toque pra validar (verde = vale, vermelho = não vale)</p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={cat}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-2"
          >
            {state.players.map((p) => {
              const raw = (state.answers[p.id]?.[cat] ?? '').trim();
              const ok = !!state.valid[cat]?.[p.id];
              const empty = raw.length === 0;
              return (
                <button
                  key={p.id}
                  disabled={empty}
                  onClick={() => dispatch({ type: 'TOGGLE_VALID', category: cat, ownerId: p.id })}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 border-2 transition-colors text-left ${
                    empty
                      ? 'bg-surface border-line opacity-60'
                      : ok
                      ? 'bg-success/15 border-success'
                      : 'bg-danger/10 border-danger/60'
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block font-sans text-xs text-text-muted">{p.name}</span>
                    <span className="block font-display font-bold text-text-primary overflow-wrap-anywhere">{empty ? '— (em branco)' : raw}</span>
                  </span>
                  {!empty && (
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${ok ? 'bg-success text-white' : 'bg-danger/80 text-white'}`}>
                      {ok ? <Check size={18} /> : <X size={18} />}
                    </span>
                  )}
                </button>
              );
            })}
          </motion.div>
        </AnimatePresence>

        {canAdvance ? (
          <Button onClick={() => dispatch({ type: 'REVIEW_NEXT' })}>{isLastCat ? 'Ver pontuação 🧮' : 'Próxima categoria 👉'}</Button>
        ) : (
          <p className="text-center font-sans text-sm text-text-muted">Aguardando o host conduzir a votação…</p>
        )}
      </div>,
      true,
      `review-${state.reviewIdx}`,
    );
  }

  // ── REVIEW simples (mesmo aparelho) ──
  const isLast = state.round >= state.totalRounds;
  return wrap(
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="font-display font-extrabold text-2xl text-danger">STOP! 🛑</h2>
        <p className="font-sans text-text-secondary text-sm">Letra <b className="text-accent">{state.letter}</b> · confiram juntos</p>
      </div>
      <div className="bg-surface border border-line rounded-3xl divide-y divide-line">
        {state.categories.map((c) => (
          <div key={c} className="flex justify-between items-center p-3">
            <span className="font-sans text-text-muted text-sm">{c}</span>
            <span className="font-display font-bold text-text-primary overflow-wrap-anywhere text-right">{myAnswers[c]?.trim() || '—'}</span>
          </div>
        ))}
      </div>
      <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Finalizar 🏁' : 'Próxima letra 👉'}</Button>
    </div>,
    true,
    'review-local',
  );
};

export default Stop;
