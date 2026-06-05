import React, { useEffect, useRef } from 'react';

interface P { x: number; y: number; vx: number; vy: number; r: number; a: number }

/**
 * Fundo de partículas leve (canvas próprio, sem libs). Densidade média, drift
 * suave, linhas tênues entre vizinhas e repulsão no toque/mouse. A cor segue o
 * tema (texto primário), então funciona no claro e no preto fosco.
 */
const Particles: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let parts: P[] = [];
    let raf = 0;
    const pointer = { x: -9999, y: -9999 };

    const readColor = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--color-text-primary').trim();
      const [r, g, b] = (v || '245 245 247').split(/\s+/).map(Number);
      return { r, g, b };
    };
    let col = readColor();
    const mo = new MutationObserver(() => { col = readColor(); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(24, Math.min(64, Math.floor((w * h) / 17000)));
      parts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.7 + 0.7,
        a: Math.random() * 0.35 + 0.12,
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      const { r, g, b } = col;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        const dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy;
        if (d2 < 14000) {
          const d = Math.sqrt(d2) || 1, f = ((14000 - d2) / 14000) * 0.5;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        if (p.x < -10) p.x = w + 10; else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10; else if (p.y > h + 10) p.y = -10;
        // linhas tênues entre vizinhas
        for (let j = i + 1; j < parts.length; j++) {
          const q = parts[j], lx = p.x - q.x, ly = p.y - q.y, l2 = lx * lx + ly * ly;
          if (l2 < 9000) {
            ctx.strokeStyle = `rgba(${r},${g},${b},${0.05 * (1 - l2 / 9000)})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        ctx.fillStyle = `rgba(${r},${g},${b},${p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; };
    const onLeave = () => { pointer.x = -9999; pointer.y = -9999; };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerout', onLeave);
    if (!reduce) raf = requestAnimationFrame(tick);
    else { // sem movimento: desenha um quadro estático
      const { r, g, b } = col;
      for (const p of parts) { ctx.fillStyle = `rgba(${r},${g},${b},${p.a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    }

    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerout', onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="fixed inset-0 -z-10 pointer-events-none" style={{ width: '100vw', height: '100vh' }} />;
};

export default Particles;
