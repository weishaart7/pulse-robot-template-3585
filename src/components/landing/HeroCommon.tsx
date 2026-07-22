import { Link } from "react-router-dom";

export function HeroCommon() {
  return (
    <section
      className="relative flex min-h-[640px] w-full flex-col items-center justify-center overflow-hidden px-6 pt-32 pb-24 text-center"
      style={{ background: "var(--lp-gradient)" }}
    >
      <div className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center gap-6">
        <h1
          className="lp-display text-[36px] sm:text-[48px]"
          style={{
            color: "#ffffff",
            fontFamily: "'DM Serif Display', 'Playfair Display', serif",
            fontWeight: 400,
          }}
        >
          Votre patrimoine, enfin <em className="italic">lisible</em>.
          <br />
          Comprendre avant de <em className="italic">gérer</em>, décider avant d'
          <em className="italic">agir</em>.
        </h1>
        <p className="max-w-[560px] text-base leading-[1.35] text-white">
          Kairos éclaire votre patrimoine dans son ensemble — actifs, fiscalité,
          transmission — pour que chaque décision s'appuie sur une vision
          claire, pas sur des suppositions.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-[4px] border border-white bg-transparent px-6 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-80 sm:text-base"
          >
            S'inscrire
          </Link>
          <Link
            to="/login"
            className="rounded-[4px] bg-white px-6 py-3.5 text-sm font-semibold text-black transition-transform hover:scale-[1.02] sm:text-base"
          >
            Se connecter
          </Link>
        </div>

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

      {/* landscape photo, set back behind the gradient — fades in from the sky */}
      <img
        src="/hero-background.png"
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[65%] w-full object-cover object-bottom opacity-50"
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 45%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 45%)",
        }}
      />

      {/* blends the hero's bottom edge into the mist canvas of the next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 sm:h-44"
        style={{
          background: "linear-gradient(to bottom, transparent, var(--lp-mist))",
        }}
      />
    </section>
  );
}
