import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Cartes de la Vue d'ensemble — croisement de deux références Rondesignlab :
// Ledgerix (fond blanc, filets fins, gros chiffres noirs, graphiques « code-barres »,
// carré lime) et Creator Finance (plaque grise dépolie en dégradé flou, chiffres
// en matrice de points, pastille de période, pied avec indicateurs et bouton noir).
export const DASH_ACCENT = '#a6f25c';
export const DASH_INK = '#0d1b1e';
export const DOT_FONT = { fontFamily: "'Doto', ui-monospace, monospace", fontWeight: 700 } as const;

interface DashCardProps {
  title: string;
  to?: string;
  // Pastille dépolie en haut à droite (ex. « Ce mois »), avec son petit trait indicateur.
  tag?: string;
  // Compteur en matrice de points sous le titre (ex. 5 « catégories »).
  meta?: { count: number; label: string };
  // 'mist' (défaut) : plaque dépolie en dégradé clair ; 'deep' : dégradé gris plus soutenu.
  variant?: 'mist' | 'deep';
  className?: string;
  children: React.ReactNode;
}

const BACKGROUNDS = {
  mist: 'radial-gradient(80% 60% at 25% 0%, #ffffff 0%, transparent 70%), radial-gradient(60% 60% at 100% 100%, #d3d7d8 0%, transparent 70%), linear-gradient(170deg, #f7f8f8 0%, #e6e9e9 100%)',
  deep: 'radial-gradient(70% 60% at 30% 15%, #ffffff 0%, transparent 70%), radial-gradient(60% 70% at 90% 100%, #9aa1a3 0%, transparent 70%), linear-gradient(160deg, #eceeee 0%, #c4c9ca 100%)',
};

export function DashCard({ title, to, tag, meta, variant = 'mist', className, children }: DashCardProps) {
  const navigate = useNavigate();
  return (
    <div
      className={cn(
        'relative flex flex-col overflow-hidden rounded-[22px] border border-[#0d1b1e]/[0.08] p-4',
        className,
      )}
      style={{
        fontFamily: "'Instrument Sans', 'Inter', ui-sans-serif, sans-serif",
        letterSpacing: '-0.01em',
        color: DASH_INK,
        background: BACKGROUNDS[variant],
      }}
    >
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-[13px] font-medium tracking-[-0.01em]">{title}</h3>
        {tag && (
          <span className="flex flex-col items-center rounded-full border border-[#0d1b1e]/[0.08] bg-white/60 px-3 pb-0.5 pt-1 text-[10px] text-[#0d1b1e]/70">
            {tag}
            <span className="mt-0.5 h-[1.5px] w-2.5 rounded-full bg-[#0d1b1e]/60" />
          </span>
        )}
      </div>

      {meta && (
        <div className="relative mt-2 flex items-baseline gap-2">
          <span className="text-[22px] leading-none text-[#0d1b1e]/80" style={DOT_FONT}>{meta.count}</span>
          <span className="text-[11px] text-[#0d1b1e]/45">{meta.label}</span>
        </div>
      )}

      <div className="relative mt-3 flex-1">{children}</div>

      {to && (
        <div className="relative mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: DASH_ACCENT }} />
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d1b1e]/25" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#0d1b1e]/25" />
          </div>
          <button
            onClick={() => navigate(to)}
            className="group flex items-center gap-1.5 rounded-full bg-[#0d1b1e] py-1.5 pl-3 pr-2 text-[11px] text-white/85 transition-colors hover:text-white"
          >
            Voir le détail
            <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
