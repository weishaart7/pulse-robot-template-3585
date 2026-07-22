export function ProfessionnelsSection() {
  return (
    <section className="bg-white px-6 py-20 sm:py-28">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-12 sm:flex-row sm:items-center sm:justify-between sm:gap-16">
        <div className="max-w-[560px] text-left">
          <p className="mb-4 text-xs font-medium uppercase tracking-wider text-[var(--lp-smoke)]">
            Pour votre cabinet
          </p>
          <h2 className="lp-display mb-5 text-[36px]">
            Passez votre conseil à la vitesse supérieure
          </h2>
          <p className="text-base leading-[1.35] text-[var(--lp-graphite)]">
            Gagnez des heures sur chaque dossier&nbsp;: les calculs
            patrimoniaux et fiscaux les plus longs à produire à la main sont
            automatisés, fiables, prêts à présenter. Ce temps retrouvé, vous
            le consacrez à ce qui compte — le conseil. La relation avec votre
            client reste la vôtre, du premier au dernier rendez-vous.
          </p>
        </div>

        <div
          className="flex w-full max-w-[320px] flex-shrink-0 flex-col gap-5 rounded-[22px] bg-white p-6"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.06), var(--lp-glow)" }}
        >
          <div>
            <p className="text-[36px] font-semibold leading-none text-[var(--lp-ink)]">
              ~3h
            </p>
            <p className="mt-2 text-sm text-[var(--lp-smoke)]">
              gagnées en moyenne par dossier
            </p>
          </div>
          <div className="h-px w-full bg-[var(--lp-mist)]" />
          <div>
            <p className="text-[36px] font-semibold leading-none text-[var(--lp-ink)]">
              100%
            </p>
            <p className="mt-2 text-sm text-[var(--lp-smoke)]">
              des calculs sourcés et fiabilisés
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
