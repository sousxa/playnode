import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// "Aurora": washes de cor grandes e bem suaves que se movem devagar pelo fundo.
// Sem bolinhas/linhas — limpo e bonitinho (clima Duolingo + magia do gato).
const BLOBS = [
  { size: 620, color: '139,92,246', left: '-14%', top: '-12%', dx: 160, dy: 120, dur: 14 },  // violeta
  { size: 540, color: '99,102,241', left: '62%', top: '4%', dx: -180, dy: 130, dur: 17 },     // índigo
  { size: 560, color: '217,70,239', left: '34%', top: '50%', dx: 150, dy: -140, dur: 15 },    // magenta
  { size: 480, color: '124,58,237', left: '0%', top: '58%', dx: 170, dy: -110, dur: 19 },     // roxo
];

const Particles: React.FC = () => {
  const layer = useRef<HTMLDivElement>(null);

  // Parallax bem sutil seguindo o ponteiro.
  useEffect(() => {
    const el = layer.current;
    if (!el) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -40;
      ty = (e.clientY / window.innerHeight - 0.5) * -40;
    };
    const tick = () => {
      cx += (tx - cx) * 0.04; cy += (ty - cy) * 0.04;
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div ref={layer} className="absolute inset-0 will-change-transform">
        {BLOBS.map((b, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.size,
              height: b.size,
              top: b.top,
              left: b.left,
              background: `radial-gradient(circle, rgba(${b.color},0.42) 0%, rgba(${b.color},0.16) 38%, rgba(${b.color},0) 70%)`,
              filter: 'blur(72px)',
            }}
            animate={{ x: [0, b.dx, 0], y: [0, b.dy, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: b.dur, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
};

export default Particles;
