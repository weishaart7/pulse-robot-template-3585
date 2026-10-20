import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ParticuliersSection() {
  return (
    <EditorialChecklistSection
      id="fonctionnalites"
      eyebrow="Aurevia pour vous"
      tag="Autonomie"
      heading={["Vos décisions patrimoniales.", "Devenez votre propre expert."]}
      paragraph="Votre situation, vos options, vos marges de manœuvre, réunies en un seul endroit clair. Et si une question dépasse l'outil, un accompagnement humain reste à portée."
      items={[
        {
          title: "Vue d'ensemble de votre patrimoine",
          detail: "Immobilier, placements financiers, sociétés, passif : chaque actif est rattaché à son détenteur et pesé dans l'ensemble, pour lire votre situation d'un coup d'œil.",
        },
        {
          title: "Simulation succession & IFI",
          detail: "Droits de succession au premier et au second décès, abattements, assiette IFI : les calculs réglementaires sont faits pour vous, scénario par scénario.",
        },
        {
          title: "Accompagnement humain disponible",
          detail: "Vous n'êtes jamais seul face à vos choix : un conseiller peut reprendre votre dossier là où l'outil s'arrête.",
        },
        {
          title: "Historique et suivi des décisions",
          detail: "Chaque évolution de votre patrimoine reste tracée, pour mesurer l'effet de vos décisions dans le temps.",
        },
      ]}
    />
  );
}
