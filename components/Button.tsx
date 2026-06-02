
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
  const baseStyles =
    "w-full py-4 px-6 rounded-3xl font-fun font-semibold text-lg " +
    "flex items-center justify-center gap-2 transition-all duration-150 " +
    "active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-gradient-to-r from-fun-purple to-fun-pink text-white shadow-soft hover:brightness-105",
    secondary: "bg-white text-fun-purple border-2 border-fun-purple2/40 shadow-soft-sm hover:border-fun-purple",
    danger: "bg-gradient-to-r from-fun-coral to-fun-pink text-white shadow-soft-pink hover:brightness-105",
    ghost: "bg-transparent text-fun-muted hover:bg-fun-purple/5",
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
