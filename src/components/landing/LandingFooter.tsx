import { Link } from "react-router-dom";

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
    <footer className="bg-[var(--lp-paper)] px-2.5 pb-2.5 sm:px-5 sm:pb-5">
      <div id="a-propos" className="overflow-hidden rounded-[18px] bg-[var(--lp-night)] text-white">
        <div className="mx-auto w-full max-w-[1120px] px-6 sm:px-8">
          {/* Appel à l'action */}
          <div className="flex flex-col gap-8 border-b border-white/10 py-10 sm:py-14 md:flex-row md:items-end md:justify-between">
            <h2 className="lp-split-heading max-w-[640px]">
              <span className="block text-white/45">Comprendre avant de gérer.</span>
              <span className="block">Décider avant d'agir.</span>
            </h2>
            <div className="flex shrink-0 gap-2">
              <Link
                to="/login"
                className="rounded-[4px] bg-[var(--lp-citron)] px-5 py-3 text-sm font-semibold text-[var(--lp-ink)] transition-opacity hover:opacity-85"
              >
                S'inscrire
              </Link>
              <Link
                to="/login"
                className="rounded-[4px] border border-white/40 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-white"
              >
                Se connecter →
              </Link>
            </div>
          </div>

          {/* Liens */}
          <div className="grid gap-10 py-10 md:grid-cols-[1fr_2fr]">
            <div>
              <img
                src="/brand/aurevia-logo-complet.png"
                alt="Aurevia — Le patrimoine réinventé."
                className="h-12 w-auto"
                style={{ filter: "invert(1)", mixBlendMode: "screen" }}
              />
              <p className="mt-4 max-w-xs text-sm leading-[1.5] text-white/60">
                Un outil de gestion de patrimoine pensé pour comprendre avant de décider.
              </p>
              <div className="mt-6 flex max-w-xs border border-white/15">
                <input
                  type="email"
                  aria-label="Adresse e-mail"
                  placeholder="vous@exemple.com"
                  className="h-10 w-full bg-transparent px-3 text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="button"
                  className="lp-mono h-10 shrink-0 border-l border-white/15 px-4 !text-white transition-colors hover:bg-white/10"
                >
                  Suivre
                </button>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-10 md:grid-cols-4">
              {columns.map((col) => (
                <div key={col.title}>
                  <h3 className="lp-mono !text-white/40">{col.title}</h3>
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {col.links.map((link) => (
                      <li key={link}>
                        <a href="#" className="text-sm text-white/75 transition-colors hover:text-white">
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          <div className="lp-mono flex flex-col justify-between gap-3 border-t border-white/10 py-5 !text-white/40 sm:flex-row">
            <span>© {new Date().getFullYear()} Aurevia</span>
            <span>Hébergé en France</span>
          </div>
        </div>

        {/* Signature géante, rognée en bas comme sur fin.ai */}
        <p
          aria-hidden
          className="-mb-[0.22em] select-none text-center font-medium leading-none tracking-[-0.06em] text-white/[0.06]"
          style={{ fontSize: "clamp(72px, 15vw, 210px)", fontFamily: "'Instrument Sans', 'Inter', sans-serif" }}
        >
          Aurevia
        </p>
      </div>
    </footer>
  );
}
