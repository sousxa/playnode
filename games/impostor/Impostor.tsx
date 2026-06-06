import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Eye, Search } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import CoverScreen from '../shared/CoverScreen';
import SelectConfirm from '../shared/SelectConfirm';
import type { GameConfig } from '../../engine/types';
import { useSyncedReducer } from '../../hooks/useSyncedReducer';
import { markSeen } from '../../services/contentMemory';
import { initGame, reducer, getVoteTally, type ImpostorState } from './engine';

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

const SecretCard: React.FC<{ secret: { type: 'word' | 'hint'; text: string }; categoryLabel: string }> = ({ secret, categoryLabel }) => (
  secret.type === 'hint' ? (
    <div className="space-y-3">
      <div className="text-5xl">🕵️</div>
      <h2 className="font-display font-extrabold text-2xl text-danger">Você é o Impostor!</h2>
      <p className="font-sans text-text-secondary">Sua dica:</p>
      <p className="font-display font-bold text-xl text-text-primary">"{secret.text}"</p>
      <p className="font-sans text-sm text-text-muted">Blefe e descubra a palavra sem ser pego.</p>
    </div>
  ) : (
    <div className="space-y-3">
      <div className="text-5xl">🤫</div>
      <p className="font-sans text-text-secondary">A palavra secreta é</p>
      <p className="font-display font-extrabold text-3xl text-accent overflow-wrap-anywhere">{secret.text}</p>
      <p className="font-sans text-sm text-text-muted">Categoria: {categoryLabel}</p>
    </div>
  )
);

const Wait: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex-1 flex flex-col justify-center text-center space-y-4">
    <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
      <div className="w-3 h-3 bg-accent rounded-full animate-ping" />
    </div>
    <p className="font-sans text-text-secondary">{text}</p>
  </div>
);

const Impostor: React.FC<Props> = ({ config, onExit, onReportScores, onRanking, online, roomCode, playerId, isHost }) => {
  const { state, dispatch, reset, resetRound } = useSyncedReducer(reducer, () => initGame(config), { online, roomCode, isHost });
  const me = playerId || '';

  useEffect(() => {
    if (state?.phase === 'reveal' && state.caught && !state.stolen) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    }
  }, [state?.phase, state?.caught, state?.stolen]);

  useEffect(() => {
    if (state?.phase === 'gameOver') { onReportScores?.(state.scores); markSeen('impostor', state.usedWords); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase]);

  const wrap = (children: React.ReactNode, header = true) => (
    <div className="page-wrapper flex flex-col p-5">
      {header && state && <GameHeader title="O Impostor" round={state.round} totalRounds={state.totalRounds} onExit={!online || isHost ? onExit : undefined} onRestartRound={online && isHost ? resetRound : undefined} onRestartGame={online && isHost ? reset : undefined} />}
      <div className="flex-1 flex flex-col w-full max-w-md mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={state ? `${state.phase}-${state.round}-${state.distributedIdx}-${state.voterIdx}` : 'loading'}
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

  // ── distribute ──
  if (state.phase === 'distribute') {
    if (online) {
      const secret = state.playerSecrets[me];
      return wrap(
        <div className="space-y-6 text-center">
          <div className="bg-surface border-2 border-line rounded-4xl p-8">
            {secret ? <SecretCard secret={secret} categoryLabel={state.categoryLabel} /> : <p className="font-sans text-text-secondary">Aguardando…</p>}
          </div>
          {isHost ? (
            <Button onClick={() => dispatch({ type: 'BEGIN_CLUES' })}>Todos viram? Começar 🎬</Button>
          ) : (
            <p className="font-sans text-sm text-text-muted">Quando todos virem, o host começa.</p>
          )}
        </div>,
      );
    }
    const player = state.players[state.distributedIdx];
    const secret = state.playerSecrets[player.id];
    return wrap(
      <CoverScreen
        key={player.id}
        playerName={player.name}
        onDone={() => dispatch({ type: 'NEXT_DISTRIBUTE' })}
        doneLabel={state.distributedIdx + 1 >= state.players.length ? 'Começar! 🎬' : 'Pronto, passar 👉'}
      >
        <SecretCard secret={secret} categoryLabel={state.categoryLabel} />
      </CoverScreen>,
    );
  }

  // ── clues ──
  if (state.phase === 'clues') {
    return wrap(
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center mx-auto">
          <Search className="text-accent" size={30} />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-text-primary">Hora das dicas!</h2>
        <div className="bg-surface border border-line rounded-3xl p-5 text-left space-y-2 font-sans text-text-secondary">
          <p>🗣️ Cada um fala uma dica sobre a palavra (sem entregar!).</p>
          <p>🕵️ O impostor blefa sem saber a palavra.</p>
          <p>🎯 Depois todos votam em quem acham que é o impostor.</p>
        </div>
        {(!online || isHost) ? (
          <Button onClick={() => dispatch({ type: 'START_VOTING' })}>Ir para votação 🗳️</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">Aguardando o host iniciar a votação…</p>
        )}
      </div>,
    );
  }

  // ── voting ──
  if (state.phase === 'voting') {
    if (online) {
      // TODOS votam ao mesmo tempo (mais robusto que um por vez).
      const iVoted = state.votes[me] !== undefined;
      const count = Object.keys(state.votes).length;
      if (iVoted) return wrap(
        <div className="flex-1 flex flex-col justify-center gap-4">
          <Wait text={`Voto registrado! Aguardando os outros… (${count}/${state.players.length})`} />
          {isHost && <Button variant="ghost" onClick={() => dispatch({ type: 'FINISH_VOTING' })}>Encerrar votação ⏭️</Button>}
        </div>,
      );
      const suspects = state.players.filter((p) => p.id !== me);
      return wrap(
        <div className="space-y-4">
          <h2 className="font-display font-extrabold text-xl text-text-primary text-center">Quem é o impostor?</h2>
          <p className="font-sans text-xs text-text-muted text-center">{count}/{state.players.length} votaram</p>
          <SelectConfirm
            options={suspects.map((s) => ({ id: s.id, label: s.name }))}
            confirmLabel="Confirmar voto 🗳️"
            onConfirm={(id) => dispatch({ type: 'CAST_VOTE', suspectId: id, voterId: me })}
          />
          {isHost && count > 0 && (
            <Button variant="ghost" onClick={() => dispatch({ type: 'FINISH_VOTING' })}>Encerrar votação ⏭️</Button>
          )}
        </div>,
      );
    }
    const voter = state.players[state.voterIdx];
    const suspects = state.players.filter((p) => p.id !== voter.id);
    return wrap(
      <VotingTurn key={voter.id} voterName={voter.name} suspects={suspects} progress={`${state.voterIdx + 1}/${state.players.length}`} onVote={(id) => dispatch({ type: 'CAST_VOTE', suspectId: id })} />,
    );
  }

  // ── guess (impostor pego tenta adivinhar) ──
  if (state.phase === 'guess') {
    const amImpostor = state.impostorIds.includes(me);
    if (online && !amImpostor) return wrap(<Wait text="O impostor está tentando adivinhar a palavra…" />);
    return wrap(
      <div className="space-y-5 text-center">
        <div className="text-5xl">🕵️</div>
        <h2 className="font-display font-extrabold text-2xl text-text-primary">Impostor foi pego!</h2>
        <p className="font-sans text-text-secondary">Última chance: adivinhe a palavra secreta para roubar a vitória.</p>
        <SelectConfirm
          variant="danger"
          options={state.guessOptions.map((w) => ({ id: w, label: w }))}
          confirmLabel="Chutar palavra 🎯"
          onConfirm={(w) => dispatch({ type: 'IMPOSTOR_GUESS', word: w })}
        />
      </div>,
    );
  }

  // ── reveal ──
  if (state.phase === 'reveal') {
    const impostors = state.players.filter((p) => state.impostorIds.includes(p.id));
    const tally = getVoteTally(state);
    const isLast = state.round >= state.totalRounds;
    let title: string, color: string;
    if (!state.caught) { title = 'O impostor escapou! 🕵️'; color = 'text-danger'; }
    else if (state.stolen) { title = 'Pego — mas roubou a vitória! 🥷'; color = 'text-warning'; }
    else { title = 'O grupo venceu! 🎉'; color = 'text-success'; }
    return wrap(
      <div className="space-y-5 text-center">
        <h2 className={`font-display font-extrabold text-3xl ${color}`}>{title}</h2>
        <div className="bg-surface border border-line rounded-4xl p-5 space-y-2">
          <p className="font-sans text-text-secondary text-sm">A palavra era</p>
          <p className="font-display font-extrabold text-2xl text-accent overflow-wrap-anywhere">{state.word}</p>
          <p className="font-sans text-text-secondary text-sm mt-3">{impostors.length > 1 ? 'Os impostores eram' : 'O impostor era'}</p>
          <p className="font-display font-bold text-xl text-danger">🕵️ {impostors.map((i) => i.name).join(', ')}</p>
        </div>
        <div className="bg-surface border border-line rounded-3xl p-4 space-y-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex justify-between font-sans text-sm">
              <span className="text-text-secondary">{p.name}</span>
              <span className="text-text-muted">{tally[p.id] ?? 0} voto(s)</span>
            </div>
          ))}
        </div>
        {(!online || isHost) ? (
          <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>{isLast ? 'Ver resultado 🏆' : 'Próxima rodada 👉'}</Button>
        ) : (
          <p className="font-sans text-sm text-text-muted">Aguardando o host continuar…</p>
        )}
      </div>,
    );
  }

  // ── gameOver ──
  return wrap(<GameOver title="Fim de jogo!" players={state.players} scores={state.scores} onPlayAgain={reset} onExit={onExit} onRanking={onRanking} canControl={!online || isHost} />);
};

const VotingTurn: React.FC<{
  voterName: string;
  suspects: { id: string; name: string }[];
  progress: string;
  onVote: (suspectId: string) => void;
}> = ({ voterName, suspects, progress, onVote }) => {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center"><Eye className="text-accent" size={28} /></div>
        <p className="font-sans text-text-secondary">Voto secreto de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{voterName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · toque para votar</p>
      </button>
    );
  }
  return (
    <div className="space-y-4">
      <h2 className="font-display font-extrabold text-xl text-text-primary text-center">Quem é o impostor, {voterName}?</h2>
      <div className="grid grid-cols-2 gap-3">
        {suspects.map((s) => (
          <button key={s.id} onClick={() => onVote(s.id)} className="font-display font-bold p-4 rounded-2xl bg-surface border border-line text-text-primary active:scale-95 hover:border-accent transition-all">
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Impostor;
