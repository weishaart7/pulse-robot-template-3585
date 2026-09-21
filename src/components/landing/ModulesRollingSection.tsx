import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { menuItems } from "@/components/layout/navigation-items";

const MODULES = menuItems.filter((item) => item.value !== "dashboard");

const ROW_HEIGHT = 46;
const VISIBLE_ROWS = 5;
const INTERVAL_MS = 2000;
const TRANSITION_MS = 600;
const EASING = "cubic-bezier(0.7, 0.5, 0.38, 1)";
const OPACITY_BY_DISTANCE = [1, 0.55, 0.3];

const COUNT = MODULES.length;
// Liste triplée : on glisse dans la copie du milieu et on y revient sans transition quand on atteint la dernière.
const ROWS = [...MODULES, ...MODULES, ...MODULES];

export function ModulesRollingSection() {
  const [pos, setPos] = useState(COUNT);
  const [snapping, setSnapping] = useState(false);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!inView || reduced) return;
    const id = window.setInterval(() => setPos((p) => p + 1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [inView]);

  // Une fois la glissade vers la 3e copie terminée, retour invisible sur la copie du milieu.
  useEffect(() => {
    if (pos < COUNT * 2) return;
    const id = window.setTimeout(() => {
      setSnapping(true);
      setPos((p) => p - COUNT);
    }, TRANSITION_MS + 50);
    return () => window.clearTimeout(id);
  }, [pos]);

  useEffect(() => {
    if (!snapping) return;
    const id = window.setTimeout(() => setSnapping(false), 60);
    return () => window.clearTimeout(id);
  }, [snapping]);

  const half = Math.floor(VISIBLE_ROWS / 2);

  return (
    <section
      ref={rootRef}
      className="px-6 py-8 sm:py-12"
      style={{
        background:
          "linear-gradient(to bottom, var(--lp-white) 0%, var(--lp-mist) 160px, var(--lp-mist) 100%)",
      }}
    >
      <div className="mx-auto grid max-w-[880px] grid-cols-1 items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
        <h2
          className="lp-display max-w-[300px] text-[24px] lg:-ml-16 sm:text-[28px]"
          style={{
            color: "#0d1b1e",
            fontFamily: "'Instrument Sans', 'Inter', ui-sans-serif, sans-serif",
            fontWeight: 500,
          }}
        >
          Les équipes patrimoniales exigeantes utilisent Kairos pour :
        </h2>

        <div
          className="relative w-[200px] justify-self-center overflow-hidden"
          style={{ height: ROW_HEIGHT * VISIBLE_ROWS }}
          aria-label="Modules Kairos"
        >
          <ul className="sr-only">
            {MODULES.map((module) => (
              <li key={module.value}>{module.label}</li>
            ))}
          </ul>
          <ul
            aria-hidden
            className="m-0 list-none p-0"
            style={{
              transform: `translateY(${(half - pos) * ROW_HEIGHT}px)`,
              transition: snapping ? "none" : `transform ${TRANSITION_MS}ms ${EASING}`,
            }}
          >
            {ROWS.map((module, index) => {
              const distance = Math.abs(index - pos);
              return (
                <li
                  key={`${module.value}-${index}`}
                  className="flex items-center whitespace-nowrap text-[32px] font-medium leading-none"
                  style={{
                    height: ROW_HEIGHT,
                    opacity: OPACITY_BY_DISTANCE[distance] ?? 0.3,
                    color: distance === 0 ? "var(--lp-ink)" : "var(--lp-smoke)",
                    transition: snapping
                      ? "none"
                      : `opacity ${TRANSITION_MS}ms ease, color ${TRANSITION_MS}ms ease`,
                  }}
                >
                  {module.label}
                </li>
              );
            })}
          </ul>
        </div>

        <Link
          to="/login"
          className="justify-self-start rounded-[4px] border border-[#0d1b1e] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#0d1b1e] transition-opacity hover:opacity-70 sm:text-base md:justify-self-end"
        >
          S'inscrire
        </Link>
      </div>
    </section>
  );
}
