import { Link } from "react-router-dom";
import { FrameEyebrows, LandingFrame, SplitHeading } from "./EditorialChecklistSection";

const INCLUDED = ["Tous les modules", "Simulations illimitées", "Sans engagement"];

export function PricingSection() {
  return (
    <section id="tarifs" className="bg-[var(--lp-paper)] px-4 sm:px-6">
      <LandingFrame>
        <FrameEyebrows eyebrow="Tarifs" tag="Une seule offre" />
        <div className="px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24">
          <SplitHeading heading={["Toutes les fonctionnalités.", "Un seul prix."]} />

          <div className="mt-14 grid grid-cols-1 border border-[var(--lp-line)] bg-[var(--lp-panel)] md:grid-cols-[1.2fr_1fr]">
            <div className="flex flex-col justify-between gap-10 border-b border-[var(--lp-line)] p-6 sm:p-8 md:border-b-0 md:border-r">
              <span className="lp-mono">Abonnement mensuel</span>
              <p className="flex items-baseline gap-3 text-[var(--lp-ink)]">
                <span className="text-[72px] font-light leading-none tracking-[-0.05em] sm:text-[96px]">9,90 €</span>
                <span className="text-sm text-[var(--lp-smoke)]">/ mois</span>
              </p>
            </div>
            <div className="flex flex-col justify-between gap-8 p-6 sm:p-8">
              <ul className="flex flex-col gap-3">
                {INCLUDED.map((label) => (
                  <li key={label} className="flex items-center gap-3 text-[15px] text-[var(--lp-ink)]">
                    <span aria-hidden className="h-[7px] w-[7px] bg-[var(--lp-accent)]" />
                    {label}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/login"
                  className="rounded-[4px] bg-[var(--lp-ink)] px-5 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  S'inscrire
                </Link>
                <Link
                  to="/login"
                  className="rounded-[4px] border border-[var(--lp-ink)] px-5 py-3 text-sm font-semibold text-[var(--lp-ink)] transition-opacity hover:opacity-70"
                >
                  Voir une démo →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </LandingFrame>
    </section>
  );
}
