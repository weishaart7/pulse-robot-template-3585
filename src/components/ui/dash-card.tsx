import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cartes de la Vue d'ensemble — design system du simulateur (docs/design-system.md) :
// plaque taupe à plat (feature card ElevenLabs), coins 20 px, aucune ombre ni bordure,
// chiffres en Inter 300. Palette achromatique : l'encre marque l'élément principal,
// le gris cendre les éléments secondaires.
export const DASH_INK = '#0c0a09';
export const DASH_MUTED = '#a59f97';
export const DASH_TRACK = '#ddd8d2';

interface DashCardProps {
  title: React.ReactNode;
  to?: string;
  // Action libre en pied de carte, à la place du bouton « Voir le détail ».
  footer?: React.ReactNode;
  // Pastille de période en haut à droite (ex. « Par mois »).
  tag?: string;
  // Compteur sous le titre (ex. 5 « catégories »).
  meta?: { count: number; label: string };
  // 'default' : plaque taupe ; 'soon' : plaque pierre, pour les modules pas encore branchés.
  variant?: 'default' | 'soon';
  className?: string;
  children: React.ReactNode;
}

export function DashCard({ title, to, footer, tag, meta, variant = 'default', className, children }: DashCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-card p-5 text-foreground',
        variant === 'soon' ? 'bg-border' : 'bg-secondary',
        className,
      )}
    >
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-medium">{title}</h3>
        {tag && (
          <span className="rounded-full bg-background px-2.5 py-0.5 text-[10px] text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]">
            {tag}
          </span>
        )}
      </div>

      {meta && (
        <div className="relative mt-1.5 flex items-baseline gap-1.5">
          <span className="text-[13px] font-medium tabular-nums">{meta.count}</span>
          <span className="text-[11px] text-muted-foreground">{meta.label}</span>
        </div>
      )}

      <div className="relative mt-4 flex-1">{children}</div>

      {footer && <div className="relative mt-5 flex justify-end">{footer}</div>}

      {to && !footer && (
        <div className="relative mt-5 flex justify-end">
          <button
            onClick={() => navigate(to)}
            className="group flex items-center gap-1.5 rounded-full bg-foreground py-1.5 pl-3.5 pr-2.5 text-[11px] font-medium text-background shadow-whisper transition-opacity hover:opacity-85"
          >
            Voir le détail
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}

// Briques de contenu partagées par la Vue d'ensemble et la Synthèse retraite :
// gros chiffres en Inter 300, « € » réduit et grisé, lignes à pastille sur filet.
export function DashEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted-foreground">{children}</p>;
}

export function DashFigure({ value, size = 40, unit = '€', suffix }: { value: number; size?: number; unit?: string; suffix?: string }) {
  return (
    <span className="font-light leading-none tabular-nums" style={{ fontSize: size, letterSpacing: '-0.03em' }}>
      {value < 0 ? '−' : ''}{Math.round(Math.abs(value)).toLocaleString('fr-FR')}
      <span className="ml-1 text-[0.38em] font-normal text-ash" style={{ letterSpacing: 0 }}>{unit}{suffix && ` ${suffix}`}</span>
    </span>
  );
}

export function DashRow({ label, value, count, dot, muted }: { label: React.ReactNode; value: React.ReactNode; count?: number; dot?: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2 text-[12px]">
      <span className="flex min-w-0 items-center gap-2.5 text-muted-foreground">
        <span className="h-3 w-3 shrink-0 rounded-full border border-input p-[2px]">
          {dot && <span className="block h-full w-full rounded-full" style={{ background: dot }} />}
        </span>
        <span className="truncate">{label}</span>
        {count !== undefined && <span className="text-[12px] tabular-nums text-ash">{count}</span>}
      </span>
      <span className={cn('shrink-0 font-medium tabular-nums', muted && 'text-ash')}>{value}</span>
    </div>
  );
}

// Bande « code-barres » : `ratio` (0–1) des traits remplis, à l'encre ou en cendre.
export function DashTickStrip({ ratio, lead = true, ticks = 28 }: { ratio: number; lead?: boolean; ticks?: number }) {
  const filled = Math.max(0, Math.min(ticks, Math.round(ratio * ticks)));
  return (
    <div className="flex h-3 items-end gap-[2px]">
      {Array.from({ length: ticks }, (_, i) => (
        <span
          key={i}
          className="flex-1 rounded-full"
          style={{
            height: i < filled ? '100%' : '45%',
            background: i < filled ? (lead ? DASH_INK : DASH_MUTED) : DASH_TRACK,
          }}
        />
      ))}
    </div>
  );
}

// Orbite d'icônes + pastille « Contenu à venir », pour les contenus pas encore branchés.
export function DashOrbit({ center: Center, satellites }: { center: LucideIcon; satellites: LucideIcon[] }) {
  const pos = ['left-1/2 top-0 -translate-x-1/2', 'right-0 top-1/2 -translate-y-1/2', 'left-1/2 bottom-0 -translate-x-1/2', 'left-0 top-1/2 -translate-y-1/2'];
  return (
    <div className="relative mx-auto h-24 w-24">
      <div className="absolute inset-3 rounded-full border border-dashed border-ash/60" />
      <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-whisper">
        <Center className="h-4 w-4" strokeWidth={1.75} />
      </div>
      {satellites.slice(0, 4).map((Icon, i) => (
        <div key={i} className={`absolute flex h-7 w-7 items-center justify-center rounded-full bg-background/80 ${pos[i]}`}>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        </div>
      ))}
    </div>
  );
}

export function DashSoonChip({ children = 'Contenu à venir' }: { children?: React.ReactNode }) {
  return (
    <div className="mx-auto mt-3 w-fit rounded-full bg-background px-3 py-1 text-[10px] text-muted-foreground">
      {children}
    </div>
  );
}

// Encart blanc fileté posé sur la plaque taupe (ex. Actifs / Passifs).
export function DashInset({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl bg-background px-3 py-2 text-[11px] shadow-[inset_0_0_0_1px_hsl(var(--border))]', className)}>
      {children}
    </div>
  );
}
