const faqs = [
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Oui. Vos données patrimoniales sont hébergées en Europe, chiffrées, et ne sont jamais partagées ni revendues à des tiers.",
  },
  {
    question: "Kairos remplace-t-il mon conseiller ?",
    answer:
      "Non. Kairos vous donne une vision claire pour décider par vous-même, mais un accompagnement humain reste disponible dès qu'une question dépasse l'outil.",
  },
  {
    question: "Combien de temps faut-il pour prendre en main l'outil ?",
    answer:
      "Quelques minutes pour importer votre situation et obtenir vos premiers résultats. Aucune compétence technique ou fiscale n'est requise.",
  },
  {
    question: "Kairos est-il fait pour moi si je ne suis pas du métier ?",
    answer:
      "Oui, c'est même l'objectif : rendre le patrimoine et la fiscalité compréhensibles, que vous soyez particulier ou professionnel du conseil.",
  },
];

export function FAQSection() {
  return (
    <section className="bg-white px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-[720px]">
        <h2 className="lp-display mb-10 text-center text-[36px]">
          Questions fréquentes
        </h2>

        <div className="flex flex-col gap-4">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-[16px] bg-[var(--lp-mist)] px-5 py-4 open:pb-4"
            >
              <summary className="cursor-pointer list-none text-[16px] font-medium text-[var(--lp-ink)]">
                {faq.question}
              </summary>
              <p className="mt-3 text-sm leading-[1.35] text-[var(--lp-graphite)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
