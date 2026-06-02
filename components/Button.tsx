
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
  const baseStyles = "w-full py-5 px-6 rounded-3xl font-bold text-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100";
  
  const variants = {
    primary: "bg-indigo-600 text-white shadow-lg shadow-indigo-200",
    secondary: "bg-white text-indigo-600 border-2 border-indigo-100 shadow-sm",
    danger: "bg-rose-500 text-white shadow-lg shadow-rose-200",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
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
