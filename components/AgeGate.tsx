import React from 'react';
import Button from './Button';

/** Confirmação 18+ no primeiro acesso. */
const AgeGate: React.FC<{ onConfirm: () => void }> = ({ onConfirm }) => (
  <div className="page-wrapper flex flex-col justify-center items-center p-6 text-center">
    <div className="text-6xl mb-4">🔞</div>
    <h1 className="font-display font-extrabold text-3xl text-text-primary mb-2">Conteúdo adulto</h1>
    <p className="font-sans text-text-secondary max-w-xs mb-8">
      O CatDecks é um jogo de festa para maiores de 18 anos. Alguns modos têm conteúdo adulto opcional.
    </p>
    <div className="w-full max-w-xs space-y-3">
      <Button onClick={onConfirm}>Tenho 18 anos ou mais</Button>
      <a
        href="https://www.google.com"
        className="block font-sans text-text-muted hover:text-text-secondary py-2"
      >
        Sair
      </a>
    </div>
  </div>
);

export default AgeGate;
