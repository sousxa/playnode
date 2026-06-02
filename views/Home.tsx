
import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';

interface HomeProps {
  onJoin: (name: string, code?: string) => Promise<void> | void;
  initialCode?: string;
}

const Home: React.FC<HomeProps> = ({ onJoin, initialCode }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState(initialCode || '');
  const [showJoin, setShowJoin] = useState(!!initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onJoin(name.trim(), showJoin ? code : undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao conectar');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass =
    'w-full p-4 rounded-2xl bg-surface border-2 border-line text-text-primary text-lg font-sans ' +
    'placeholder:text-text-muted outline-none focus:border-accent transition-colors disabled:opacity-60';

  return (
    <div className="page-wrapper dot-pattern flex flex-col p-6 justify-center items-center">
      <div className="absolute top-5 right-5">
        <ThemeToggle />
      </div>

      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-accent flex items-center justify-center mx-auto mb-5 rotate-3" style={{ boxShadow: '0 6px 0 rgb(var(--color-accent-dark))' }}>
          <Sparkles className="text-white" size={38} />
        </div>
        <h1 className="font-display font-extrabold text-5xl tracking-tight">
          Cat<span className="text-gradient">Decks</span>
        </h1>
        <p className="font-sans text-text-secondary text-lg mt-1">Jogos de festa pra reunir a galera 🎉</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          disabled={isLoading}
          className={inputClass}
        />

        {error && (
          <div className="p-4 rounded-2xl bg-danger/15 border-2 border-danger/40 text-text-primary font-sans text-sm">
            ⚠️ {error}
          </div>
        )}

        {showJoin ? (
          <div className="space-y-4">
            <input
              type="text"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              disabled={isLoading}
              className={`${inputClass} text-center tracking-[0.4em] uppercase font-display font-bold text-2xl text-accent`}
            />
            <Button type="submit" disabled={!name.trim() || code.length < 4 || isLoading}>
              {isLoading ? 'Entrando...' : '🚪 Entrar na sala'}
            </Button>
            <button
              type="button"
              onClick={() => { setShowJoin(false); setError(null); }}
              disabled={isLoading}
              className="w-full font-sans text-text-muted hover:text-accent transition-colors py-1"
            >
              ou criar uma nova sala
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Criando...' : '✨ Criar nova sala'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowJoin(true); setError(null); }}
              disabled={isLoading}
            >
              🔑 Entrar com código
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Home;
