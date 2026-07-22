import { Link } from "react-router-dom";
import { RuixenGradientFooter } from "@/components/ui/ruixen-gradient-footer";

const columns = [
  {
    title: "Produit",
    links: ["Vue d'ensemble", "Patrimoine", "Fiscalité", "Transmission"],
  },
  {
    title: "Ressources",
    links: ["Documentation", "Guides", "Support", "Statut"],
  },
  { title: "Société", links: ["À propos", "Carrières", "Blog", "Contact"] },
  { title: "Légal", links: ["Confidentialité", "CGU", "Sécurité", "Cookies"] },
];

export function LandingFooter() {
  return (
    <RuixenGradientFooter gradientHeight="40vh" minReveal={0} className="bg-[var(--lp-mist)]">
      <div className="mx-auto w-full max-w-[1200px] px-6 pt-12">
        <div className="grid gap-10 pb-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-[var(--lp-ink)]">
              <span
                aria-hidden
                className="h-5 w-5 rounded-full"
                style={{
                  background:
                    "linear-gradient(180deg, #4a7ff2 0%, #c98ab5 100%)",
                }}
              />
              <span className="font-mono text-sm uppercase tracking-widest">
                Kairos
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-[var(--lp-smoke)]">
              Un outil de gestion de patrimoine pensé pour comprendre avant de
              décider.
            </p>

            <div className="mt-6 flex max-w-xs gap-2">
              <input
                type="email"
                aria-label="Adresse e-mail"
                placeholder="vous@exemple.com"
                className="h-9 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm text-[var(--lp-ink)] placeholder:text-[var(--lp-smoke)] focus:border-[var(--lp-ink)]/40 focus:outline-none"
              />
              <button
                type="button"
                className="h-9 shrink-0 rounded-md bg-[var(--lp-ink)] px-3 font-mono text-xs uppercase tracking-wider text-white transition-opacity hover:opacity-90"
              >
                Suivre
              </button>
            </div>
          </div>

          <nav className="grid grid-cols-2 gap-10 font-mono text-xs uppercase tracking-wider md:grid-cols-4 lg:col-span-4">
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="text-[var(--lp-ink)]">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[var(--lp-smoke)] transition-colors hover:text-[var(--lp-ink)]"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-black/10 pt-6 pb-2 font-mono text-xs uppercase tracking-wider text-[var(--lp-smoke)] sm:flex-row">
          <span>© {new Date().getFullYear()} Kairos</span>
          <Link
            to="/login"
            className="text-[var(--lp-ink)] transition-colors hover:opacity-70"
          >
            Se connecter
          </Link>
          <span>France</span>
        </div>
      </div>
    </RuixenGradientFooter>
  );
}
