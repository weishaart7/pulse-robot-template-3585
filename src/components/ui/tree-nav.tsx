import * as React from "react";
import { animate, motion, useMotionValue, useTransform, useVelocity } from "motion/react";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/ui/tree-nav-utils/use-typewriter";

export interface TreeNavItem {
  label: string;
  href: string;
  /** Small pill after the label, e.g. "New". */
  badge?: string;
  /** Opens in a new tab. */
  external?: boolean;
}

type LinkComponent =
  | "a"
  | React.ComponentType<
      React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    >;

export interface TreeNavProps {
  items: TreeNavItem[];
  /** href of the current page; the marker and background rest on this row. */
  activeHref?: string;
  /** Slide the marker and background to the hovered row and spring back on leave. */
  followHover?: boolean;
  /** Element used for links. Defaults to a plain anchor. */
  linkComponent?: LinkComponent;
  /**
   * rail : rail vertical + repère losange + fond léger (défaut).
   * thread : fil vertical fin ; un court segment clair glisse le long du fil, s'étire pendant
   *   le déplacement et se recontracte à l'arrivée.
   */
  variant?: "rail" | "thread";
  onSelect?: (
    item: TreeNavItem,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => void;
  className?: string;
}

const ROW_H = 32;
const MARKER = 7;
/** Horizontal centre of the rail inside the 24px gutter. */
const RAIL_X = 10;

// Critically damped (no overshoot) with a ~0.3s response. Springs re-target from
// the live value and carry velocity, so sweeping the pointer never stutters.
const GLIDE = { type: "spring", visualDuration: 0.22, bounce: 0 } as const;
// Variante fil : segment de 16 px, étiré selon la vitesse (jusqu'à +28 px).
const THREAD_SEG = 16;
const THREAD_STRETCH_MAX = 28;
const THREAD_X = 1;
const FADE = { duration: 0.12, ease: "easeOut" } as const;

export function TreeNav({
  items,
  activeHref,
  followHover = true,
  linkComponent: Link = "a",
  variant = "rail",
  onSelect,
  className,
}: TreeNavProps) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const centersRef = React.useRef<number[]>([]);
  const hoveredRef = React.useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const activeIndex = items.findIndex((item) => item.href === activeHref);
  const reducedRef = React.useRef(reduced);
  const activeRef = React.useRef(activeIndex);
  React.useLayoutEffect(() => {
    reducedRef.current = reduced;
    activeRef.current = activeIndex;
  });

  const isThread = variant === "thread";
  const [hovered, setHovered] = React.useState<number | null>(null);
  const [end, setEnd] = React.useState(0);
  const [measured, setMeasured] = React.useState(false);

  const centerY = useMotionValue(0);
  const visibility = useMotionValue(0);
  const pillY = useTransform(centerY, (v) => v - ROW_H / 2);
  const markerY = useTransform(centerY, (v) => v - MARKER / 2);
  const velocity = useVelocity(centerY);
  const segH = useTransform(velocity, (v) =>
    THREAD_SEG + Math.min(THREAD_STRETCH_MAX, Math.abs(v) * 0.08),
  );
  const segY = useTransform([centerY, segH], ([c, h]: number[]) => c - h / 2);
  const accentScale = useTransform(centerY, (v) =>
    end > 0 ? Math.min(1, v / end) : 0,
  );

  const moveTo = React.useCallback(
    (index: number | null, immediate = false) => {
      const centers = centersRef.current;
      if (index === null || index < 0 || index >= centers.length) {
        animate(visibility, 0, FADE);
        return;
      }
      const target = centers[index];
      const jump = immediate || reducedRef.current || visibility.get() < 0.05;
      if (jump) centerY.jump(target);
      else animate(centerY, target, GLIDE);
      animate(visibility, 1, FADE);
    },
    [centerY, visibility],
  );

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const next = rowRefs.current
        .slice(0, items.length)
        .map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0));
      centersRef.current = next;
      setEnd(next.length > 0 ? next[next.length - 1] : 0);
      setMeasured(true);
      moveTo(hoveredRef.current ?? activeRef.current, true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length, moveTo]);

  React.useEffect(() => {
    if (hoveredRef.current === null) moveTo(activeIndex);
  }, [activeIndex, moveTo]);

  const enter = (index: number) => {
    if (!followHover) return;
    hoveredRef.current = index;
    setHovered(index);
    moveTo(index);
  };
  const leave = () => {
    if (!followHover) return;
    hoveredRef.current = null;
    setHovered(null);
    moveTo(activeRef.current);
  };

  return (
    <ul
      ref={listRef}
      className={cn("relative flex flex-col gap-0.5", isThread ? "ps-2" : "ps-6", className)}
      onPointerLeave={leave}
    >
      {isThread && (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-[3px]">
          <span className="absolute inset-y-0 w-px bg-border" style={{ insetInlineStart: THREAD_X }} />
          <motion.span
            className="absolute top-0 w-[3px] rounded-full bg-foreground will-change-transform"
            style={{ insetInlineStart: THREAD_X - 1, height: segH, y: segY, opacity: visibility }}
          />
        </span>
      )}
      {!isThread && (
      <span aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-5">
        <span
          className="absolute top-0 w-px bg-border"
          style={{ insetInlineStart: RAIL_X - 0.5, height: end }}
        />
        <span
          className="absolute size-1 rounded-full bg-border"
          style={{ insetInlineStart: RAIL_X - 2, top: end - 2 }}
        />
        <motion.span
          className="absolute top-0 w-px origin-top bg-foreground will-change-transform"
          style={{
            insetInlineStart: RAIL_X - 0.5,
            height: end,
            scaleY: accentScale,
            opacity: visibility,
          }}
        />
        <motion.span
          className="absolute top-0 rounded-[1px] bg-foreground will-change-transform"
          style={{
            insetInlineStart: RAIL_X - MARKER / 2,
            width: MARKER,
            height: MARKER,
            y: markerY,
            rotate: 45,
            opacity: visibility,
          }}
        />
      </span>
      )}

      {!isThread && (
      <motion.span
        aria-hidden
        className="pointer-events-none absolute end-0 start-6 top-0 rounded-lg bg-foreground/[0.05] will-change-transform"
        style={{ height: ROW_H, y: pillY, opacity: visibility }}
      />
      )}

      {items.map((item, index) => {
        const isActive = index === activeIndex;
        // En fil, l'entrée repérée (survolée, sinon active) passe en encre.
        const isLit = isThread && (hovered === null ? isActive : index === hovered);
        return (
          <li
            key={item.href}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className="relative"
            onPointerEnter={() => enter(index)}
          >
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={onSelect ? (event) => onSelect(item, event) : undefined}
              onFocus={() => enter(index)}
              onBlur={leave}
              className={cn(
                "flex h-8 items-center gap-2 rounded-lg px-3 text-[13px] leading-5 antialiased outline-none transition-colors duration-150 ease-out",
                isActive && !measured && !isThread && "bg-foreground/[0.05]",
                isThread
                  ? cn(isActive && "font-medium", isLit ? "text-foreground" : "text-muted-foreground")
                  : isActive
                    ? "font-medium text-foreground"
                    : "font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="inline-flex h-[18px] shrink-0 items-center rounded-[6px] bg-primary/10 px-[5px] text-xs font-medium leading-none text-primary">
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default TreeNav;
