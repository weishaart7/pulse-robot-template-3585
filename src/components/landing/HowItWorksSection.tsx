const steps = [
  {
    number: "01",
    title: "Vous importez votre patrimoine",
    body: "Actifs, sociétés, immobilier, passifs : vous renseignez votre situation une fois, Kairos structure le reste.",
  },
  {
    number: "02",
    title: "Kairos l'analyse",
    body: "Fiscalité, IFI, succession : les calculs se font automatiquement, à jour des règles en vigueur.",
  },
  {
    number: "03",
    title: "Vous décidez, accompagné",
    body: "Vous visualisez l'impact de chaque option avant d'agir — seul ou avec votre conseiller.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-white px-6 py-20 text-center sm:py-28">
      <div className="mx-auto max-w-[960px]">
        <h2 className="lp-display mb-14 text-[36px]">Comment ça marche</h2>

        <div className="grid gap-10 text-left sm:grid-cols-3 sm:gap-8">
          {steps.map((step) => (
            <div key={step.number}>
              <p className="mb-3 text-sm font-semibold text-[var(--lp-blue)]">
                {step.number}
              </p>
              <h3 className="mb-2 text-[18px] font-semibold text-[var(--lp-ink)]">
                {step.title}
              </h3>
              <p className="text-sm leading-[1.35] text-[var(--lp-graphite)]">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
