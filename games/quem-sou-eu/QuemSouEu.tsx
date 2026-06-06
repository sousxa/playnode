import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, whoAmIEngine } from './engine';

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

const QuemSouEu: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state: raw, dispatch, reset, resetRound } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });

  useEffect(() => {
    if (raw?.phase === 'gameOver') onReportScores?.(raw.scores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.phase]);

  const isRoda = raw?.mode === 'roda';
  const solvedCount = raw?.solved?.length ?? 0;

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && raw && <GameHeader title="Quem Sou Eu?" round={isRoda ? solvedCount : undefined} totalRounds={isRoda ? raw.players.length : undefined} onExit={!online || isHost ? onExit : undefined} onRestartRound={online && isHost ? resetRound : undefined} onRestartGame={online && isHost ? reset : undefined} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={raw ? `${raw.phase}-${raw.turnIdx}-${solvedCount}` : 'loading'}
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

  if (!raw) return wrap(<p className="text-center font-sans text-text-secondary">Conectando à partida…</p>, false);

  if (raw.phase === 'gameOver') {
    return wrap(<GameOver title="Acabou!" players={raw.players} scores={raw.scores} onPlayAgain={reset} onExit={onExit} onRanking={onRanking} canControl={!online || isHost} />);
  }

  const current = raw.players[raw.turnIdx];
  const passLabel = isRoda ? 'Passar a vez' : 'Passar';
  const rodaTag = isRoda ? (
    <p className="font-sans text-xs text-text-muted">
      {solvedCount}/{raw.players.length} já acertaram · você fica no mesmo personagem até acertar
    </p>
  ) : null;

  // ── ONLINE: cada celular vê só a sua parte ──
  if (online) {
    const view = whoAmIEngine.getPlayerView(raw, playerId || '');
    const myTurn = current.id === playerId;
    const iSolved = isRoda && (raw.solved ?? []).includes(playerId || '');
    if (myTurn) {
      // Eu estou adivinhando → NÃO vejo meu personagem.
      return wrap(
        <div className="space-y-6 text-center">
          <div className="text-5xl">🤔</div>
          <h2 className="font-display font-extrabold text-2xl text-text-primary">Sua vez de adivinhar!</h2>
          <p className="font-sans text-text-secondary">Faça perguntas de "sim ou não" pra galera e tente descobrir quem você é.</p>
          {rodaTag}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="success" onClick={() => dispatch({ type: 'RESOLVE', correct: true })}>Acertei! ✓</Button>
            <Button variant="secondary" onClick={() => dispatch({ type: 'RESOLVE', correct: false })}>{passLabel}</Button>
          </div>
        </div>,
      );
    }
    // Outros veem o personagem do jogador da vez (pra dar dicas).
    return wrap(
      <div className="space-y-5 text-center">
        <p className="font-sans text-text-secondary">{current.name} está adivinhando…</p>
        <div className="bg-surface border-2 border-line rounded-4xl p-8">
          <p className="font-sans text-text-secondary text-sm mb-2">{current.name} é:</p>
          <p className="font-display font-extrabold text-3xl text-accent overflow-wrap-anywhere">🎭 {view.assignments[current.id]}</p>
        </div>
        <p className="font-sans text-text-muted text-sm">Dê dicas! Só {current.name} controla o "acertou".</p>
        {iSolved && <p className="font-sans text-sm text-success font-bold">Você já acertou o seu! 🎉 Agora só ajuda a galera.</p>}
        {!iSolved && rodaTag}
      </div>,
    );
  }

  // ── LOCAL (mesmo aparelho): passa e joga com cover ──
  return wrap(
    <TurnCard
      key={`${current.id}-${solvedCount}`}
      name={current.name}
      character={raw.assignments[current.id]}
      progress={isRoda ? `${solvedCount}/${raw.players.length} acertaram` : `${raw.turnIdx + 1}/${raw.players.length}`}
      passLabel={passLabel}
      onResolve={(correct) => dispatch({ type: 'RESOLVE', correct })}
    />,
  );
};

const TurnCard: React.FC<{
  name: string;
  character: string;
  progress: string;
  passLabel: string;
  onResolve: (correct: boolean) => void;
}> = ({ name, character, progress, passLabel, onResolve }) => {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-warning/15 flex items-center justify-center"><EyeOff className="text-warning" size={28} /></div>
        <p className="font-sans text-text-secondary">Vez de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{name}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · {name}, NÃO olhe! Vire o aparelho pra galera e toque.</p>
      </button>
    );
  }
  return (
    <div className="space-y-6 text-center">
      <div className="bg-surface border-2 border-line rounded-4xl p-8">
        <p className="font-sans text-text-secondary text-sm mb-2">A galera dá dicas. {name} adivinha:</p>
        <p className="font-display font-extrabold text-3xl text-accent overflow-wrap-anywhere">🎭 {character}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="success" onClick={() => onResolve(true)}>Acertou! ✓</Button>
        <Button variant="secondary" onClick={() => { setRevealed(false); onResolve(false); }}>{passLabel}</Button>
      </div>
    </div>
  );
};

export default QuemSouEu;
