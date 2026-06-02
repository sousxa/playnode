import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';
import { firebaseSyncService } from '../services/firebaseSync';

const REACTIONS = [
  { type: 'tomato', emoji: '🍅', label: 'Tomate' }, // splat + treme a tela
  { type: 'laugh', emoji: '😂', label: 'Risada' },
  { type: 'clap', emoji: '👏', label: 'Palmas' },
  { type: 'skull', emoji: '💀', label: 'Morri' },
  { type: 'love', emoji: '❤️', label: 'Amei' },
  { type: 'poke', emoji: '⚡', label: 'Cutucar' }, // vibra + treme a tela
];

interface ActiveReaction {
  id: number;
  type: string;
  emoji: string;
  fromName: string;
  x: number;
  y: number;
}

interface Props {
  roomCode: string;
  playerId: string;
  playerName: string;
}

/** Faz a app inteira tremer (aplica a classe no #root). */
function shakeScreen() {
  const el = document.getElementById('root');
  if (!el) return;
  el.classList.remove('screen-shake');
  // força reflow para reiniciar a animação se já estiver tremendo
  void el.offsetWidth;
  el.classList.add('screen-shake');
  window.setTimeout(() => el.classList.remove('screen-shake'), 520);
}

/** Sistema de "zoeira": reações que aparecem na tela de todos (tomate estoura + treme). */
const Reactions: React.FC<Props> = ({ roomCode, playerId, playerName }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveReaction[]>([]);

  useEffect(() => {
    const unsub = firebaseSyncService.onReaction(roomCode, (r) => {
      const id = Date.now() + Math.random();
      const emoji = REACTIONS.find((x) => x.type === r.type)?.emoji ?? '🎉';
      const isTomato = r.type === 'tomato';
      const isPoke = r.type === 'poke';
      setActive((a) => [
        ...a,
        { id, type: r.type, emoji, fromName: r.fromName, x: isTomato ? 12 + Math.random() * 70 : 8 + Math.random() * 78, y: 18 + Math.random() * 50 },
      ]);
      if (isTomato || isPoke) {
        try { navigator.vibrate?.(isTomato ? [40, 30, 90] : [60, 40, 60]); } catch { /* ignore */ }
        shakeScreen();
      }
      setTimeout(() => setActive((a) => a.filter((x) => x.id !== id)), isTomato ? 1100 : 2600);
    });
    return unsub;
  }, [roomCode]);

  const send = (type: string) => {
    firebaseSyncService.sendReaction(roomCode, type, playerId, playerName);
    setOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
        {active.map((a) =>
          a.type === 'tomato' ? (
            // 🍅 ESTOURA na tela (splat) onde caiu
            <div key={a.id} className="absolute" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: 'translate(-50%,-50%)' }}>
              <div className="relative flex items-center justify-center" style={{ animation: 'tomato-splat 1s ease-out forwards' }}>
                <span
                  className="absolute w-40 h-40 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.55) 0%, rgba(220,38,38,0.25) 45%, transparent 70%)' }}
                />
                <span className="text-7xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}>🍅</span>
                <span className="absolute text-5xl" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>💥</span>
              </div>
              <span className="block text-center text-[10px] font-sans text-white bg-danger/80 px-1.5 py-0.5 rounded-full mt-1 w-max mx-auto">{a.fromName}</span>
            </div>
          ) : (
            // demais reações flutuam subindo
            <motion.div
              key={a.id}
              initial={{ y: 40, opacity: 0, scale: 0.5 }}
              animate={{
                y: -(typeof window !== 'undefined' ? window.innerHeight : 700) * 0.5,
                opacity: [0, 1, 1, 0],
                scale: 1.2,
                rotate: a.type === 'poke' ? [0, -12, 12, 0] : 0,
              }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              style={{ left: `${a.x}%`, bottom: 90 }}
              className="absolute flex flex-col items-center"
            >
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>{a.emoji}</span>
              <span className="text-[10px] font-sans text-text-secondary bg-surface/80 px-1.5 py-0.5 rounded-full mt-1">{a.fromName}</span>
            </motion.div>
          ),
        )}
      </div>

      <div className="fixed right-4 bottom-4 z-[61] flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="grid grid-cols-3 gap-2 p-2 rounded-3xl bg-surface border border-line shadow-soft"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => send(r.type)}
                  aria-label={r.label}
                  className="w-12 h-12 rounded-2xl bg-surface-2 text-2xl active:scale-90 transition-transform"
                >
                  {r.emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Zoeira"
          className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center active:scale-90 transition-transform"
          style={{ boxShadow: '0 5px 0 rgb(var(--color-accent-dark))' }}
        >
          {open ? <X size={22} /> : <PartyPopper size={24} />}
        </button>
      </div>
    </>
  );
};

export default Reactions;
