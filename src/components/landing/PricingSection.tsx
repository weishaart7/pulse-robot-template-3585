import { Link } from "react-router-dom";

export function PricingSection() {
  return (
    <section id="tarifs" className="bg-white px-6 py-20 text-center sm:py-24">
      <div className="mx-auto flex max-w-[640px] flex-col items-center">
        <p
          className="text-[64px] leading-none text-[var(--lp-ink)] sm:text-[80px]"
          style={{ fontFamily: "'Kode Mono', monospace", letterSpacing: "-0.12em" }}
        >
          9,90€
        </p>

        <p className="mt-8 max-w-[480px] text-base leading-[1.4] text-[var(--lp-smoke)]">
          Accédez à toutes les fonctionnalités dès votre souscription. Aucun
          engagement, vous pouvez résilier à tout moment.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/login"
            className="rounded-full bg-[var(--lp-ink)] px-8 py-4 text-base font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            S'inscrire
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-black/10 bg-white px-8 py-4 text-base font-semibold text-[var(--lp-ink)] transition-colors hover:bg-black/5"
          >
            Voir une démo
          </Link>
        </div>

        <p className="mt-6 text-sm text-[var(--lp-smoke)]">
          Sans engagement · Résiliable à tout moment · Paiement sécurisé
        </p>
      </div>
    </section>
  );
}
