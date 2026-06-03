import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, type TODState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
  online?: boolean;
  roomCode?: string;
  playerId?: string;
  isHost?: boolean;
}

const VerdadeOuDesafio: React.FC<Props> = ({ config, onExit, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Verdade ou Desafio" round={state.turnsPlayed + 1} totalRounds={state.totalTurns} onExit={onExit} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state ? `${state.phase}-${state.turnIdx}-${state.turnsPlayed}` : 'loading'}
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

  if (state.phase === 'gameOver') {
    return wrap(
      <div className="flex-1 flex flex-col justify-center text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Fim do jogo!</h2>
        <p className="font-sans text-text-secondary">Espero que ninguém tenha brigado 😅</p>
        <div className="space-y-3">
          {(!online || isHost) && <Button variant="success" onClick={reset}>🔄 Jogar de novo</Button>}
          <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
        </div>
      </div>,
    );
  }

  const player = state.players[state.turnIdx];
  const myTurn = !online || player.id === playerId;

  if (state.phase === 'card' && state.current) {
    const isTruth = state.current.kind === 'truth';
    return wrap(
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
        <span className={`inline-block font-display font-bold text-sm px-4 py-1.5 rounded-full ${isTruth ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}>
          {isTruth ? '💬 Verdade' : '🔥 Desafio'} · {player.name}
        </span>
        <div className="bg-surface border-2 border-line rounded-4xl p-8 min-h-[200px] flex items-center justify-center">
          <p className="font-display font-bold text-2xl text-text-primary overflow-wrap-anywhere leading-snug">{state.current.text}</p>
        </div>
        {myTurn ? (
          <Button onClick={() => dispatch({ type: 'NEXT' })}>Feito! Próximo 👉</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">{player.name} está cumprindo…</p>
        )}
      </motion.div>,
    );
  }

  // choose
  return wrap(
    <div className="space-y-6 text-center">
      <div>
        <p className="font-sans text-text-secondary">Vez de</p>
        <h2 className="font-display font-extrabold text-3xl text-accent">{player.name}</h2>
      </div>
      {myTurn ? (
        <>
          <p className="font-display font-bold text-xl text-text-primary">Verdade ou Desafio?</p>
          <div className="space-y-3">
            <Button onClick={() => dispatch({ type: 'CHOOSE', kind: 'truth' })}>💬 Verdade</Button>
            <Button variant="danger" onClick={() => dispatch({ type: 'CHOOSE', kind: 'dare' })}>🔥 Desafio</Button>
          </div>
        </>
      ) : (
        <p className="font-sans text-text-muted">{player.name} está escolhendo verdade ou desafio…</p>
      )}
    </div>,
  );
};

export default VerdadeOuDesafio;
