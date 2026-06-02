
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
    "w-full p-4 bg-arcade-bg border-4 border-black text-arcade-cyan font-retro text-2xl " +
    "placeholder:text-arcade-line outline-none focus:border-arcade-cyan transition-colors " +
    "shadow-hard disabled:opacity-50";

  return (
    <div className="h-full overflow-y-auto flex flex-col p-6 justify-center items-center">
      <div className="mb-10 text-center">
        <div className="w-20 h-20 bg-arcade-pink border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-hard rotate-[-4deg]">
          <i className="fas fa-gamepad text-black text-4xl"></i>
        </div>
        <h1 className="font-pixel text-3xl text-arcade-yellow glow-yellow mb-3 leading-tight">
          PLAY<span className="text-arcade-pink glow-pink">NODE</span>
        </h1>
        <p className="font-retro text-xl text-arcade-cyan tracking-wide">
          &gt; jogos em grupo<span className="blink">_</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
        <div>
          <label className="font-pixel text-[10px] text-arcade-green glow-green block mb-2 ml-1">
            JOGADOR 1
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="seu nome"
            disabled={isLoading}
            className={inputClass}
          />
        </div>

        {error && (
          <div className="p-3 bg-arcade-red border-4 border-black text-white font-retro text-xl shadow-hard">
            ⚠ {error}
          </div>
        )}

        {showJoin ? (
          <div className="space-y-4">
            <div>
              <label className="font-pixel text-[10px] text-arcade-green glow-green block mb-2 ml-1">
                CÓDIGO
              </label>
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="XXXX"
                disabled={isLoading}
                className={`${inputClass} text-center tracking-[0.5em] uppercase font-pixel !text-2xl text-arcade-yellow`}
              />
            </div>
            <Button type="submit" disabled={!name.trim() || code.length < 4 || isLoading}>
              {isLoading ? 'ENTRANDO...' : '▶ ENTRAR'}
            </Button>
            <button
              type="button"
              onClick={() => { setShowJoin(false); setError(null); }}
              disabled={isLoading}
              className="w-full font-retro text-xl text-arcade-line hover:text-arcade-cyan transition-colors py-1"
            >
              ou criar nova sala
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'CRIANDO...' : '★ CRIAR SALA'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => { setShowJoin(true); setError(null); }}
              disabled={isLoading}
            >
              ENTRAR COM CÓDIGO
            </Button>
          </div>
        )}
      </form>

      <p className="font-retro text-lg text-arcade-line mt-10 tracking-widest">
        © PLAYNODE ARCADE
      </p>
    </div>
  );
};

export default Home;
