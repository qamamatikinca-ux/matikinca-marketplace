"use client";

import { useEffect, useRef } from "react";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  rotation: number;
  rotationSpeed: number;
  width: number;
  height: number;
  color: string;
  opacity: number;
};

export default function LaunchConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let stopped = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const palette = ["#f6b800", "#ffffff", "#b8b8b8", "#4d4d4d"];
    const pieces: Piece[] = [];

    const launchSide = (side: "left" | "right", amount: number, delay = 0) => {
      window.setTimeout(() => {
        if (stopped) return;
        for (let i = 0; i < amount; i += 1) {
          const left = side === "left";
          pieces.push({
            x: left ? -10 : window.innerWidth + 10,
            y: window.innerHeight * (0.22 + Math.random() * 0.46),
            vx: (left ? 1 : -1) * (5.3 + Math.random() * 5.6),
            vy: -8.5 - Math.random() * 8,
            gravity: 0.21 + Math.random() * 0.11,
            rotation: Math.random() * Math.PI,
            rotationSpeed: (Math.random() - 0.5) * 0.35,
            width: 5 + Math.random() * 5,
            height: 9 + Math.random() * 9,
            color: palette[Math.floor(Math.random() * palette.length)],
            opacity: 0.82 + Math.random() * 0.18,
          });
        }
      }, delay);
    };

    launchSide("left", 34, 120);
    launchSide("right", 34, 120);
    launchSide("left", 22, 520);
    launchSide("right", 22, 520);

    const started = performance.now();
    const duration = 2600;

    const draw = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const piece of pieces) {
        piece.vy += piece.gravity;
        piece.x += piece.vx;
        piece.y += piece.vy;
        piece.rotation += piece.rotationSpeed;

        const progress = Math.max(0, (now - started - 1700) / 900);
        const fade = Math.max(0, 1 - progress);

        ctx.save();
        ctx.globalAlpha = piece.opacity * fade;
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation);
        ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.width / 2, -piece.height / 2, piece.width, piece.height);
        ctx.restore();
      }

      if (now - started < duration) {
        raf = requestAnimationFrame(draw);
      } else {
        stopped = true;
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100]"
    />
  );
}
