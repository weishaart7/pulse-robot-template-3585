import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function HowItWorksSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Comment ça marche"
      tag="3 étapes"
      heading={["D'une situation confuse.", "À une vision claire."]}
      paragraph="Trois étapes suffisent pour passer d'un patrimoine éparpillé à une lecture prête à guider vos décisions."
      variant="points"
      items={[
        {
          title: "01 — Vous importez votre patrimoine",
          detail: "Famille, actifs, passif, sociétés : quelques minutes de saisie guidée.",
        },
        {
          title: "02 — Aurevia l'analyse",
          detail: "Fiscalité, transmission et budget sont calculés automatiquement.",
        },
        {
          title: "03 — Vous décidez, accompagné",
          detail: "Comparez les scénarios et échangez avec un conseiller si besoin.",
        },
      ]}
    />
  );
}
