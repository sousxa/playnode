import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, answerVerdict, realVoters, allReviewReady, type Verdict } from './engine';

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

// estilo por veredito
const VERDICT: Record<Verdict, { cls: string; tag: string; label: string }> = {
  valid: { cls: 'bg-success/15 border-success', tag: 'text-success', label: 'Valeu' },
  tie: { cls: 'bg-warning/15 border-warning', tag: 'text-warning', label: 'Empate ½' },
  annulled: { cls: 'bg-danger/10 border-danger/60', tag: 'text-danger', label: 'Anulada' },
  empty: { cls: 'bg-surface border-line opacity-60', tag: 'text-text-muted', label: 'Vazia' },
};

const Stop: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset, resetRound } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const me = playerId || '';
  const VOTE_MS = (config.stopVoteSeconds ?? 30) * 1000; // tempo de votação por categoria

  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [secs, setSecs] = useState(ROUND_SECONDS);
  const [reveal, setReveal] = useState(false);
  const [display, setDisplay] = useState('🎰');
  const [now, setNow] = useState(() => Date.now());
  const [stopAnim, setStopAnim] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittedRef = useRef(false);
  const reportedRef = useRef(false);
  const prevStopped = useRef<string | null>(null);
  const answersRef = useRef(myAnswers);
  answersRef.current = myAnswers;

  // zera as respostas a cada nova rodada
  useEffect(() => { setMyAnswers({}); submittedRef.current = false; }, [state?.round]);

  const submitted = !!(online && state && state.answers[me]);

  const submitOnline = () => {
    if (!submittedRef.current) {
      submittedRef.current = true;
      dispatch({ type: 'SUBMIT', playerId: me, answers: answersRef.current, endsAt: Date.now() + VOTE_MS });
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

  // ── timer da rodada (jogando) ──
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

  // ── STOP global: se alguém chamou STOP, meu device envia o que tiver ──
  useEffect(() => {
    if (!online || state?.phase !== 'playing') return;
    if (state.stoppedBy && !submittedRef.current && !state.answers[me]) submitOnline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.stoppedBy, state?.phase]);

  // ── animação de STOP (quando alguém aperta) ──
  useEffect(() => {
    if (online && state?.stoppedBy && prevStopped.current !== state.stoppedBy) {
      prevStopped.current = state.stoppedBy;
      const who = state.players.find((p) => p.id === state.stoppedBy)?.name ?? 'Alguém';
      setStopAnim(who);
      const t = setTimeout(() => setStopAnim(null), 2200);
      return () => clearTimeout(t);
    }
    if (!state?.stoppedBy) prevStopped.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.stoppedBy]);

  // ── ticker do relógio (pra contagem regressiva da votação) ──
  useEffect(() => {
    if (state?.phase !== 'review') return;
    const id = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(id);
  }, [state?.phase]);

  // ── HOST: passa de categoria quando o tempo acaba OU quando todos já votaram ──
  useEffect(() => {
    if (!online || !isHost || state?.phase !== 'review') return;
    const timeUp = state.voteEndsAt && now >= state.voteEndsAt;
    if (timeUp || allReviewReady(state)) {
      dispatch({ type: 'REVIEW_NEXT', endsAt: Date.now() + VOTE_MS });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, online, isHost, state?.phase, state?.reviewIdx, state?.voteEndsAt, state?.reviewReady]);

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
      {header && state && <GameHeader title="Stop!" round={state.round} totalRounds={state.totalRounds} onExit={!online || isHost ? onExit : undefined} onRestartRound={online && isHost ? resetRound : undefined} onRestartGame={online && isHost ? reset : undefined} />}
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

  // overlay da animação de STOP (sobre qualquer fase)
  const stopOverlay = (
    <AnimatePresence>
      {stopAnim && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-bg/90 backdrop-blur"
        >
          <motion.div
            initial={{ scale: 0.3, rotate: -15 }}
            animate={{ scale: [0.3, 1.25, 1], rotate: [-15, 6, 0] }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="text-7xl font-display font-extrabold text-danger"
          >
            STOP! 🛑
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 font-display font-bold text-2xl text-text-primary"
          >
            {stopAnim} parou!
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!state) return wrap(<p className="text-center font-sans text-text-secondary">Conectando à partida…</p>, false, 'loading');

  const rouletteTile = (spinningNow: boolean, big = false) => (
    <motion.div
      animate={spinningNow ? { rotate: [0, 6, -6, 0], scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={{ repeat: spinningNow ? Infinity : 0, duration: 0.22 }}
      className={`${big ? 'w-52 h-52 rounded-[3rem]' : 'w-44 h-44 rounded-[2.5rem]'} bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mx-auto`}
      style={{ boxShadow: '0 10px 0 rgb(var(--color-accent-dark))' }}
    >
      <span className="font-display font-extrabold text-8xl text-white">{spinningNow ? display : state.letter || '🎰'}</span>
    </motion.div>
  );

  const fmt = (n: number) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

  // ── GAME OVER (com relatório) ──
  if (state.phase === 'gameOver') {
    const ranked = [...state.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
    return (
      <>
        {stopOverlay}
        {wrap(
          <div className="flex flex-col space-y-5 py-2">
            <div className="text-center space-y-2">
              <div className="text-6xl">🏆</div>
              <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim do Stop!</h2>
            </div>
            <div className="space-y-2">
              {ranked.map((p, i) => (
                <div key={p.id} className={`flex items-center justify-between rounded-2xl px-4 py-3 border-2 ${i === 0 ? 'bg-accent/10 border-accent' : 'bg-surface border-line'}`}>
                  <span className="font-display font-bold text-text-primary">{['🥇', '🥈', '🥉'][i] ?? `${i + 1}º`} {p.name}</span>
                  <span className="font-display font-extrabold text-accent">{state.scores[p.id] ?? 0}</span>
                </div>
              ))}
            </div>

            {/* RELATÓRIO detalhado */}
            <div className="space-y-3">
              <h3 className="font-display font-bold text-text-primary text-center">📋 Relatório</h3>
              {state.roundLog.map((log) => (
                <div key={log.round} className="bg-surface border border-line rounded-3xl p-3 space-y-2">
                  <p className="font-display font-bold text-sm text-text-secondary">Rodada {log.round} · letra <b className="text-accent">{log.letter}</b></p>
                  {state.players.map((p) => (
                    <div key={p.id} className="border-t border-line pt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-display font-bold text-text-primary text-sm">{p.name}</span>
                        <span className="font-display font-bold text-accent text-sm">+{log.totals[p.id] ?? 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {state.categories.map((c) => {
                          const r = log.results[p.id]?.[c];
                          if (!r) return null;
                          const v = VERDICT[r.verdict];
                          return (
                            <span key={c} className={`text-[11px] font-sans px-2 py-0.5 rounded-full border ${v.cls}`}>
                              {c}: {r.answer || '—'} <b className={v.tag}>{r.pts > 0 ? `+${fmt(r.pts)}` : '0'}</b>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              {onRanking && <Button variant="success" onClick={onRanking}>🏆 Ver ranking da sala</Button>}
              {(!online || isHost) && <Button onClick={reset}>🔄 Jogar de novo</Button>}
              <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
            </div>
          </div>,
          true,
          'gameOver',
        )}
      </>
    );
  }

  // ── SCORES (placar + relatório da rodada) ──
  if (state.phase === 'scores') {
    const ranked = [...state.players].sort((a, b) => (state.scores[b.id] ?? 0) - (state.scores[a.id] ?? 0));
    const isLast = state.round >= state.totalRounds;
    const log = state.roundLog[state.roundLog.length - 1];
    return (
      <>
        {stopOverlay}
        {wrap(
          <div className="space-y-5 py-2">
            <div className="text-center">
              <p className="font-sans text-text-secondary text-sm">Rodada {state.round} · letra {state.letter}</p>
              <h2 className="font-display font-extrabold text-2xl text-text-primary">Pontuação 🧮</h2>
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
            {/* relatório da rodada */}
            {log && (
              <div className="bg-surface border border-line rounded-3xl p-3 space-y-2">
                <p className="font-display font-bold text-sm text-text-secondary">O que contou nesta rodada:</p>
                {state.categories.map((c) => (
                  <div key={c} className="border-t border-line pt-1.5">
                    <p className="font-sans text-xs text-text-muted">{c}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {state.players.map((p) => {
                        const r = log.results[p.id]?.[c];
                        if (!r) return null;
                        const v = VERDICT[r.verdict];
                        return (
                          <span key={p.id} className={`text-[11px] font-sans px-2 py-0.5 rounded-full border ${v.cls}`}>
                            {p.name}: {r.answer || '—'} <b className={v.tag}>{r.pts > 0 ? `+${fmt(r.pts)}` : '0'}</b>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(!online || isHost) ? (
              <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Resultado final 🏁' : 'Próxima rodada 👉'}</Button>
            ) : (
              <p className="font-sans text-sm text-text-muted text-center">Aguardando o host continuar…</p>
            )}
          </div>,
          true,
          'scores',
        )}
      </>
    );
  }

  // ── SPIN ──
  if (state.phase === 'spin') {
    const canSpin = !online || isHost;
    return (
      <>
        {stopOverlay}
        {wrap(
          <div className="flex flex-col justify-center items-center text-center space-y-8">
            <p className="font-sans text-text-secondary">{canSpin ? 'Sorteie a letra da rodada' : 'O host vai sortear a letra…'}</p>
            {rouletteTile(false)}
            {canSpin && <Button onClick={() => dispatch({ type: 'SPIN' })}>Sortear letra 🎰</Button>}
          </div>,
          true,
          `spin-${state.round}`,
        )}
      </>
    );
  }

  // ── PLAYING ──
  if (state.phase === 'playing') {
    if (reveal) {
      return (
        <>
          {stopOverlay}
          {wrap(
            <div className="flex flex-col justify-center items-center text-center space-y-6">
              <p className="font-sans text-text-secondary">A letra é…</p>
              {rouletteTile(true, true)}
            </div>,
            true,
            `reveal-${state.round}`,
          )}
        </>
      );
    }

    if (submitted) {
      const count = Object.keys(state.answers).length;
      return (
        <>
          {stopOverlay}
          {wrap(
            <div className="flex flex-col justify-center text-center space-y-4">
              <div className="text-5xl">✅</div>
              <p className="font-display font-bold text-lg text-text-primary">Respostas enviadas!</p>
              {state.stoppedBy && <p className="font-display font-bold text-danger">🛑 STOP foi chamado!</p>}
              <p className="font-sans text-text-muted text-sm">Aguardando os outros… {count}/{state.players.length}</p>
            </div>,
            true,
            'submitted',
          )}
        </>
      );
    }

    const danger = secs <= 10;
    return (
      <>
        {stopOverlay}
        {wrap(
          <div className="space-y-4">
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
            <Button variant="danger" onClick={() => (online ? dispatch({ type: 'CALL_STOP', playerId: me, answers: answersRef.current, endsAt: Date.now() + VOTE_MS }) : dispatch({ type: 'STOP' }))}>
              STOP! 🛑
            </Button>
            {online && <p className="text-center font-sans text-xs text-text-muted">Apertar STOP congela a rodada de todo mundo</p>}
          </div>,
          true,
          `playing-${state.round}`,
        )}
      </>
    );
  }

  // ── REVIEW (votação com timer, online) ──
  if (online) {
    const cat = state.categories[state.reviewIdx];
    const remain = Math.max(0, Math.ceil(((state.voteEndsAt || 0) - now) / 1000));
    const others = state.players.length - 1;
    return (
      <>
        {stopOverlay}
        {wrap(
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-sans text-text-muted text-xs uppercase tracking-wide">
                Categoria {state.reviewIdx + 1}/{state.categories.length} · letra <b className="text-accent">{state.letter}</b>
              </p>
              <h2 className="font-display font-extrabold text-2xl text-text-primary">{cat}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`font-display font-extrabold text-xl ${remain <= 5 ? 'text-danger animate-pulse' : 'text-text-secondary'}`}>⏱️ {remain}s</span>
              </div>
              <p className="font-sans text-text-secondary text-xs mt-1">Tudo começa válido — toque o que NÃO valeu (fica vermelho)</p>
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
                  const empty = raw.length === 0;
                  const verdict = answerVerdict(state, cat, p.id);
                  const invalidCount = Object.keys(state.invalidVotes[cat]?.[p.id] ?? {}).length;
                  const iMarked = !!state.invalidVotes[cat]?.[p.id]?.[me];
                  const mine = p.id === me;
                  // cor do card: minha marcação (verde/vermelho); própria/vazia segue o veredito
                  const cls = empty
                    ? VERDICT.empty.cls
                    : mine
                    ? VERDICT[verdict].cls
                    : iMarked
                    ? 'bg-danger/10 border-danger/60'
                    : 'bg-success/15 border-success';
                  return (
                    <div key={p.id} className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 border-2 transition-colors ${cls}`}>
                      <span className="min-w-0">
                        <span className="block font-sans text-xs text-text-muted">{p.name}{mine && ' (você)'}</span>
                        <span className="block font-display font-bold text-text-primary overflow-wrap-anywhere">{empty ? '— (em branco)' : raw}</span>
                      </span>
                      <span className="shrink-0 flex items-center gap-2">
                        {!empty && others > 0 && invalidCount > 0 && (
                          <span className="font-sans text-xs text-danger">{invalidCount} 👎</span>
                        )}
                        {empty ? (
                          <span className="w-9 h-9 rounded-full flex items-center justify-center bg-surface-2 text-text-muted"><Minus size={18} /></span>
                        ) : mine ? (
                          <span className={`w-9 h-9 rounded-full flex items-center justify-center ${verdict === 'valid' ? 'bg-success text-white' : verdict === 'tie' ? 'bg-warning text-white' : 'bg-danger/80 text-white'}`}>
                            {verdict === 'annulled' ? <X size={18} /> : <Check size={18} />}
                          </span>
                        ) : (
                          <button
                            onClick={() => dispatch({ type: 'TOGGLE_INVALID', category: cat, ownerId: p.id, voterId: me })}
                            aria-label="Marcar que não valeu"
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${iMarked ? 'bg-danger text-white' : 'bg-surface-2 text-text-muted border-2 border-line'}`}
                          >
                            <X size={18} />
                          </button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {(() => {
              const voters = realVoters(state);
              const readyCount = voters.filter((id) => state.reviewReady[id]).length;
              const iAmReady = !!state.reviewReady[me];
              const last = state.reviewIdx >= state.categories.length - 1;
              return (
                <div className="space-y-2">
                  <Button variant={iAmReady ? 'secondary' : 'success'} disabled={iAmReady} onClick={() => dispatch({ type: 'READY', playerId: me })}>
                    {iAmReady ? `Aguardando os outros… ${readyCount}/${voters.length}` : `✅ Pronto, pode passar (${readyCount}/${voters.length})`}
                  </Button>
                  {isHost && (
                    <Button variant="ghost" onClick={() => dispatch({ type: 'REVIEW_NEXT', endsAt: Date.now() + VOTE_MS })}>
                      {last ? 'Forçar pontuação ⏭️' : 'Forçar próxima ⏭️'}
                    </Button>
                  )}
                </div>
              );
            })()}
          </div>,
          true,
          `review-${state.reviewIdx}`,
        )}
      </>
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
