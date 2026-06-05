import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// Orbes mágicos desfocados que flutuam devagar (clima de feitiço/gato mago).
const ORBS = [
  { size: 360, color: '139,92,246', x: '8%', y: '12%', dx: 48, dy: 36, dur: 26 },
  { size: 300, color: '168,85,247', x: '72%', y: '16%', dx: -54, dy: 44, dur: 32 },
  { size: 380, color: '99,102,241', x: '58%', y: '66%', dx: 40, dy: -46, dur: 30 },
  { size: 260, color: '217,70,239', x: '16%', y: '72%', dx: 56, dy: -32, dur: 36 },
  { size: 220, color: '139,92,246', x: '40%', y: '40%', dx: -36, dy: -28, dur: 28 },
];

// Brilhos que cintilam (sparkles).
const SPARKLES = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2.5 + 1.5,
  dur: Math.random() * 2.5 + 2,
  delay: Math.random() * 4,
}));

/**
 * Fundo mágico: orbes coloridos bem desfocados (blur) flutuando devagar +
 * brilhos cintilando. Leve parallax no movimento do ponteiro. Combina com o
 * tema escuro (preto fosco) e claro. Respeita prefers-reduced-motion.
 */
const Particles: React.FC = () => {
  const layer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      // alvo: leve deslocamento conforme a posição do ponteiro (parallax sutil)
      tx = (e.clientX / window.innerWidth - 0.5) * -30;
      ty = (e.clientY / window.innerHeight - 0.5) * -30;
    };
    const tick = () => {
      cx += (tx - cx) * 0.05; cy += (ty - cy) * 0.05;
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" style={{ background: 'transparent' }}>
      <div ref={layer} className="absolute inset-0 will-change-transform">
        {ORBS.map((o, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: o.x,
              top: o.y,
              width: o.size,
              height: o.size,
              background: `radial-gradient(circle, rgba(${o.color},0.40), rgba(${o.color},0) 70%)`,
              filter: 'blur(64px)',
            }}
            animate={{ x: [0, o.dx, 0], y: [0, o.dy, 0], scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: o.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {SPARKLES.map((s) => (
          <motion.span
            key={s.id}
            className="absolute rounded-full bg-accent"
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, boxShadow: '0 0 6px 1px rgb(var(--color-accent) / 0.8)' }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.4] }}
            transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
};

export default Particles;
