import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Crown, Eye } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import SelectConfirm from '../shared/SelectConfirm';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { markSeen } from '../../services/contentMemory';
import { initGame, reducer, cartasEngine } from './engine';

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

/** Preenche as lacunas (____) da carta preta com as cartas escolhidas (em destaque). */
function fillSentence(text: string, cards: string[]): React.ReactNode {
  const parts = text.split(/_{2,}/);
  const nodes: React.ReactNode[] = [];
  let ci = 0;
  parts.forEach((part, idx) => {
    if (part) nodes.push(<span key={`p${idx}`}>{part}</span>);
    if (idx < parts.length - 1) nodes.push(<b key={`c${idx}`} className="text-accent">{cards[ci++] ?? '____'}</b>);
  });
  while (ci < cards.length) nodes.push(<b key={`x${ci}`} className="text-accent"> {cards[ci++]}</b>);
  return nodes;
}

const BlackCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="bg-text-primary text-bg rounded-3xl p-6 shadow-soft">
    <p className="font-display font-bold text-xl leading-snug overflow-wrap-anywhere">{children}</p>
  </div>
);

const Wait: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex-1 flex flex-col justify-center text-center space-y-4">
    <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
      <div className="w-3 h-3 bg-accent rounded-full animate-ping" />
    </div>
    <p className="font-sans text-text-secondary">{text}</p>
  </div>
);

/** Escolhe `pick` cartas (na ordem), mostra a frase montando ao vivo e envia. */
const HandPicker: React.FC<{ black: string; pick: number; hand: string[]; onSubmit: (cards: string[]) => void }> = ({ black, pick, hand, onSubmit }) => {
  const [sel, setSel] = useState<string[]>([]);
  const toggle = (c: string) => setSel((s) => (s.includes(c) ? s.filter((x) => x !== c) : s.length < pick ? [...s, c] : s));
  return (
    <div className="space-y-4">
      <BlackCard>{fillSentence(black, sel)}</BlackCard>
      <p className="font-sans text-text-secondary text-sm text-center">
        {pick > 1 ? `Escolha ${pick} cartas (na ordem)` : 'Escolha sua carta'} · {sel.length}/{pick}
      </p>
      <div className="space-y-2">
        {hand.map((c) => {
          const i = sel.indexOf(c);
          const active = i >= 0;
          return (
            <motion.button
              key={c}
              onClick={() => toggle(c)}
              whileTap={{ scale: 0.97 }}
              className={`w-full text-left p-4 rounded-2xl border-2 font-display font-bold overflow-wrap-anywhere transition-colors ${active ? 'bg-accent text-white border-accent' : 'bg-surface text-text-primary border-line'}`}
            >
              {pick > 1 && active && <span className="mr-2 opacity-80">{i + 1}.</span>}{c}
            </motion.button>
          );
        })}
      </div>
      <Button disabled={sel.length !== pick} onClick={() => onSubmit(sel)}>{pick > 1 ? 'Enviar cartas 📤' : 'Enviar carta 📤'}</Button>
    </div>
  );
};

const CartasPodres: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const me = playerId || '';

  useEffect(() => {
    if (state?.phase === 'roundResult') confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
  }, [state?.phase]);

  useEffect(() => {
    if (state?.phase === 'gameOver') { onReportScores?.(state.scores); markSeen('cartas', state.usedBlack); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Cartas Podres" round={state.round} totalRounds={state.totalRounds} onExit={!online || isHost ? onExit : undefined} onForceRestart={online && isHost ? reset : undefined} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state ? `${state.phase}-${state.round}-${state.submitIdx}` : 'loading'}
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

  const judge = state.players[state.judgeIdx];
  const amJudge = me === judge.id;

  if (state.phase === 'gameOver') {
    return wrap(<GameOver title="Fim de jogo!" players={state.players} scores={state.scores} onPlayAgain={reset} onExit={onExit} onRanking={onRanking} canControl={!online || isHost} />);
  }

  if (state.phase === 'judgeReveal') {
    return wrap(
      <div className="space-y-5 text-center">
        <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm bg-warning/15 text-warning px-3 py-1.5 rounded-full">
          <Crown size={14} /> Juiz: {judge.name}{amJudge && ' (você)'}
        </span>
        <BlackCard>{state.black}</BlackCard>
        <p className="font-sans text-text-secondary text-sm">{state.pick > 1 ? 'Esta pede 2 cartas! ' : ''}Os outros completam a frase mais podre.</p>
        {(!online || isHost) ? (
          <Button onClick={() => dispatch({ type: 'BEGIN' })}>Começar a rodada 👉</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">Aguardando o host começar…</p>
        )}
      </div>,
    );
  }

  if (state.phase === 'submit') {
    if (online) {
      const submittedCount = state.submissions.length;
      if (amJudge) return wrap(<Wait text={`Você é o juiz 👑 — aguardando as cartas… (${submittedCount}/${state.submitOrder.length})`} />);
      const iSubmitted = state.submissions.some((s) => s.playerId === me);
      if (iSubmitted) return wrap(<Wait text={`Enviado! Aguardando os outros… (${submittedCount}/${state.submitOrder.length})`} />);
      const myHand = cartasEngine.getPlayerView(state, me).hands[me] || [];
      return wrap(<HandPicker black={state.black} pick={state.pick} hand={myHand} onSubmit={(cards) => dispatch({ type: 'SUBMIT', cards, playerId: me })} />);
    }
    const pid = state.submitOrder[state.submitIdx];
    const player = state.players.find((p) => p.id === pid)!;
    return wrap(
      <SubmitTurn key={pid} playerName={player.name} black={state.black} pick={state.pick} hand={state.hands[pid]} progress={`${state.submitIdx + 1}/${state.submitOrder.length}`} onSubmit={(cards) => dispatch({ type: 'SUBMIT', cards })} />,
    );
  }

  if (state.phase === 'judge') {
    const opts = state.submissions.map((s, i) => ({ id: String(i), label: <span>{fillSentence(state.black, s.cards)}</span> }));
    if (online && !amJudge) {
      return wrap(
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm bg-warning/15 text-warning px-3 py-1.5 rounded-full">
            <Crown size={14} /> {judge.name} está julgando…
          </span>
          <BlackCard>{state.black}</BlackCard>
          <SelectConfirm columns={1} readOnly options={opts} hint="As respostas da galera — aguardando o juiz decidir 👀" />
        </div>,
      );
    }
    return wrap(
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 font-display font-bold text-sm bg-warning/15 text-warning px-3 py-1.5 rounded-full">
          <Crown size={14} /> {judge.name}, escolha a melhor!
        </span>
        <BlackCard>{state.black}</BlackCard>
        <SelectConfirm
          columns={1}
          variant="warning"
          options={opts}
          confirmLabel="Escolher essa 👑"
          onConfirm={(i) => dispatch({ type: 'JUDGE_PICK', index: Number(i) })}
        />
      </div>,
    );
  }

  // roundResult
  const winner = state.players.find((p) => p.id === state.winnerId);
  const isLast = state.round >= state.totalRounds;
  return wrap(
    <div className="space-y-5 text-center">
      <h2 className="font-display font-extrabold text-2xl text-success">🏆 {winner?.name} venceu a rodada!</h2>
      <div className="bg-surface border-2 border-success/40 rounded-3xl p-5">
        <p className="font-display font-bold text-lg text-text-primary overflow-wrap-anywhere">{fillSentence(state.black, state.winnerCards ?? [])}</p>
      </div>
      {(!online || isHost) ? (
        <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>{isLast ? 'Ver resultado 🏆' : 'Próxima rodada 👉'}</Button>
      ) : (
        <p className="font-sans text-sm text-text-muted">Aguardando o host continuar…</p>
      )}
    </div>,
  );
};

const SubmitTurn: React.FC<{
  playerName: string;
  black: string;
  pick: number;
  hand: string[];
  progress: string;
  onSubmit: (cards: string[]) => void;
}> = ({ playerName, black, pick, hand, progress, onSubmit }) => {
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
  return <HandPicker black={black} pick={pick} hand={hand} onSubmit={(cards) => { setRevealed(false); onSubmit(cards); }} />;
};

export default CartasPodres;
