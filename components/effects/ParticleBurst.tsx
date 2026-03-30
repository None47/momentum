"use client";

import { useEffect, useRef, useCallback } from "react";
import type { HabitCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";

interface ParticleBurstProps {
  trigger: boolean;
  category: HabitCategory;
  colorOverride?: string;
  x?: number;
  y?: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export default function ParticleBurst({
  trigger,
  category,
  colorOverride,
  x = 0,
  y = 0,
}: ParticleBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const burst = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const color = colorOverride ?? CATEGORY_COLORS[category];
    const particles: Particle[] = [];

    // Create 24 particles in radial pattern
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 * i) / 24 + (Math.random() - 0.5) * 0.4;
      const speed = 2 + Math.random() * 4;
      particles.push({
        x: x || canvas.width / 2,
        y: y || canvas.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 2,
        alpha: 1,
        color,
      });
    }

    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds

    function animate() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress >= 1 || !ctx || !canvas) {
        ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.alpha = 1 - progress;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.round(p.alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(animate);
    }

    animate();
  }, [category, colorOverride, x, y]);

  useEffect(() => {
    if (trigger) {
      burst();
    }
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [trigger, burst]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      aria-hidden="true"
    />
  );
}
