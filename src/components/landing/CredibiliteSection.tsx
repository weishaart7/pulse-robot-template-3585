export function CredibiliteSection() {
  return (
    <section className="bg-[var(--lp-mist)] px-6 py-20 text-center sm:py-28">
      <div className="mx-auto max-w-[960px]">
        <h2 className="lp-display mb-10 text-[36px]">
          Rigoureux sur le fond, agréable à parcourir
        </h2>

        <div className="grid gap-10 text-left sm:grid-cols-2 sm:gap-12">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--lp-blue)]">
              Rigueur
            </p>
            <p className="text-base leading-[1.35] text-[var(--lp-graphite)]">
              Décidez l'esprit tranquille&nbsp;: chaque calcul de succession,
              d'IFI ou de fiscalité s'appuie sur des règles sourcées et
              testées à chaque mise à jour. Aucune approximation, aucune
              boîte noire.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[var(--lp-blue)]">
              Accessible
            </p>
            <p className="text-base leading-[1.35] text-[var(--lp-graphite)]">
              Comprenez sans effort un sujet réputé aride&nbsp;: Kairos
              transforme des données patrimoniales denses en une navigation
              claire, presque agréable à parcourir.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
