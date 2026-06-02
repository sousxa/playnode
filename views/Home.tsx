
import React, { useState, useEffect } from 'react';
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

  return (
    <div className="h-full overflow-y-auto flex flex-col p-8 justify-center items-center bg-indigo-50">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
          <i className="fas fa-gamepad text-white text-3xl"></i>
        </div>
        <h1 className="text-4xl font-extrabold text-indigo-950 mb-1 tracking-tight">PlayNode</h1>
        <p className="text-indigo-600 font-medium">Jogos em grupo, em tempo real.</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <input 
          autoFocus
          type="text" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Seu nome"
          disabled={isLoading}
          className="w-full p-5 rounded-2xl bg-white border-2 border-transparent focus:border-indigo-400 outline-none text-xl font-bold shadow-sm disabled:opacity-60"
        />

        {error && (
          <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded animate-in fade-in">
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {showJoin ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <input 
              type="text" 
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Código da Sala"
              disabled={isLoading}
              className="w-full p-5 rounded-2xl bg-white border-2 border-indigo-200 outline-none text-center text-2xl font-black uppercase text-indigo-600 disabled:opacity-60"
            />
            <Button 
              type="submit" 
              disabled={!name.trim() || code.length < 4 || isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar na Sala'}
            </Button>
            <button 
              type="button"
              onClick={() => {
                setShowJoin(false);
                setError(null);
              }}
              disabled={isLoading}
              className="w-full text-indigo-400 font-bold py-2 text-sm disabled:opacity-60"
            >
              Ou criar nova sala
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button 
              type="submit" 
              disabled={!name.trim() || isLoading}
            >
              {isLoading ? 'Criando...' : 'Criar Nova Sala'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowJoin(true);
                setError(null);
              }}
              disabled={isLoading}
            >
              Entrar com Código
            </Button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Home;
