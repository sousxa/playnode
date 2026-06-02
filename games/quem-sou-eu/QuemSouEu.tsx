import React, { useState } from 'react';
import { EyeOff } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import GameOver from '../shared/GameOver';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, type WhoAmIState } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
}

const QuemSouEu: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<WhoAmIState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="Quem Sou Eu?" onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  if (state.phase === 'gameOver') {
    return wrap(
      <GameOver title="Acabou!" players={state.players} scores={state.scores} onPlayAgain={playAgain} onExit={onExit} />
    );
  }

  const current = state.players[state.turnIdx];
  const character = state.assignments[current.id];

  return wrap(
    <TurnCard
      key={current.id}
      name={current.name}
      character={character}
      progress={`${state.turnIdx + 1}/${state.players.length}`}
      onResolve={(correct) => dispatch({ type: 'RESOLVE', correct })}
    />
  );
};

// O aparelho fica virado para o GRUPO; o jogador da vez não deve olhar.
const TurnCard: React.FC<{
  name: string;
  character: string;
  progress: string;
  onResolve: (correct: boolean) => void;
}> = ({ name, character, progress, onResolve }) => {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-3xl bg-warning/15 flex items-center justify-center">
          <EyeOff className="text-warning" size={28} />
        </div>
        <p className="font-sans text-text-secondary">Vez de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{name}</h2>
        <p className="font-sans text-sm text-text-muted">
          {progress} · {name}, NÃO olhe! Vire o aparelho para a galera e toque.
        </p>
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
        <Button variant="secondary" onClick={() => onResolve(false)}>Passar</Button>
      </div>
    </div>
  );
};

export default QuemSouEu;
