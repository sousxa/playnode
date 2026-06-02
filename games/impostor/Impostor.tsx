import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Eye, Search } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import CoverScreen from '../shared/CoverScreen';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, getVoteTally, wasImpostorCaught, type ImpostorState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
}

const Impostor: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<ImpostorState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  // Confete quando o grupo pega o impostor
  useEffect(() => {
    if (state.phase === 'reveal' && wasImpostorCaught(state)) {
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.6 } });
    }
  }, [state.phase]);

  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="O Impostor" round={state.round} totalRounds={state.totalRounds} onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  // ── distribute: cada um vê seu segredo ──
  if (state.phase === 'distribute') {
    const player = state.players[state.distributedIdx];
    const secret = state.playerSecrets[player.id];
    const isImpostor = secret.type === 'hint';
    return wrap(
      <CoverScreen
        key={player.id}
        playerName={player.name}
        onDone={() => dispatch({ type: 'NEXT_DISTRIBUTE' })}
        doneLabel={state.distributedIdx + 1 >= state.players.length ? 'Começar! 🎬' : 'Pronto, passar 👉'}
      >
        {isImpostor ? (
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
            <p className="font-sans text-sm text-text-muted">Categoria: {state.categoryLabel}</p>
          </div>
        )}
      </CoverScreen>
    );
  }

  // ── clues: discussão ──
  if (state.phase === 'clues') {
    return wrap(
      <div className="space-y-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center mx-auto">
          <Search className="text-accent" size={30} />
        </div>
        <h2 className="font-display font-extrabold text-2xl text-text-primary">Hora das dicas!</h2>
        <div className="bg-surface border border-line rounded-3xl p-5 text-left space-y-2 font-sans text-text-secondary">
          <p>🗣️ Cada um fala uma dica sobre a palavra.</p>
          <p>🕵️ O impostor tenta blefar sem saber a palavra.</p>
          <p>🎯 Depois, todos votam em quem acham que é o impostor.</p>
        </div>
        <Button onClick={() => dispatch({ type: 'START_VOTING' })}>Ir para votação 🗳️</Button>
      </div>
    );
  }

  // ── voting: votação secreta passa-e-joga ──
  if (state.phase === 'voting') {
    const voter = state.players[state.voterIdx];
    return wrap(
      <VotingTurn
        key={voter.id}
        voterName={voter.name}
        suspects={state.players.filter((p) => p.id !== voter.id)}
        progress={`${state.voterIdx + 1}/${state.players.length}`}
        onVote={(suspectId) => dispatch({ type: 'CAST_VOTE', suspectId })}
      />
    );
  }

  // ── reveal ──
  if (state.phase === 'reveal') {
    const caught = wasImpostorCaught(state);
    const impostors = state.players.filter((p) => state.impostorIds.includes(p.id));
    const tally = getVoteTally(state);
    const isLast = state.round >= state.totalRounds;
    return wrap(
      <div className="space-y-5 text-center">
        <h2 className={`font-display font-extrabold text-3xl ${caught ? 'text-success' : 'text-danger'}`}>
          {caught ? 'O grupo venceu! 🎉' : 'O impostor escapou! 🕵️'}
        </h2>
        <div className="bg-surface border border-line rounded-4xl p-5 space-y-2">
          <p className="font-sans text-text-secondary text-sm">A palavra era</p>
          <p className="font-display font-extrabold text-2xl text-accent overflow-wrap-anywhere">{state.word}</p>
          <p className="font-sans text-text-secondary text-sm mt-3">
            {impostors.length > 1 ? 'Os impostores eram' : 'O impostor era'}
          </p>
          <p className="font-display font-bold text-xl text-danger">
            🕵️ {impostors.map((i) => i.name).join(', ')}
          </p>
        </div>
        <div className="bg-surface border border-line rounded-3xl p-4 space-y-1">
          {state.players.map((p) => (
            <div key={p.id} className="flex justify-between font-sans text-sm">
              <span className="text-text-secondary">{p.name}</span>
              <span className="text-text-muted">{tally[p.id] ?? 0} voto(s)</span>
            </div>
          ))}
        </div>
        <Button onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
          {isLast ? 'Ver resultado 🏆' : 'Próxima rodada 👉'}
        </Button>
      </div>
    );
  }

  // ── gameOver ──
  return wrap(
    <GameOver title="Fim de jogo!" players={state.players} scores={state.scores} onPlayAgain={playAgain} onExit={onExit} />
  );
};

// Turno de votação: cobre, revela ao votante, mostra suspeitos.
const VotingTurn: React.FC<{
  voterName: string;
  suspects: { id: string; name: string }[];
  progress: string;
  onVote: (suspectId: string) => void;
}> = ({ voterName, suspects, progress, onVote }) => {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center">
          <Eye className="text-accent" size={28} />
        </div>
        <p className="font-sans text-text-secondary">Voto secreto de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{voterName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · toque para votar</p>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-extrabold text-xl text-text-primary text-center">
        Quem é o impostor, {voterName}?
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {suspects.map((s) => (
          <button
            key={s.id}
            onClick={() => onVote(s.id)}
            className="font-display font-bold p-4 rounded-2xl bg-surface border border-line text-text-primary active:scale-95 hover:border-accent transition-all"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Impostor;
