import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

// Trame Ben-Day : l'image est « cuite » une fois en une grille de points (taille du point
// proportionnelle à l'encre de la cellule), puis animée sur canvas.

export interface BendayBake {
  /** Nombre de cellules sur le plus grand côté. */
  grid?: number;
  /** Encre minimale (0-1) pour qu'une cellule porte un point. */
  threshold?: number;
  /** Courbe appliquée à l'encre avant seuillage (< 1 épaissit les points). */
  gamma?: number;
}

export type BendayPreset = 'shimmer' | 'pulse' | 'static';

interface BendayProps {
  src: string;
  bake?: BendayBake;
  preset?: BendayPreset;
  /** Taille du plus grand côté, en px CSS. */
  size?: number;
  /** natural : garde les proportions de l'image ; square : étire dans un carré. */
  fit?: 'natural' | 'square';
  /** Couleur des points ; par défaut la couleur de texte courante. */
  color?: string;
  className?: string;
}

interface Dot {
  col: number;
  row: number;
  ink: number;
}

interface Baked {
  dots: Dot[];
  cols: number;
  rows: number;
}

const bakeCache = new Map<string, Promise<Baked>>();

function bakeImage(src: string, grid: number, threshold: number, gamma: number, fit: 'natural' | 'square'): Promise<Baked> {
  const key = `${src}|${grid}|${threshold}|${gamma}|${fit}`;
  const cached = bakeCache.get(key);
  if (cached) return cached;

  const promise = new Promise<Baked>((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const w = img.naturalWidth || 1;
      const h = img.naturalHeight || 1;
      const ratio = fit === 'natural' ? w / h : 1;
      const cols = ratio >= 1 ? grid : Math.max(1, Math.round(grid * ratio));
      const rows = ratio >= 1 ? Math.max(1, Math.round(grid / ratio)) : grid;

      // Sur-échantillonnage ×4 puis moyenne par cellule, pour des bords nets.
      const ss = 4;
      const canvas = document.createElement('canvas');
      canvas.width = cols * ss;
      canvas.height = rows * ss;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return reject(new Error('Canvas 2D indisponible'));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const dots: Dot[] = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          let sum = 0;
          for (let y = 0; y < ss; y++) {
            for (let x = 0; x < ss; x++) {
              const i = ((row * ss + y) * canvas.width + (col * ss + x)) * 4;
              const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
              sum += (data[i + 3] / 255) * (1 - lum);
            }
          }
          const ink = Math.pow(sum / (ss * ss), gamma);
          if (ink >= threshold) dots.push({ col, row, ink });
        }
      }
      resolve({ dots, cols, rows });
    };
    img.onerror = () => reject(new Error(`Image illisible : ${src}`));
    img.src = src;
  });

  bakeCache.set(key, promise);
  promise.catch(() => bakeCache.delete(key));
  return promise;
}

export function Benday({
  src,
  bake = {},
  preset = 'shimmer',
  size = 256,
  fit = 'natural',
  color,
  className,
}: BendayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { grid = 48, threshold = 0.5, gamma = 1 } = bake;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let cancelled = false;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    bakeImage(src, grid, threshold, gamma, fit)
      .then(({ dots, cols, rows }) => {
        if (cancelled) return;
        const cell = size / Math.max(cols, rows);
        const cssW = cols * cell;
        const cssH = rows * cell;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const fill = color ?? getComputedStyle(canvas).color;
        const maxR = cell * 0.5;
        const diag = cols + rows;

        const draw = (t: number) => {
          ctx.clearRect(0, 0, cssW, cssH);
          ctx.fillStyle = fill;
          const phase = (t / 1000) * 1.1; // tours par seconde de la vague
          for (const d of dots) {
            let k = 1;
            let alpha = 1;
            if (preset === 'shimmer') {
              // Vague diagonale qui balaie le logo : les points gonflent puis se resserrent.
              const pos = (d.col + d.row) / diag;
              const wave = Math.cos(2 * Math.PI * (pos * 1.4 - phase));
              const lift = Math.pow(Math.max(0, wave), 3);
              k = 0.62 + 0.38 * lift;
              alpha = 0.45 + 0.55 * lift;
            } else if (preset === 'pulse') {
              const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * phase * 0.8);
              k = 0.7 + 0.3 * wave;
            }
            const r = maxR * Math.sqrt(d.ink) * k;
            if (r < 0.2) continue;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc((d.col + 0.5) * cell, (d.row + 0.5) * cell, r, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          if (preset !== 'static' && !reduceMotion) raf = requestAnimationFrame(draw);
        };
        draw(performance.now());
      })
      .catch(() => {
        // image indisponible : le canvas reste vide, le texte du chargeur suffit
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [src, grid, threshold, gamma, fit, preset, size, color]);

  return <canvas ref={canvasRef} aria-hidden="true" className={cn('block', className)} style={{ width: size, height: size }} />;
}
