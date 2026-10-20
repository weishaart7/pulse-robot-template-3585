import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export interface ChecklistItem {
  title: string;
  detail: string;
}

interface EditorialChecklistSectionProps {
  id?: string;
  /** Surtitre mono à gauche du cadre. */
  eyebrow: string;
  /** Surtitre mono à droite du cadre. */
  tag: string;
  /** Titre en deux temps : première ligne atténuée, seconde ligne encre, calée à droite. */
  heading: [string, string];
  paragraph: string;
  items: ChecklistItem[];
  /** "accordion" : volets dépliables ; "points" : colonnes à puce carrée. */
  variant?: "accordion" | "points";
}

/** Cadre fin à points d'angle, commun à toutes les sections sous le défilé de modules. */
export function LandingFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative mx-auto max-w-[1120px] border-x border-[var(--lp-line)] ${className}`}>
      {["-left-[3px]", "-right-[3px]"].map((side) => (
        <span key={side} aria-hidden className={`absolute top-0 ${side} h-[5px] w-[5px] bg-[var(--lp-line-strong)]`} />
      ))}
      {children}
    </div>
  );
}

export function FrameEyebrows({ eyebrow, tag }: { eyebrow: string; tag: string }) {
  return (
    <div className="lp-mono flex items-center justify-between border-b border-[var(--lp-line)] px-5 py-3 sm:px-8">
      <span>{eyebrow}</span>
      <span>{tag}</span>
    </div>
  );
}

export function SplitHeading({ heading }: { heading: [string, string] }) {
  return (
    <h2 className="lp-split-heading">
      <span className="block text-[var(--lp-smoke)]">{heading[0]}</span>
      <span className="block text-right text-[var(--lp-ink)]">{heading[1]}</span>
    </h2>
  );
}

export function EditorialChecklistSection({
  id,
  eyebrow,
  tag,
  heading,
  paragraph,
  items,
  variant = "accordion",
}: EditorialChecklistSectionProps) {
  const [open, setOpen] = useState(0);

  return (
    <section id={id} className="bg-[var(--lp-paper)] px-4 sm:px-6">
      <LandingFrame>
        <FrameEyebrows eyebrow={eyebrow} tag={tag} />
        <div className="px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
          <SplitHeading heading={heading} />
          <p className="lp-serif mt-10 max-w-[340px] text-[15px] leading-[1.45] text-[var(--lp-graphite)]">
            {paragraph}
          </p>

          {variant === "accordion" ? (
            <div className="mt-12 border border-[var(--lp-line)] bg-[var(--lp-panel)]">
              {items.map((item, index) => {
                const isOpen = open === index;
                return (
                  <div
                    key={item.title}
                    className="border-b border-l-[3px] border-[var(--lp-line)] transition-colors last:border-b-0"
                    style={{ borderLeftColor: isOpen ? "var(--lp-accent)" : "transparent" }}
                  >
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? -1 : index)}
                      className="flex w-full items-center justify-between gap-6 px-5 py-4 text-left text-[15px] font-medium text-[var(--lp-ink)] sm:px-6"
                    >
                      {item.title}
                      {isOpen ? <Minus className="h-4 w-4 shrink-0" /> : <Plus className="h-4 w-4 shrink-0" />}
                    </button>
                    <div
                      className="grid transition-[grid-template-rows] duration-300 ease-out"
                      style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                    >
                      <p className="overflow-hidden px-5 text-sm leading-[1.5] text-[var(--lp-smoke)] sm:px-6">
                        <span className="block max-w-[620px] pb-5">{item.detail}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ul className="mt-14 grid grid-cols-1 gap-x-10 gap-y-8 border-t border-[var(--lp-line)] pt-8 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span aria-hidden className="mt-[7px] h-[7px] w-[7px] shrink-0 bg-[var(--lp-accent)]" />
                  <div>
                    <p className="text-[15px] font-medium leading-snug text-[var(--lp-ink)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-[1.5] text-[var(--lp-smoke)]">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </LandingFrame>
    </section>
  );
}
