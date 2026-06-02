
import React, { useState } from 'react';
import Button from '../components/Button';

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
    "w-full p-4 rounded-3xl bg-white border-2 border-fun-purple2/30 text-fun-ink text-lg font-fun " +
    "placeholder:text-fun-muted/60 outline-none focus:border-fun-purple focus:ring-4 focus:ring-fun-purple/15 " +
    "shadow-soft-sm transition-all disabled:opacity-60";

  return (
    <div className="h-full overflow-y-auto flex flex-col p-6 justify-center items-center">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-fun-purple to-fun-pink flex items-center justify-center mx-auto mb-5 shadow-soft rotate-3">
          <i className="fas fa-gamepad text-white text-4xl"></i>
        </div>
        <h1 className="font-fun font-bold text-5xl text-fun-ink tracking-tight">
          Play<span className="text-transparent bg-clip-text bg-gradient-to-r from-fun-purple to-fun-pink">Node</span>
        </h1>
        <p className="font-fun text-fun-muted text-lg mt-1">Jogos em grupo, na hora 🎉</p>
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
          <div className="p-4 rounded-2xl bg-fun-coral/15 border-2 border-fun-coral/40 text-fun-ink font-fun text-sm">
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
              className={`${inputClass} text-center tracking-[0.4em] uppercase font-bold text-2xl text-fun-purple`}
            />
            <Button type="submit" disabled={!name.trim() || code.length < 4 || isLoading}>
              {isLoading ? 'Entrando...' : '🚪 Entrar na sala'}
            </Button>
            <button
              type="button"
              onClick={() => { setShowJoin(false); setError(null); }}
              disabled={isLoading}
              className="w-full font-fun text-fun-muted hover:text-fun-purple transition-colors py-1"
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
