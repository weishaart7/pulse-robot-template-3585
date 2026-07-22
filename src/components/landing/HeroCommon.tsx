import { Link } from "react-router-dom";

export function HeroCommon() {
  return (
    <section
      className="relative flex min-h-[640px] w-full flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-24 text-center"
      style={{ background: "var(--lp-gradient)" }}
    >
      <div className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center gap-6">
        <p className="text-sm font-medium tracking-tight text-white/80">
          Gestion de patrimoine
        </p>
        <h1 className="lp-display text-white text-[36px] sm:text-[48px]">
          Votre patrimoine, enfin lisible.
          <br />
          Comprendre avant de gérer, décider avant d'agir.
        </h1>
        <p className="max-w-[560px] text-base leading-[1.35] text-white/90">
          Kairos éclaire votre patrimoine dans son ensemble — actifs, fiscalité,
          transmission — pour que chaque décision s'appuie sur une vision
          claire, pas sur des suppositions.
        </p>
        <Link
          to="/login"
          className="mt-2 rounded-[50px] bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] sm:text-base"
        >
          Se connecter
        </Link>

        {/*
          Device Mockup Card (design.md) — dips into the landscape silhouette
          at the hero's bottom, as specified.
          TODO(design): remplacer /product-preview-placeholder.svg par une
          vraie capture d'écran de l'app (ex: public/product-preview.png),
          puis mettre à jour le src ci-dessous.
        */}
        <div
          className="mt-10 -mb-16 w-full max-w-[900px] rounded-[22px] bg-white p-3 sm:-mb-24 sm:p-4"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), var(--lp-glow)" }}
        >
          <div className="overflow-hidden rounded-[16px] bg-[var(--lp-mist)]">
            <img
              src="/product-preview-placeholder.svg"
              alt="Aperçu du tableau de bord Kairos"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* landscape silhouette, bottom ~18% of the hero */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[18%] w-full"
        viewBox="0 0 1200 160"
        preserveAspectRatio="none"
      >
        <path
          d="M0,160 L0,90 L120,60 L220,100 L340,50 L460,95 L600,40 L740,100 L860,65 L980,105 L1080,55 L1200,90 L1200,160 Z"
          fill="rgba(20,15,20,0.35)"
        />
        <path
          d="M0,160 L0,120 L150,95 L300,130 L480,85 L650,125 L820,90 L1000,135 L1200,110 L1200,160 Z"
          fill="rgba(15,10,15,0.5)"
        />
      </svg>
    </section>
  );
}
