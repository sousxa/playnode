import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Martini } from 'lucide-react';
import Button from '../components/Button';
import { GameMode } from '../types';
import { GAME_CONFIG_SCHEMA, GAME_TITLES } from '../games/metadata';
import { STOP_CATEGORIES } from '../games/stop/engine';

import type { IntensityLevel } from '../engine/types';

export interface ConfigExtras {
  categoryId: string;
  rounds?: number;
  impostorCount?: number;
  alcoholicMode: boolean;
  intensityLevel?: IntensityLevel;
  stopCategories?: string[];
}

interface GameConfigProps {
  mode: GameMode;
  playerCount: number;
  onBack: () => void;
  onStart: (extras: ConfigExtras) => void;
}

const Stepper: React.FC<{ label: string; value: number; min: number; max: number; onChange: (v: number) => void }> = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-3xl bg-surface border border-line">
    <span className="font-display font-bold text-text-primary">{label}</span>
    <div className="flex items-center gap-4">
      <button onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="w-9 h-9 rounded-xl bg-surface-2 text-text-primary flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform">
        <Minus size={16} />
      </button>
      <span className="font-display font-extrabold text-xl text-accent w-6 text-center">{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}
        className="w-9 h-9 rounded-xl bg-surface-2 text-text-primary flex items-center justify-center disabled:opacity-40 active:scale-90 transition-transform">
        <Plus size={16} />
      </button>
    </div>
  </div>
);

const GameConfig: React.FC<GameConfigProps> = ({ mode, playerCount, onBack, onStart }) => {
  const schema = GAME_CONFIG_SCHEMA[mode] ?? {};
  const maxImpostors = Math.min(3, Math.max(1, Math.floor(playerCount / 3)));

  const [categoryId, setCategoryId] = useState('all');
  const [rounds, setRounds] = useState(schema.rounds?.default ?? 3);
  const [impostorCount, setImpostorCount] = useState(playerCount >= 7 ? 2 : 1);
  const [alcoholic, setAlcoholic] = useState(false);
  const [intensity, setIntensity] = useState<IntensityLevel>('medio');
  const [stopCats, setStopCats] = useState<string[]>(STOP_CATEGORIES.slice(0, 6));
  const toggleCat = (c: string) =>
    setStopCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div className="page-wrapper p-5 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Voltar"
          className="w-10 h-10 rounded-2xl bg-surface border border-line text-text-secondary flex items-center justify-center active:scale-90 transition-transform">
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-display font-extrabold text-2xl text-text-primary">{GAME_TITLES[mode]}</h1>
      </div>

      {schema.categories && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-text-secondary ml-1">Categoria</h3>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 pr-8">
              <CatChip active={categoryId === 'all'} onClick={() => setCategoryId('all')} icon="🎲" label="Misturar" />
              {schema.categories.map((c) => (
                <CatChip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(c.id)} icon={c.icon} label={c.label} />
              ))}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 bottom-1 w-12 bg-gradient-to-l from-bg to-transparent flex items-center justify-end">
              <ChevronRight className="text-accent" size={20} />
            </div>
          </div>
        </section>
      )}

      {schema.intensity && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-text-secondary ml-1">Intensidade</h3>
          <div className="flex gap-2">
            {(['leve', 'medio', 'pesado'] as IntensityLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                className={`flex-1 py-3 rounded-2xl font-display font-bold text-sm capitalize border transition-colors ${intensity === lvl ? 'bg-accent text-white border-accent' : 'bg-surface text-text-secondary border-line'}`}
              >
                {lvl === 'medio' ? 'Médio' : lvl}
              </button>
            ))}
          </div>
        </section>
      )}

      {schema.stopCategories && (
        <section className="space-y-2">
          <h3 className="font-display font-bold text-text-secondary ml-1">
            Categorias <span className="font-sans font-normal text-text-muted text-sm">· escolha (mín. 2)</span>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {STOP_CATEGORIES.map((c) => {
              const active = stopCats.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => toggleCat(c)}
                  className={`p-3 rounded-2xl border font-display font-bold text-sm text-left transition-all ${active ? 'bg-accent text-white border-accent' : 'bg-surface text-text-secondary border-line'}`}
                >
                  {active ? '✓ ' : ''}{c}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {schema.rounds && (
        <Stepper label={schema.rounds.label} value={rounds} min={schema.rounds.min} max={schema.rounds.max} onChange={setRounds} />
      )}

      {schema.impostorCount && maxImpostors > 1 && (
        <Stepper label="Impostores" value={impostorCount} min={1} max={maxImpostors} onChange={setImpostorCount} />
      )}

      {schema.alcoholic && (
        <button onClick={() => setAlcoholic(!alcoholic)} className="w-full flex items-center gap-3 p-4 rounded-3xl bg-surface border border-line text-left">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${alcoholic ? 'bg-danger/15 text-danger' : 'bg-surface-2 text-text-muted'}`}>
            <Martini size={20} />
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-text-primary">Modo alcoólico 🍻</p>
            <p className="font-sans text-xs text-text-muted">Libera conteúdo adulto (18+)</p>
          </div>
          <span className={`w-12 h-7 rounded-full p-1 transition-colors ${alcoholic ? 'bg-danger' : 'bg-surface-2'}`}>
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${alcoholic ? 'translate-x-5' : ''}`} />
          </span>
        </button>
      )}

      <Button
        disabled={schema.stopCategories && stopCats.length < 2}
        onClick={() => onStart({ categoryId, rounds, impostorCount, alcoholicMode: alcoholic, intensityLevel: intensity, stopCategories: stopCats })}
      >
        Começar! 🎬
      </Button>
    </div>
  );
};

const CatChip: React.FC<{ active: boolean; onClick: () => void; icon?: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl border whitespace-nowrap transition-all ${active ? 'bg-accent text-white border-accent' : 'bg-surface text-text-primary border-line'}`}
  >
    <span className="text-lg">{icon}</span>
    <span className="font-display font-bold text-sm">{label}</span>
  </button>
);

export default GameConfig;
