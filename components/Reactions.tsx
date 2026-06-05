import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, X } from 'lucide-react';
import { firebaseSyncService } from '../services/firebaseSync';

const REACTIONS = [
  { type: 'tomato', emoji: '🍅', label: 'Tomate' }, // splat na tela + treme
  { type: 'laugh', emoji: '😂', label: 'Risada' },
  { type: 'clap', emoji: '👏', label: 'Palmas' },
  { type: 'skull', emoji: '💀', label: 'Morri' },
  { type: 'love', emoji: '❤️', label: 'Amei' },
  { type: 'fire', emoji: '🔥', label: 'Fogo' },
  { type: 'poke', emoji: '⚡', label: 'Cutucar' }, // vibra + treme
];

interface Floater { id: number; emoji: string; x: number; size: number; rot: number; dur: number; sway: number; }
interface Splat { id: number; x: number; y: number; }

interface Props { roomCode: string; playerId: string; playerName: string; }

const SHAKE_COOLDOWN = 1500; // ms — evita flood de tremor de tela
const MAX_FLOATERS = 22;

function shakeScreen() {
  const el = document.getElementById('root');
  if (!el) return;
  el.classList.remove('screen-shake');
  void el.offsetWidth;
  el.classList.add('screen-shake');
  window.setTimeout(() => el.classList.remove('screen-shake'), 520);
}

const Reactions: React.FC<Props> = ({ roomCode, playerId, playerName }) => {
  const [open, setOpen] = useState(false);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [splats, setSplats] = useState<Splat[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const lastShake = useRef(0);
  const idc = useRef(0);

  const maybeShake = (vibratePattern: number[]) => {
    const now = Date.now();
    if (now - lastShake.current < SHAKE_COOLDOWN) return; // rate-limit
    lastShake.current = now;
    shakeScreen();
    try { navigator.vibrate?.(vibratePattern); } catch { /* ignore */ }
  };

  const spawnFloaters = (emoji: string, n: number) => {
    const add: Floater[] = [];
    for (let i = 0; i < n; i++) {
      add.push({
        id: ++idc.current,
        emoji,
        x: 6 + Math.random() * 84,
        size: 34 + Math.random() * 26,
        rot: (Math.random() - 0.5) * 80,
        dur: 2 + Math.random() * 1.1,
        sway: (Math.random() - 0.5) * 80,
      });
    }
    setFloaters((f) => [...f, ...add].slice(-MAX_FLOATERS));
    const maxDur = Math.max(...add.map((a) => a.dur)) * 1000 + 200;
    const ids = add.map((a) => a.id);
    window.setTimeout(() => setFloaters((f) => f.filter((x) => !ids.includes(x.id))), maxDur);
  };

  useEffect(() => {
    const unsub = firebaseSyncService.onReaction(roomCode, (r) => {
      const emoji = REACTIONS.find((x) => x.type === r.type)?.emoji ?? '🎉';
      if (r.type === 'tomato') {
        const id = ++idc.current;
        const s: Splat = { id, x: 10 + Math.random() * 76, y: 16 + Math.random() * 56 };
        setSplats((p) => [...p, s].slice(-5));
        window.setTimeout(() => setSplats((p) => p.filter((x) => x.id !== id)), 1100);
        maybeShake([40, 30, 90]);
      } else if (r.type === 'poke') {
        maybeShake([60, 40, 60]);
        spawnFloaters('⚡', 3);
      } else {
        spawnFloaters(emoji, 2 + Math.floor(Math.random() * 2)); // 2-3 subindo
      }
    });
    return unsub;
  }, [roomCode]);

  const send = (type: string) => {
    if (cooldown) return;
    setCooldown(true);
    window.setTimeout(() => setCooldown(false), 550); // cooldown de envio
    firebaseSyncService.sendReaction(roomCode, type, playerId, playerName);
    setOpen(false);
  };

  const vh = typeof window !== 'undefined' ? window.innerHeight : 700;

  return (
    <>
      {/* camada de reações */}
      <div className="fixed inset-0 z-[60] pointer-events-none overflow-hidden">
        {floaters.map((f) => (
          <motion.div
            key={f.id}
            initial={{ y: 40, x: 0, opacity: 0, scale: 0.5, rotate: 0 }}
            animate={{ y: -vh * 0.62, x: f.sway, opacity: [0, 1, 1, 0], scale: 1, rotate: f.rot }}
            transition={{ duration: f.dur, ease: 'easeOut' }}
            style={{ left: `${f.x}%`, bottom: 80, fontSize: f.size }}
            className="absolute"
          >
            <span style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))' }}>{f.emoji}</span>
          </motion.div>
        ))}

        {/* 🍅 estoura na tela onde "bateu" */}
        {splats.map((s) => (
          <div key={s.id} className="absolute" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)' }}>
            <div className="relative flex items-center justify-center" style={{ animation: 'tomato-splat 1s ease-out forwards' }}>
              <span className="absolute w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.6) 0%, rgba(220,38,38,0.3) 40%, rgba(220,38,38,0) 70%)' }} />
              <span className="absolute w-52 h-52" style={{ background: 'radial-gradient(circle, rgba(220,38,38,0.25) 0%, rgba(220,38,38,0) 60%)', filter: 'blur(2px)' }} />
              <span className="text-7xl" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' }}>🍅</span>
              <span className="absolute text-5xl" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }}>💥</span>
            </div>
          </div>
        ))}
      </div>

      {/* botão flutuante + paleta */}
      <div className="fixed right-4 bottom-4 z-[61] flex flex-col items-end gap-2">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="grid grid-cols-4 gap-2 p-2 rounded-3xl bg-surface border border-line shadow-soft"
            >
              {REACTIONS.map((r) => (
                <button
                  key={r.type}
                  onClick={() => send(r.type)}
                  disabled={cooldown}
                  aria-label={r.label}
                  className="w-12 h-12 rounded-2xl bg-surface-2 text-2xl active:scale-90 transition-transform disabled:opacity-40"
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
