import { ChevronDown } from "lucide-react";
import { FrameEyebrows, LandingFrame } from "./EditorialChecklistSection";

const faqs = [
  {
    question: "Mes données sont-elles en sécurité ?",
    answer:
      "Oui. Vos données patrimoniales sont hébergées en Europe, chiffrées, et ne sont jamais partagées ni revendues à des tiers.",
  },
  {
    question: "Aurevia remplace-t-il mon conseiller ?",
    answer:
      "Non. Aurevia vous donne une vision claire pour décider par vous-même, mais un accompagnement humain reste disponible dès qu'une question dépasse l'outil.",
  },
  {
    question: "Combien de temps faut-il pour prendre en main l'outil ?",
    answer:
      "Quelques minutes pour importer votre situation et obtenir vos premiers résultats. Aucune compétence technique ou fiscale n'est requise.",
  },
  {
    question: "Aurevia est-il fait pour moi si je ne suis pas du métier ?",
    answer:
      "Oui, c'est même l'objectif : rendre le patrimoine et la fiscalité compréhensibles, que vous soyez particulier ou professionnel du conseil.",
  },
];

export function FAQSection() {
  return (
    <section className="bg-[var(--lp-paper)] px-4 pb-4 sm:px-6 sm:pb-6">
      <LandingFrame className="border-b">
        <FrameEyebrows eyebrow="FAQ" tag="Questions fréquentes" />
        <div className="grid grid-cols-1 gap-10 px-5 pt-14 pb-16 sm:px-8 sm:pt-20 sm:pb-24 md:grid-cols-[1fr_1.4fr]">
          <h2 className="lp-split-heading text-[var(--lp-ink)]">
            Vos questions,
            <span className="block text-[var(--lp-smoke)]">nos réponses.</span>
          </h2>

          <div className="border-t border-[var(--lp-line)]">
            {faqs.map((faq) => (
              <details key={faq.question} className="group border-b border-[var(--lp-line)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium text-[var(--lp-ink)] [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="max-w-[560px] pb-5 text-sm leading-[1.5] text-[var(--lp-smoke)]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </LandingFrame>
    </section>
  );
}
