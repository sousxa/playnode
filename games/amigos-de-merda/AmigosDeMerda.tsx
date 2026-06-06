import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Skull } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import SelectConfirm from '../shared/SelectConfirm';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, tally, type AmigosState } from './engine';

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

const AmigosDeMerda: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });

  useEffect(() => {
    if (state?.phase === 'gameOver') onReportScores?.(state.scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Amigos de Merda" round={state.currentIdx + 1} totalRounds={state.questions.length} onExit={!online || isHost ? onExit : undefined} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state ? `${state.phase}-${state.currentIdx}` : 'loading'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            className="flex-1 flex flex-col justify-center"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );

  if (!state) return wrap(<p className="text-center font-sans text-text-secondary">Conectando à partida…</p>, false);

  const question = state.questions[state.currentIdx];

  if (state.phase === 'gameOver') {
    return wrap(
      <GameOver
        title="O pior do grupo 😈"
        players={state.players}
        scores={state.scores}
        onPlayAgain={reset}
        onExit={onExit}
        onRanking={onRanking}
        canControl={!online || isHost}
      />,
    );
  }

  if (state.phase === 'results') {
    const t = tally(state);
    const max = Math.max(0, ...Object.values(t));
    const isLast = state.currentIdx + 1 >= state.questions.length;
    const ranked = [...state.players].sort((a, b) => (t[b.id] ?? 0) - (t[a.id] ?? 0));
    const canAdvance = !online || isHost;
    return wrap(
      <div className="space-y-5">
        <h2 className="font-display font-extrabold text-xl text-text-primary text-center overflow-wrap-anywhere">{question.text}</h2>
        <div className="space-y-2">
          {ranked.map((p) => {
            const v = t[p.id] ?? 0;
            const top = v > 0 && v === max;
            return (
              <div key={p.id} className={`p-3 rounded-2xl border ${top ? 'bg-danger/15 border-danger/40' : 'bg-surface border-line'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-display font-bold text-text-primary">{top && '👑 '}{p.name}</span>
                  <span className="font-sans text-sm text-text-muted">{v} voto(s)</span>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${max ? (v / max) * 100 : 0}%` }} className={`h-full rounded-full ${top ? 'bg-danger' : 'bg-accent'}`} />
                </div>
              </div>
            );
          })}
        </div>
        {canAdvance ? (
          <Button onClick={() => dispatch({ type: 'NEXT' })}>{isLast ? 'Ver o ranking 🏆' : 'Próxima 👉'}</Button>
        ) : (
          <p className="text-center font-sans text-sm text-text-muted">Aguardando o host continuar…</p>
        )}
      </div>,
    );
  }

  // voting
  if (online) {
    const myVoted = state.votes[playerId || ''] !== undefined;
    const count = Object.keys(state.votes).length;
    if (myVoted) {
      return wrap(
        <div className="flex-1 flex flex-col justify-center text-center space-y-4">
          <div className="text-5xl">🤐</div>
          <p className="font-display font-bold text-lg text-text-primary">Voto registrado!</p>
          <p className="font-sans text-text-muted text-sm">Aguardando os outros… {count}/{state.players.length}</p>
        </div>,
      );
    }
    return wrap(
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1 font-display font-bold text-xs bg-danger/15 text-danger px-3 py-1.5 rounded-full"><Skull size={12} /> QUEM É?</span>
          <h2 className="font-display font-extrabold text-xl text-text-primary overflow-wrap-anywhere leading-tight">{question.text}</h2>
          <p className="font-sans text-xs text-text-muted">{count}/{state.players.length} votaram</p>
        </div>
        <SelectConfirm
          variant="danger"
          options={state.players.map((t) => ({ id: t.id, label: t.name }))}
          confirmLabel="Confirmar voto 🗳️"
          onConfirm={(targetId) => dispatch({ type: 'CAST_VOTE', targetId, voterId: playerId })}
        />
      </div>,
    );
  }

  const voter = state.players[state.voterIdx];
  return wrap(
    <VoteTurn
      key={voter.id}
      voterName={voter.name}
      question={question.text}
      targets={state.players}
      progress={`${state.voterIdx + 1}/${state.players.length}`}
      online={false}
      onVote={(targetId) => dispatch({ type: 'CAST_VOTE', targetId })}
    />,
  );
};

const VoteTurn: React.FC<{
  voterName: string;
  question: string;
  targets: { id: string; name: string }[];
  progress: string;
  online: boolean;
  onVote: (id: string) => void;
}> = ({ voterName, question, targets, progress, online, onVote }) => {
  const [revealed, setRevealed] = useState(online);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-danger/15 flex items-center justify-center"><EyeOff className="text-danger" size={28} /></div>
        <p className="font-sans text-text-secondary">Voto secreto de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{voterName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · toque para ver a pergunta</p>
      </button>
    );
  }
  return (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1 font-display font-bold text-xs bg-danger/15 text-danger px-3 py-1.5 rounded-full"><Skull size={12} /> QUEM É?</span>
        <h2 className="font-display font-extrabold text-xl text-text-primary overflow-wrap-anywhere leading-tight">{question}</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {targets.map((t) => (
          <button key={t.id} onClick={() => onVote(t.id)} className="font-display font-bold p-4 rounded-2xl bg-surface border border-line text-text-primary active:scale-95 hover:border-danger transition-all">
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AmigosDeMerda;
