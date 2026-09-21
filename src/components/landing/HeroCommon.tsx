import { Link } from "react-router-dom";

export function HeroCommon() {
  return (
    <section
      className="relative flex min-h-[640px] w-full flex-col items-center justify-center px-6 pt-40 pb-24 text-center"
      style={{ background: "#ffffff" }}
    >
      {/* mesh background, inset from the viewport edges with rounded corners */}
      <div
        aria-hidden
        className="absolute inset-2.5 rounded-[18px] sm:inset-5"
        style={{
          backgroundImage: "url('/hero-mesh.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-[720px] flex-col items-center gap-6">
        <span
          className="-my-2 text-lg"
          style={{ color: "#0d1b1e", fontFamily: "'Schoolbell', cursive" }}
        >
          Version Beta
        </span>
        <span className="text-base font-bold text-white">{"{patrimoine, lisible}"}</span>
        <h1
          className="lp-display text-[36px] sm:text-[48px]"
          style={{
            color: "#0d1b1e",
            fontFamily: "'Instrument Sans', 'Inter', ui-sans-serif, sans-serif",
            fontWeight: 500,
          }}
        >
          Comprendre avant de <em className="italic">gérer</em>, décider avant d'
          <em className="italic">agir</em>.
        </h1>
        <div className="mt-2 flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-[4px] border border-[#0d1b1e] bg-transparent px-6 py-3.5 text-sm font-semibold text-[#0d1b1e] transition-opacity hover:opacity-70 sm:text-base"
          >
            S'inscrire
          </Link>
          <Link
            to="/login"
            className="rounded-[4px] bg-[#0d1b1e] px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] sm:text-base"
          >
            Se connecter
          </Link>
        </div>

        {/*
          Device Mockup Card (design.md) — dips into the landscape silhouette
          at the hero's bottom, as specified.
        */}
        <div
          className="mt-10 -mb-16 w-full max-w-[900px] rounded-[22px] bg-white p-3 sm:-mb-24 sm:p-4"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), var(--lp-glow)" }}
        >
          <div className="overflow-hidden rounded-[16px] bg-white">
            <img
              src="/product-preview-placeholder.svg"
              alt="Aperçu du tableau de bord Kairos"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
