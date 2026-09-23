import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cartes de la Vue d'ensemble — design system du simulateur (docs/design-system.md) :
// plaque taupe à plat (feature card ElevenLabs), coins 20 px, aucune ombre ni bordure,
// chiffres en Inter 300. Palette achromatique : l'encre marque l'élément principal,
// le gris cendre les éléments secondaires.
export const DASH_INK = '#0c0a09';
export const DASH_MUTED = '#a59f97';
export const DASH_TRACK = '#ddd8d2';

interface DashCardProps {
  title: string;
  to?: string;
  // Pastille de période en haut à droite (ex. « Par mois »).
  tag?: string;
  // Compteur sous le titre (ex. 5 « catégories »).
  meta?: { count: number; label: string };
  // 'default' : plaque taupe ; 'soon' : plaque pierre, pour les modules pas encore branchés.
  variant?: 'default' | 'soon';
  className?: string;
  children: React.ReactNode;
}

export function DashCard({ title, to, tag, meta, variant = 'default', className, children }: DashCardProps) {
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

      {to && (
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
