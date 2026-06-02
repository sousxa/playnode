import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

/** Botão para alternar tema claro/escuro. */
const ThemeToggle: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isLight, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
      className={`w-11 h-11 rounded-2xl bg-surface border border-line text-text-secondary flex items-center justify-center active:scale-90 transition-transform ${className}`}
    >
      {isLight ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
};

export default ThemeToggle;
