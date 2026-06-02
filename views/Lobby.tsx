
import React, { useState } from 'react';
import Button from '../components/Button';
import SingleDeviceMode from '../components/SingleDeviceMode';
import { Player, GameMode } from '../types';

interface LobbyProps {
  roomCode: string;
  isHost: boolean;
  players: Player[];
  onStartGame: (mode: GameMode) => Promise<void>;
}

const Lobby: React.FC<LobbyProps> = ({ roomCode, isHost, players, onStartGame }) => {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Gera a URL de convite
  const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inviteUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async (mode: GameMode) => {
    if (players.length < 2 && mode !== GameMode.DILEMAS) {
      alert("Convide pelo menos mais um amigo para testar!");
      return;
    }
    setLoading(true);
    try {
      await onStartGame(mode);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-8 bg-white border-b text-center space-y-4 shadow-sm">
        <div className="space-y-1">
          <p className="text-slate-400 uppercase tracking-widest text-xs font-black">Código da Sala</p>
          <h2 className="text-5xl font-black text-indigo-600 tracking-tighter">{roomCode || '---'}</h2>
        </div>
        
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-2 rounded-2xl shadow-md border border-slate-100">
            <img src={qrUrl} alt="QR Code para entrar" className="w-32 h-32" />
          </div>
          
          <button 
            onClick={handleCopy}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${copied ? 'bg-green-100 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}
          >
            <i className={`fas ${copied ? 'fa-check' : 'fa-link'}`}></i>
            {copied ? 'Link Copiado!' : 'Copiar Link de Convite'}
          </button>
        </div>
      </header>

      <main className="p-6 flex-1 min-h-0 overflow-y-auto space-y-8 pb-10">
        <section>
          <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest ml-1 mb-3">Jogadores na Sala ({players.length})</h3>
          <div className="flex flex-wrap gap-2">
            {players.map(p => (
              <span key={p.id} className="bg-white border-2 border-indigo-50 text-indigo-700 px-5 py-3 rounded-2xl font-bold shadow-sm animate-in zoom-in-50">
                {p.id === localStorage.getItem('pnode_pid') ? '🙋‍♂️ Você' : `👤 ${p.name}`}
              </span>
            ))}
          </div>
        </section>

        {/* Modo Single Device para adicionar jogadores locais */}
        {isHost && (
          <SingleDeviceMode
            roomCode={roomCode}
            isHost={isHost}
            players={players}
          />
        )}

        {isHost ? (
          <section className="space-y-4">
            <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest ml-1">Iniciar Jogo</h3>
            
            <div onClick={() => !loading && handleStart(GameMode.IMPOSTOR)} className="p-6 bg-white rounded-[2rem] border-2 border-transparent active:border-indigo-500 shadow-sm cursor-pointer transition-all hover:shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-indigo-950">O Impostor</h4>
                  <p className="text-slate-500 text-sm">Um não sabe, os outros sim.</p>
                </div>
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <i className="fas fa-user-secret text-xl"></i>
                </div>
              </div>
            </div>

            <div onClick={() => !loading && handleStart(GameMode.QUEM_SOU_EU)} className="p-6 bg-white rounded-[2rem] border-2 border-transparent active:border-indigo-500 shadow-sm cursor-pointer transition-all hover:shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-indigo-950">Quem Sou Eu?</h4>
                  <p className="text-slate-500 text-sm">Descubra seu personagem.</p>
                </div>
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                  <i className="fas fa-id-badge text-xl"></i>
                </div>
              </div>
            </div>

            <div onClick={() => !loading && handleStart(GameMode.DILEMAS)} className="p-6 bg-white rounded-[2rem] border-2 border-transparent active:border-indigo-500 shadow-sm cursor-pointer transition-all hover:shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-black text-indigo-950">Dilemas</h4>
                  <p className="text-slate-500 text-sm">Votação rápida e polêmica.</p>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <i className="fas fa-balance-scale text-xl"></i>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <div className="p-10 text-center bg-indigo-50 rounded-[2.5rem] border-4 border-dashed border-indigo-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <div className="w-4 h-4 bg-indigo-600 rounded-full animate-ping"></div>
            </div>
            <p className="text-indigo-950 font-bold text-lg">Aguardando o Host iniciar...</p>
            <p className="text-indigo-400 text-sm mt-1">Diga ao host para escolher um jogo!</p>
          </div>
        )}
      </main>

      {loading && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold text-indigo-600 text-xl">Sincronizando com IA...</p>
        </div>
      )}
    </div>
  );
};

export default Lobby;
