// Adapté de rare-ui « gooey-nav » (swamimalode07/rare-ui) : version sans Next.js (pas de
// liens de route, onglets contrôlés), couleurs et arrondis alignés sur le design system.
// L'onglet actif se détache de la barre ; un « col » visqueux s'étire puis se rompt entre eux.

import { useEffect, useId, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

// Ressort amorti, sans dépassement.
const SPRING = { type: "spring", stiffness: 200, damping: 28, mass: 1 } as const;

// Le col est rompu une fois l'écart ouvert à cette fraction de l'espacement.
const NECK_BREAK = 0.22;

// Hauteur nominale du viewBox ; le svg s'étire à la hauteur réelle de la tuile.
const NECK_H = 100;

const FADE_IN = "transition-colors duration-[400ms]";
const FADE_OUT = "transition-colors duration-0";

// Barre pierre (un cran plus soutenu que le taupe) ; le col reprend la même couleur via currentColor.
const BAR = "bg-[#e9e5e0]";
const BAR_TEXT = "text-[#e9e5e0]";

const SIZES = {
  sm: { label: "gap-1.5 px-[11px] py-2 text-[14px] leading-5 [&_svg]:size-3.5", radius: 6, separation: 12 },
  md: { label: "gap-2 px-4 py-2.5 text-[13px] leading-5 [&_svg]:size-4", radius: 8, separation: 18 },
} as const;

export type GooeyNavSize = keyof typeof SIZES;

export type GooeyNavItem = { id: string; label: string; icon?: ReactNode };

export type GooeyNavProps = {
  items: GooeyNavItem[];
  value: string;
  onValueChange: (id: string) => void;
  size?: GooeyNavSize;
  /** Fond de l'onglet actif (défaut : encre). */
  activeColor?: string;
  /** Texte de l'onglet actif (défaut : eggshell). */
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
      className={cn("relative", className)}
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
  activeColor = "hsl(var(--foreground))",
  activeLabelColor = "hsl(var(--background))",
  className,
  ...props
}: GooeyNavProps) {
  const reduced = useReducedMotion() ?? false;
  const found = items.findIndex((item) => item.id === value);
  const active = found === -1 ? 0 : found;
  const span = SIZES[size].separation;
  const corner = SIZES[size].radius;

  const open = (seam: number) => seam === 0 || seam === items.length || seam - 1 === active || seam === active;
  const fill = (i: number) => (i === active ? activeColor : "currentColor");

  return (
    <nav className={cn("max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)} {...props}>
      <ul className="flex w-max items-center" role="tablist">
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
              className={cn(BAR, isActive ? FADE_IN : FADE_OUT)}
              style={{ backgroundColor: isActive ? activeColor : undefined }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onValueChange(item.id)}
                className={cn(
                  "flex cursor-pointer items-center whitespace-nowrap font-medium outline-none [&_svg]:shrink-0",
                  "focus-visible:ring-1 focus-visible:ring-ring rounded-[inherit]",
                  isActive ? FADE_IN : cn(FADE_OUT, "text-[#44403b] hover:text-foreground"),
                  SIZES[size].label,
                )}
                style={isActive ? { color: activeLabelColor } : undefined}
              >
                {item.icon}
                {item.label}
              </button>
            </Segment>
          );
        })}
      </ul>
    </nav>
  );
}
