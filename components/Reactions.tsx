import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';
import { firebaseSyncService } from '../services/firebaseSync';

const REACTIONS = [
  { type: 'tomato', emoji: '🍅' },
  { type: 'laugh', emoji: '😂' },
  { type: 'clap', emoji: '👏' },
  { type: 'skull', emoji: '💀' },
  { type: 'love', emoji: '❤️' },
  { type: 'poke', emoji: '⚡' }, // cutucada: vibra + treme a tela
];

interface ActiveReaction {
  id: number;
  emoji: string;
  fromName: string;
  x: number;
  poke: boolean;
}

interface Props {
  roomCode: string;
  playerId: string;
  playerName: string;
}

/** Sistema de "zoeira": manda reações que aparecem flutuando na tela de todos. */
const Reactions: React.FC<Props> = ({ roomCode, playerId, playerName }) => {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveReaction[]>([]);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    const unsub = firebaseSyncService.onReaction(roomCode, (r) => {
      const id = Date.now() + Math.random();
      const poke = r.type === 'poke';
      const emoji = REACTIONS.find((x) => x.type === r.type)?.emoji ?? '🎉';
      setActive((a) => [...a, { id, emoji, fromName: r.fromName, x: 8 + Math.random() * 78, poke }]);
      if (poke) {
        try { navigator.vibrate?.([60, 40, 60]); } catch { /* ignore */ }
        setShake(true);
        setTimeout(() => setShake(false), 450);
      }
      setTimeout(() => setActive((a) => a.filter((x) => x.id !== id)), 2600);
    });
    return unsub;
  }, [roomCode]);

  const send = (type: string) => {
    firebaseSyncService.sendReaction(roomCode, type, playerId, playerName);
    setOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {shake && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] pointer-events-none ring-[6px] ring-inset ring-danger/40"
          />
        )}
      </AnimatePresence>

      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
        <AnimatePresence>
          {active.map((a) => (
            <motion.div
              key={a.id}
              initial={{ y: 40, opacity: 0, scale: 0.5 }}
              animate={{ y: -(typeof window !== 'undefined' ? window.innerHeight : 700) * 0.5, opacity: [0, 1, 1, 0], scale: 1.2, rotate: a.poke ? [0, -10, 10, 0] : 0 }}
              transition={{ duration: 2.4, ease: 'easeOut' }}
              style={{ left: `${a.x}%`, bottom: 90 }}
              className="absolute flex flex-col items-center"
            >
              <span className="text-5xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>{a.emoji}</span>
              <span className="text-[10px] font-sans text-text-secondary bg-surface/80 px-1.5 py-0.5 rounded-full mt-1">{a.fromName}</span>
            </motion.div>
          ))}
        </AnimatePresence>
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
                <button key={r.type} onClick={() => send(r.type)} className="w-12 h-12 rounded-2xl bg-surface-2 text-2xl active:scale-90 transition-transform">
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
