import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Button from '../../components/Button';

export interface ChoiceOption {
  id: string;
  label: React.ReactNode;
}

interface Props {
  options: ChoiceOption[];
  onConfirm?: (id: string) => void;
  confirmLabel?: string;
  columns?: 1 | 2;
  variant?: 'primary' | 'danger' | 'warning' | 'success';
  /** Espectador: mostra as opções sem poder escolher (ex.: enquanto outro decide). */
  readOnly?: boolean;
  hint?: string;
}

/**
 * Padrão "selecionar → confirmar": toque numa opção (ela destaca) e só então
 * o botão de confirmar habilita. Evita acionar sem querer. Em `readOnly` vira
 * uma visão de espectador (todos veem as mesmas opções de quem está decidindo).
 */
const SelectConfirm: React.FC<Props> = ({ options, onConfirm, confirmLabel = 'Confirmar ✓', columns = 2, variant = 'primary', readOnly = false, hint }) => {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <div className="space-y-4">
      <div className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
        {options.map((o) => {
          const active = sel === o.id;
          return (
            <motion.button
              key={o.id}
              disabled={readOnly}
              whileTap={readOnly ? undefined : { scale: 0.95 }}
              onClick={() => setSel(o.id)}
              className={`relative font-display font-bold p-4 rounded-2xl border-2 text-left transition-colors overflow-wrap-anywhere ${
                readOnly
                  ? 'bg-surface text-text-secondary border-line opacity-80'
                  : active
                  ? 'bg-accent text-white border-accent shadow-soft'
                  : 'bg-surface text-text-primary border-line'
              }`}
            >
              {o.label}
              {active && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/90 text-accent flex items-center justify-center">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {hint && <p className="text-center font-sans text-xs text-text-muted">{hint}</p>}
      {!readOnly && (
        <Button variant={variant} disabled={!sel} onClick={() => sel && onConfirm?.(sel)}>
          {confirmLabel}
        </Button>
      )}
    </div>
  );
};

export default SelectConfirm;
