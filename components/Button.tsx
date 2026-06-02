
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button'
}) => {
  // Estética arcade: fonte pixel, borda preta grossa, sombra "dura" deslocada
  // e o botão "afunda" ao pressionar (translate + sombra some).
  const baseStyles =
    "w-full py-4 px-5 font-pixel text-xs sm:text-sm uppercase tracking-wide " +
    "border-4 border-black shadow-hard transition-all duration-75 " +
    "flex items-center justify-center gap-3 " +
    "active:translate-x-[4px] active:translate-y-[4px] active:shadow-none " +
    "disabled:opacity-40 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-hard disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-arcade-yellow text-black",
    secondary: "bg-arcade-cyan text-black",
    danger: "bg-arcade-pink text-white",
    ghost: "bg-arcade-panel2 text-arcade-cyan border-arcade-line shadow-none active:translate-x-0 active:translate-y-0",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
