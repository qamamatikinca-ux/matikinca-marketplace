"use client";

import { useEffect, useRef } from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let frame = 0;
    let animationFrame = 0;
    const duration = 1700;
    const start = performance.now();
    const palette = ["#f6b800", "#ffd76a", "#ffffff", "#c9c9c9", "#8b8b8b"];
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      rotation: number;
      spin: number;
      width: number;
      height: number;
      color: string;
      opacity: number;
    }> = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const total = window.innerWidth < 640 ? 72 : 110;
    for (let i = 0; i < total; i += 1) {
      const fromLeft = i % 2 === 0;
      const edgeInset = 18 + Math.random() * Math.min(120, window.innerWidth * 0.12);
      particles.push({
        x: fromLeft ? edgeInset : window.innerWidth - edgeInset,
        y: 36 + Math.random() * Math.min(180, window.innerHeight * 0.24),
        vx: (fromLeft ? 1 : -1) * (2.4 + Math.random() * 5.2),
        vy: -4.5 - Math.random() * 6.5,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 0.28,
        width: 4 + Math.random() * 6,
        height: 8 + Math.random() * 10,
        color: palette[Math.floor(Math.random() * palette.length)],
        opacity: 0.88 + Math.random() * 0.12,
      });
    }

    const draw = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const particle of particles) {
        particle.vy += 0.18;
        particle.vx *= 0.995;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;

        const fade = progress > 0.7 ? 1 - (progress - 0.7) / 0.3 : 1;
        context.save();
        context.globalAlpha = Math.max(0, particle.opacity * fade);
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.fillStyle = particle.color;
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
        context.restore();
      }

      frame += 1;
      if (progress < 1 && frame < 180) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    animationFrame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100]"
      />
      {children}
    </>
  );
}
