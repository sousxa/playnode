import React, { useState } from 'react';
import { Moon, Sun, Eye } from 'lucide-react';
import Button from '../../components/Button';
import GameHeader from '../shared/GameHeader';
import CoverScreen from '../shared/CoverScreen';
import type { GameConfig } from '../../engine/types';
import { initGame, reducer, aliveIds, type CidadeState, type Role } from './engine';

interface Props {
  config: GameConfig;
  onExit: () => void;
}

const ROLE_INFO: Record<Role, { emoji: string; label: string; desc: string }> = {
  assassino: { emoji: '🔪', label: 'Assassino', desc: 'Toda noite, elimine um jogador. Não seja descoberto!' },
  medico: { emoji: '💉', label: 'Médico', desc: 'Toda noite, escolha alguém para salvar (pode ser você).' },
  detetive: { emoji: '🔍', label: 'Detetive', desc: 'Toda noite, investigue alguém e descubra se é o assassino.' },
  cidadao: { emoji: '🧑', label: 'Cidadão', desc: 'Use a discussão do dia para desmascarar o assassino.' },
};

const NIGHT_PROMPT: Record<string, string> = {
  assassino: 'Quem você quer eliminar?',
  medico: 'Quem você quer salvar?',
  detetive: 'Quem você quer investigar?',
};

const CidadeDorme: React.FC<Props> = ({ config, onExit }) => {
  const [state, setState] = useState<CidadeState>(() => initGame(config));
  const dispatch = (a: Parameters<typeof reducer>[1]) => setState((s) => reducer(s, a));
  const playAgain = () => setState(initGame(config));

  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? '???';
  const wrap = (children: React.ReactNode) => (
    <div className="page-wrapper flex flex-col p-5">
      <GameHeader title="A Cidade Dorme" round={state.dayNumber} totalRounds={state.dayNumber} onExit={onExit} />
      <div className="flex-1 flex flex-col justify-center w-full max-w-md mx-auto">{children}</div>
    </div>
  );

  // ── distribute ──
  if (state.phase === 'distribute') {
    const player = state.players[state.distributeIdx];
    const info = ROLE_INFO[state.roles[player.id]];
    return wrap(
      <CoverScreen
        key={player.id}
        playerName={player.name}
        onDone={() => dispatch({ type: 'NEXT_DISTRIBUTE' })}
        doneLabel={state.distributeIdx + 1 >= state.players.length ? 'A cidade vai dormir 🌙' : 'Pronto, passar 👉'}
      >
        <div className="space-y-3">
          <div className="text-6xl">{info.emoji}</div>
          <h2 className="font-display font-extrabold text-3xl text-accent">{info.label}</h2>
          <p className="font-sans text-text-secondary">{info.desc}</p>
        </div>
      </CoverScreen>
    );
  }

  // ── night ──
  if (state.phase === 'night') {
    const role = state.nightQueue[state.nightStepIdx];
    const actor = state.players.find((p) => state.roles[p.id] === role && state.alive[p.id])!;
    const targets = aliveIds(state)
      .filter((id) => (role === 'medico' ? true : id !== actor.id))
      .map((id) => ({ id, name: name(id) }));
    return wrap(
      <NightTurn
        key={`${state.dayNumber}-${role}`}
        actorName={actor.name}
        role={role}
        targets={targets}
        isKiller={(id) => state.roles[id] === 'assassino'}
        onAct={(target) => dispatch({ type: 'NIGHT_ACTION', target })}
      />
    );
  }

  // ── nightResult ──
  if (state.phase === 'nightResult') {
    return wrap(
      <div className="space-y-5 text-center">
        <Sun className="text-warning mx-auto" size={48} />
        <h2 className="font-display font-extrabold text-3xl text-text-primary">Amanheceu!</h2>
        {state.lastVictim ? (
          <p className="font-sans text-lg text-text-secondary"><b className="text-danger">{name(state.lastVictim)}</b> foi encontrado(a) sem vida. 💀</p>
        ) : (
          <p className="font-sans text-lg text-success">Ninguém morreu essa noite! 🎉</p>
        )}
        <Button onClick={() => dispatch({ type: 'START_DAY' })}>Discutir e votar 🗳️</Button>
      </div>
    );
  }

  // ── day (votação sequencial) ──
  if (state.phase === 'day') {
    const voter = state.dayVoters[state.dayVoterIdx];
    const targets = state.dayVoters.filter((id) => id !== voter).map((id) => ({ id, name: name(id) }));
    return wrap(
      <DayVote
        key={voter}
        voterName={name(voter)}
        targets={targets}
        progress={`${state.dayVoterIdx + 1}/${state.dayVoters.length}`}
        onVote={(target) => dispatch({ type: 'DAY_VOTE', target })}
      />
    );
  }

  // ── dayResult ──
  if (state.phase === 'dayResult') {
    const elim = state.lastEliminated!;
    const info = ROLE_INFO[state.roles[elim]];
    return wrap(
      <div className="space-y-5 text-center">
        <h2 className="font-display font-extrabold text-2xl text-text-primary">A cidade votou…</h2>
        <div className="bg-surface border border-line rounded-3xl p-6">
          <div className="text-5xl mb-2">{info.emoji}</div>
          <p className="font-display font-bold text-xl text-text-primary">{name(elim)} era {info.label}!</p>
        </div>
        <Button onClick={() => dispatch({ type: 'NEXT' })}>Próxima noite 🌙</Button>
      </div>
    );
  }

  // ── gameOver ──
  const cidadeVenceu = state.winner === 'cidade';
  return wrap(
    <div className="space-y-5 text-center">
      <div className="text-6xl">{cidadeVenceu ? '🎉' : '🔪'}</div>
      <h2 className={`font-display font-extrabold text-3xl ${cidadeVenceu ? 'text-success' : 'text-danger'}`}>
        {cidadeVenceu ? 'A cidade venceu!' : 'O assassino venceu!'}
      </h2>
      <div className="bg-surface border border-line rounded-3xl p-4 space-y-1 text-left">
        {state.players.map((p) => (
          <div key={p.id} className="flex justify-between font-sans text-sm">
            <span className="text-text-primary">{p.name}</span>
            <span className="text-text-muted">{ROLE_INFO[state.roles[p.id]].emoji} {ROLE_INFO[state.roles[p.id]].label}</span>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Button variant="success" onClick={playAgain}>🔄 Jogar de novo</Button>
        <Button variant="ghost" onClick={onExit}>Voltar ao menu</Button>
      </div>
    </div>
  );
};

const NightTurn: React.FC<{
  actorName: string;
  role: string;
  targets: { id: string; name: string }[];
  isKiller: (id: string) => boolean;
  onAct: (target: string) => void;
}> = ({ actorName, role, targets, isKiller, onAct }) => {
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState<string | null>(null);
  const info = ROLE_INFO[role as Role];

  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <Moon className="text-accent" size={32} />
        <p className="font-sans text-text-secondary">A cidade dorme… acorde,</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{info.emoji} {actorName}</h2>
        <p className="font-sans text-sm text-text-muted">toque quando estiver só você vendo</p>
      </button>
    );
  }

  // resultado do detetive
  if (role === 'detetive' && checked) {
    const killer = isKiller(checked);
    return (
      <div className="space-y-5 text-center">
        <div className="text-5xl">{killer ? '🔪' : '✅'}</div>
        <p className="font-display font-bold text-xl text-text-primary">
          {targets.find((t) => t.id === checked)?.name} {killer ? 'É o assassino!' : 'não é o assassino.'}
        </p>
        <Button onClick={() => onAct(checked)}>Pronto, passar 👉</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display font-extrabold text-xl text-text-primary text-center">{info.emoji} {NIGHT_PROMPT[role]}</h2>
      <div className="grid grid-cols-2 gap-3">
        {targets.map((t) => (
          <button
            key={t.id}
            onClick={() => (role === 'detetive' ? setChecked(t.id) : onAct(t.id))}
            className="font-display font-bold p-4 rounded-2xl bg-surface border border-line text-text-primary active:scale-95 hover:border-accent transition-all"
          >
            {t.name}
          </button>
        ))}
      </div>
    </div>
  );
};

const DayVote: React.FC<{
  voterName: string;
  targets: { id: string; name: string }[];
  progress: string;
  onVote: (target: string) => void;
}> = ({ voterName, targets, progress, onVote }) => {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button onClick={() => setRevealed(true)} className="w-full bg-surface border-2 border-line rounded-4xl p-10 text-center flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-accent/15 flex items-center justify-center"><Eye className="text-accent" size={28} /></div>
        <p className="font-sans text-text-secondary">Voto de</p>
        <h2 className="font-display font-extrabold text-3xl text-text-primary">{voterName}</h2>
        <p className="font-sans text-sm text-text-muted">{progress} · em quem você vota?</p>
      </button>
    );
  }
  return (
    <div className="space-y-4">
      <h2 className="font-display font-extrabold text-xl text-text-primary text-center">Quem é suspeito, {voterName}?</h2>
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

export default CidadeDorme;
