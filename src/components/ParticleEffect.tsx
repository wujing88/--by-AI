import { useEffect, useRef } from 'react';

interface ParticleEffectProps {
  colors: string[];
  onComplete?: () => void;
}

interface EmberParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  decay: number;
  drag: number;
}

export default function ParticleEffect({ colors, onComplete }: ParticleEffectProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      if (onComplete) onComplete();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();

    const particles: EmberParticle[] = [];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const count = window.innerWidth < 640 ? 90 : 140;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 9 + 2.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: Math.random() * 3.2 + 1.2,
        color: colors[Math.floor(Math.random() * colors.length)] || '#F43F5E',
        life: 1,
        decay: Math.random() * 0.014 + 0.008,
        drag: 0.965,
      });
    }

    let animationId = 0;

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let anyAlive = false;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + 0.08;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life > 0) {
          anyAlive = true;
          ctx.globalAlpha = Math.max(0, p.life * 0.85);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (anyAlive) {
        animationId = window.requestAnimationFrame(render);
      } else if (onComplete) {
        onComplete();
      }
    };

    animationId = window.requestAnimationFrame(render);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [colors, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
      aria-hidden="true"
    />
  );
}
