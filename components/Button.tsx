import React from 'react';
import { motion } from 'framer-motion';

type Variant = 'primary' | 'success' | 'warning' | 'danger' | 'secondary' | 'ghost';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

// Cada variante "sólida" usa uma cor + a sombra inferior (token -dark) que dá o efeito 3D.
const SOLID: Record<string, { bg: string; shadow: string; text: string }> = {
  primary: { bg: 'rgb(var(--color-accent))', shadow: 'rgb(var(--color-accent-dark))', text: '#fff' },
  success: { bg: 'rgb(var(--color-success))', shadow: 'rgb(var(--color-success-dark))', text: '#fff' },
  warning: { bg: 'rgb(var(--color-warning))', shadow: 'rgb(var(--color-warning-dark))', text: '#fff' },
  danger:  { bg: 'rgb(var(--color-danger))',  shadow: 'rgb(var(--color-danger-dark))',  text: '#fff' },
};

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  'aria-label': ariaLabel,
}) => {
  const base =
    'w-full min-h-[52px] py-3.5 px-5 rounded-2xl font-display font-bold text-base tracking-wide ' +
    'flex items-center justify-center gap-2 select-none disabled:cursor-not-allowed ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

  // Variantes não-sólidas (sem empurrão 3D)
  if (variant === 'secondary' || variant === 'ghost') {
    const flat =
      variant === 'secondary'
        ? 'bg-surface text-accent border-2 border-line'
        : 'bg-transparent text-text-secondary';
    return (
      <motion.button
        type={type}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        whileTap={disabled ? {} : { scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`${base} ${flat} ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        {children}
      </motion.button>
    );
  }

  const { bg, shadow, text } = SOLID[variant];

  return (
    <motion.button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      style={
        disabled
          ? { backgroundColor: 'rgb(var(--color-surface-alt))', boxShadow: 'none', color: 'rgb(var(--color-text-muted))' }
          : { backgroundColor: bg, boxShadow: `0 4px 0 ${shadow}`, color: text }
      }
      whileTap={disabled ? {} : { y: 4, boxShadow: `0 0px 0 ${shadow}` }}
      whileHover={disabled ? {} : { y: -1, boxShadow: `0 5px 0 ${shadow}` }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`${base} ${className}`}
    >
      {children}
    </motion.button>
  );
};

export default Button;
