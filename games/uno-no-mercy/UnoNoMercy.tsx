import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Hand as HandIcon, Skull, RotateCw } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { initGame, reducer, canPlay, cardLabel, isWild, type Card, type UnoColor, type UnoState } from './engine';

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

const COLOR_HEX: Record<UnoColor, string> = { red: '#ef4444', yellow: '#eab308', green: '#22c55e', blue: '#3b82f6' };
const COLOR_PT: Record<UnoColor, string> = { red: 'Vermelho', yellow: 'Amarelo', green: 'Verde', blue: 'Azul' };

/** Visual de uma carta. */
const UnoCardView: React.FC<{ card: Card; size?: 'sm' | 'lg'; dim?: boolean; onClick?: () => void; highlight?: boolean }> = ({ card, size = 'sm', dim, onClick, highlight }) => {
  const isW = card.color === 'wild';
  const bg = isW ? '#27272a' : COLOR_HEX[card.color as UnoColor];
  const text = card.color === 'yellow' ? '#1c1c1e' : '#fff';
  const dims = size === 'lg' ? 'w-24 h-36 text-3xl' : 'w-[3.1rem] h-[4.4rem] text-lg';
  const Comp: any = onClick ? motion.button : 'div';
  return (
    <Comp
      onClick={onClick}
      whileTap={onClick ? { scale: 0.92 } : undefined}
      className={`relative shrink-0 ${dims} rounded-2xl flex items-center justify-center font-display font-extrabold shadow-soft ${highlight ? 'ring-2 ring-white ring-offset-2 ring-offset-bg' : ''} ${dim ? 'opacity-40' : ''}`}
      style={{ background: bg, color: text }}
    >
      {isW && (
        <span className="absolute inset-1 rounded-xl opacity-40" style={{ background: 'conic-gradient(#ef4444,#eab308,#22c55e,#3b82f6,#ef4444)' }} />
      )}
      <span className="relative leading-none text-center px-1 overflow-wrap-anywhere">{cardSymbol(card)}</span>
    </Comp>
  );
};

function cardSymbol(card: Card): string {
  switch (card.kind) {
    case 'number': return String(card.value);
    case 'skip': return '⊘';
    case 'reverse': return '⇅';
    case 'draw2': return '+2';
    case 'draw4': return '+4';
    case 'discardAll': return '🗑';
    case 'skipAll': return '⊘⊘';
    case 'wild': return '🌈';
    case 'wildDraw4': return '+4';
    case 'wildDraw6': return '+6';
    case 'wildDraw10': return '+10';
    default: return '';
  }
}

const UnoNoMercy: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset, resetRound } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const [pendingWild, setPendingWild] = useState<string | null>(null);

  useEffect(() => {
    if (state?.phase === 'gameOver') {
      onReportScores?.(state.scores);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="Uno No Mercy" onExit={!online || isHost ? onExit : undefined} onRestartRound={online && isHost ? resetRound : undefined} onRestartGame={online && isHost ? reset : undefined} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (!state) return wrap(<p className="text-center font-sans text-text-secondary mt-10">Conectando à partida…</p>, false);

  if (state.phase === 'gameOver') {
    return wrap(<GameOver title="Fim do massacre!" players={state.players} scores={state.scores} onPlayAgain={reset} onExit={onExit} onRanking={onRanking} canControl={!online || isHost} />);
  }

  const current = state.players[state.turnIdx];
  const me = playerId || '';

  const playCard = (card: Card) => {
    if (isWild(card.kind)) { setPendingWild(card.id); return; }
    dispatch({ type: 'PLAY', playerId: current.id, cardId: card.id });
  };
  const pickColor = (color: UnoColor) => {
    if (!pendingWild) return;
    dispatch({ type: 'PLAY', playerId: current.id, cardId: pendingWild, chosenColor: color });
    setPendingWild(null);
  };

  const Board = <BoardView state={state} />;

  const Controls = (forId: string) => {
    const hand = state.hands[forId] ?? [];
    const hasPlayable = hand.some((c) => canPlay(c, state));
    const sorted = [...hand].sort((a, b) => sortKey(a) - sortKey(b));
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {sorted.map((c) => {
            const ok = canPlay(c, state);
            return <UnoCardView key={c.id} card={c} dim={!ok} highlight={ok} onClick={ok ? () => playCard(c) : undefined} />;
          })}
        </div>
        <Button variant={state.pendingDraw > 0 ? 'danger' : 'secondary'} onClick={() => dispatch({ type: 'DRAW', playerId: forId })}>
          {state.pendingDraw > 0 ? `Comprar ${state.pendingDraw} 😵` : (hasPlayable ? 'Não quero jogar — comprar 1' : 'Comprar 1 carta')}
        </Button>
      </div>
    );
  };

  // ── ONLINE ──
  if (online) {
    const myTurn = current.id === me;
    return wrap(
      <div className="flex-1 flex flex-col">
        {Board}
        <div className="flex-1" />
        {myTurn ? (
          <div className="space-y-2">
            <p className="text-center font-display font-bold text-accent">Sua vez! 🔥</p>
            {Controls(me)}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-center font-sans text-text-secondary">Vez de <b className="text-text-primary">{current.name}</b>… suas cartas:</p>
            <div className="flex flex-wrap gap-1.5 justify-center opacity-70">
              {[...(state.hands[me] ?? [])].sort((a, b) => sortKey(a) - sortKey(b)).map((c) => <UnoCardView key={c.id} card={c} />)}
            </div>
          </div>
        )}
        {pendingWild && <ColorPicker onPick={pickColor} onCancel={() => setPendingWild(null)} />}
      </div>,
    );
  }

  // ── LOCAL (passa e joga): cobre o aparelho a cada turno ──
  return wrap(
    <LocalTurn key={state.turnIdx} playerName={current.name}>
      <div className="flex-1 flex flex-col">
        {Board}
        <div className="flex-1" />
        {Controls(current.id)}
      </div>
      {pendingWild && <ColorPicker onPick={pickColor} onCancel={() => setPendingWild(null)} />}
    </LocalTurn>,
  );
};

/** Ordena a mão por cor e tipo pra ficar mais fácil de achar. */
function sortKey(c: Card): number {
  const colorOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, blue: 3, wild: 4 };
  const kindOrder: Record<string, number> = { number: 0, skip: 1, reverse: 2, draw2: 3, draw4: 4, discardAll: 5, skipAll: 6, wild: 7, wildDraw4: 8, wildDraw6: 9, wildDraw10: 10 };
  return colorOrder[c.color] * 100 + (kindOrder[c.kind] ?? 0) * 10 + (c.value ?? 0);
}

const BoardView: React.FC<{ state: UnoState }> = ({ state }) => {
  const top = state.discard[state.discard.length - 1];
  return (
    <div className="space-y-3">
      {/* Faixa de jogadores */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <RotateCw size={16} className={`shrink-0 text-text-muted transition-transform ${state.direction === -1 ? 'scale-x-[-1]' : ''}`} />
        {state.players.map((p) => {
          const elim = state.eliminated.includes(p.id);
          const isTurn = state.players[state.turnIdx]?.id === p.id;
          const count = state.hands[p.id]?.length ?? 0;
          const danger = count >= state.mercyLimit - 5 && !elim;
          return (
            <div key={p.id} className={`shrink-0 px-2.5 py-1.5 rounded-2xl border flex items-center gap-1.5 ${isTurn ? 'bg-accent text-white border-accent' : 'bg-surface border-line text-text-secondary'} ${elim ? 'opacity-40' : ''}`}>
              {elim ? <Skull size={13} /> : null}
              <span className="font-display font-bold text-sm whitespace-nowrap">{p.name}</span>
              <span className={`font-display font-extrabold text-xs px-1.5 rounded-full ${isTurn ? 'bg-white/25' : danger ? 'bg-danger/20 text-danger' : 'bg-surface-2'}`}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Centro: pilha de descarte + cor ativa + pilha de compra */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative">
          <span className="absolute -inset-2 rounded-3xl opacity-60" style={{ boxShadow: `0 0 0 4px ${COLOR_HEX[state.currentColor]}` }} />
          <UnoCardView card={top} size="lg" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-sans text-xs text-text-muted">Cor:</span>
          <span className="w-4 h-4 rounded-full" style={{ background: COLOR_HEX[state.currentColor] }} />
          <span className="font-display font-bold text-sm text-text-secondary">{COLOR_PT[state.currentColor]}</span>
          {state.pendingDraw > 0 && (
            <span className="ml-2 font-display font-extrabold text-sm text-danger bg-danger/15 px-2 py-0.5 rounded-full">Pilha: +{state.pendingDraw} 😈</span>
          )}
        </div>
      </div>

      <p className="text-center font-sans text-xs text-text-muted min-h-[1rem]">{state.log}</p>
    </div>
  );
};

const ColorPicker: React.FC<{ onPick: (c: UnoColor) => void; onCancel: () => void }> = ({ onPick, onCancel }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onCancel}>
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-surface rounded-4xl p-6 w-full max-w-xs space-y-4">
      <p className="text-center font-display font-bold text-text-primary">Escolha a cor 🎨</p>
      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(COLOR_HEX) as UnoColor[]).map((c) => (
          <motion.button key={c} whileTap={{ scale: 0.92 }} onClick={() => onPick(c)} className="h-16 rounded-2xl font-display font-extrabold text-white shadow-soft" style={{ background: COLOR_HEX[c], color: c === 'yellow' ? '#1c1c1e' : '#fff' }}>
            {COLOR_PT[c]}
          </motion.button>
        ))}
      </div>
    </motion.div>
  </motion.div>
);

const LocalTurn: React.FC<{ playerName: string; children: React.ReactNode }> = ({ playerName, children }) => {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="flex-1 w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center"><HandIcon className="text-accent" size={28} /></div>
        <p className="font-sans text-text-secondary">Passe o aparelho para</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{playerName}</h2>
        <p className="font-sans text-sm text-text-muted">Toque para ver sua mão (os outros não olham!)</p>
      </button>
    );
  }
  return <AnimatePresence mode="wait"><motion.div key="t" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col">{children}</motion.div></AnimatePresence>;
};

export default UnoNoMercy;
