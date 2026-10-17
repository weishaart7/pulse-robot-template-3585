// Adapté de rare-ui « gooey-nav » (swamimalode07/rare-ui) : version sans Next.js (pas de
// liens de route, onglets contrôlés), couleurs et arrondis alignés sur le design system.
// L'onglet actif se détache de la barre ; un « col » visqueux s'étire puis se rompt entre eux.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

// Ressort court et souple (léger rebond) : la séparation suit le clic sans traîner.
const SPRING = { type: "spring", visualDuration: 0.38, bounce: 0.18 } as const;

// Le col est rompu une fois l'écart ouvert à cette fraction de l'espacement.
const NECK_BREAK = 0.22;

// Hauteur nominale du viewBox ; le svg s'étire à la hauteur réelle de la tuile.
const NECK_H = 100;

// Couleurs en fondu dans les deux sens (l'ancien onglet ne « saute » plus au gris).
const FADE_IN = "transition-colors duration-300 ease-out";
const FADE_OUT = "transition-colors duration-200 ease-out";

// Barre pierre claire ; le col reprend la même couleur via currentColor.
const BAR = "bg-[#f1eeea]";
const BAR_TEXT = "text-[#f1eeea]";
// Survol d'un onglet inactif : la tuile fonce d'un cran.
const BAR_HOVER = "hover:bg-[#e9e5e0]";

const SIZES = {
  sm: { label: "gap-1.5 px-[10px] py-2 text-[12.5px] min-[1440px]:text-[13px] leading-5 [&_svg]:size-3.5", radius: 2, separation: 12 },
  md: { label: "gap-2 px-4 py-2.5 text-[13px] leading-5 [&_svg]:size-4", radius: 8, separation: 18 },
} as const;

export type GooeyNavSize = keyof typeof SIZES;

/** shortLabel : libellé de repli affiché quand les libellés complets ne tiennent pas. */
export type GooeyNavItem = { id: string; label: string; shortLabel?: string; icon?: ReactNode };

export type GooeyNavProps = {
  items: GooeyNavItem[];
  value: string;
  onValueChange: (id: string) => void;
  size?: GooeyNavSize;
  /** Fond de l'onglet actif (défaut : lagon doux). */
  activeColor?: string;
  /** Texte de l'onglet actif (défaut : encre lagon). */
  activeLabelColor?: string;
  className?: string;
  "aria-label"?: string;
};

// (stop-color passe par style : un attribut de présentation ne résout pas var().)
// Deux courbes concaves qui se pincent au milieu, dessinées dans l'écart entre deux tuiles.
function neckPath(gap: number, span: number) {
  if (!Number.isFinite(gap) || !Number.isFinite(span) || gap <= 0 || span <= 0) return "";
  const waist = NECK_H * (1 - gap / (span * NECK_BREAK));
  if (waist <= 0) return "";
  const start = span - gap;
  const mid = start + gap / 2;
  return `M${start} 0 Q${mid} ${NECK_H - waist} ${span} 0 L${span} ${NECK_H} Q${mid} ${waist} ${start} ${NECK_H} Z`;
}

type SegmentProps = {
  gap: number;
  span: number;
  hasSeam: boolean;
  leftFill: string;
  rightFill: string;
  reduced: boolean;
  radii: Record<string, number>;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

function Segment({ gap, span, hasSeam, leftFill, rightFill, reduced, radii, className, style, children }: SegmentProps) {
  const marginLeft = useSpring(gap, SPRING);
  const gradientId = `gooey-neck-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    if (reduced) marginLeft.jump(gap);
    else marginLeft.set(gap);
  }, [gap, marginLeft, reduced]);

  const d = useTransform(marginLeft, (g) => neckPath(g, span));

  return (
    <motion.li
      className={cn("relative min-w-0 flex-auto", className)}
      style={{ ...style, marginLeft }}
      initial={false}
      animate={radii}
      transition={reduced ? { duration: 0 } : SPRING}
    >
      {hasSeam && (
        <svg
          aria-hidden
          width={span}
          viewBox={`0 0 ${span} ${NECK_H}`}
          preserveAspectRatio="none"
          className={cn("pointer-events-none absolute top-0 right-full h-full", BAR_TEXT)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" x2="1">
              <stop offset="0" style={{ stopColor: leftFill }} />
              <stop offset="1" style={{ stopColor: rightFill }} />
            </linearGradient>
          </defs>
          <motion.path d={d} fill={`url(#${gradientId})`} />
        </svg>
      )}
      {children}
    </motion.li>
  );
}

export function GooeyNav({
  items,
  value,
  onValueChange,
  size = "sm",
  activeColor = "#e3f3f4",
  activeLabelColor = "#16707a",
  className,
  ...props
}: GooeyNavProps) {
  const reduced = useReducedMotion() ?? false;

  // Libellés courts dès qu'un libellé complet est tronqué ; retour aux complets quand la
  // barre retrouve la largeur qui manquait (mémorisée au passage en mode court).
  const navRef = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(false);
  const fullWidthRef = useRef(0);
  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav || !items.some((item) => item.shortLabel)) return;
    const check = () => {
      const labels = [...nav.querySelectorAll<HTMLElement>("[data-gooey-label]")];
      if (!compact) {
        const missing = labels.reduce((sum, el) => sum + Math.max(0, el.scrollWidth - el.clientWidth), 0);
        if (missing > 0) {
          fullWidthRef.current = nav.clientWidth + missing + 8;
          setCompact(true);
        }
      } else if (nav.clientWidth >= fullWidthRef.current) {
        setCompact(false);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [compact, items]);
  const found = items.findIndex((item) => item.id === value);
  const active = found === -1 ? 0 : found;
  const span = SIZES[size].separation;
  const corner = SIZES[size].radius;

  const open = (seam: number) => seam === 0 || seam === items.length || seam - 1 === active || seam === active;
  const fill = (i: number) => (i === active ? activeColor : "currentColor");

  return (
    // La barre occupe toute la largeur disponible ; chaque onglet se partage l'espace et son
    // libellé se tronque au besoin, si bien qu'aucun défilement horizontal n'apparaît.
    <nav ref={navRef} className={cn("w-full", className)} {...props}>
      <ul className="flex w-full items-center" role="tablist">
        {items.map((item, i) => {
          const isActive = i === active;
          return (
            <Segment
              key={item.id}
              // les jointures fermées rentrent d'un pixel pour qu'aucun filet ne transparaisse
              gap={i === 0 ? 0 : open(i) ? span : -1}
              span={span}
              hasSeam={i > 0}
              leftFill={fill(i - 1)}
              rightFill={fill(i)}
              reduced={reduced}
              radii={{
                borderTopLeftRadius: open(i) ? corner : 0,
                borderBottomLeftRadius: open(i) ? corner : 0,
                borderTopRightRadius: open(i + 1) ? corner : 0,
                borderBottomRightRadius: open(i + 1) ? corner : 0,
              }}
              className={cn(BAR, isActive ? FADE_IN : cn(FADE_OUT, BAR_HOVER))}
              style={{ backgroundColor: isActive ? activeColor : undefined }}
            >
              <button
                type="button"
                role="tab"
                title={compact && item.shortLabel ? item.label : undefined}
                aria-selected={isActive}
                onClick={() => onValueChange(item.id)}
                className={cn(
                  "flex w-full min-w-0 cursor-pointer items-center justify-center whitespace-nowrap font-medium outline-none [&_svg]:shrink-0",
                  "focus-visible:ring-1 focus-visible:ring-ring rounded-[inherit]",
                  isActive ? FADE_IN : cn(FADE_OUT, "text-[#78716c] hover:text-foreground"),
                  SIZES[size].label,
                )}
                style={isActive ? { color: activeLabelColor } : undefined}
              >
                {item.icon}
                <span data-gooey-label className="truncate">{compact && item.shortLabel ? item.shortLabel : item.label}</span>
              </button>
            </Segment>
          );
        })}
      </ul>
    </nav>
  );
}
