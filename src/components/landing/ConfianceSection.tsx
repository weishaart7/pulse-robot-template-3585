import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ConfianceSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Sécurité"
      tag="Confidentialité"
      heading={["Vos données restent les vôtres.", "Hébergées en Europe."]}
      paragraph="Vos informations patrimoniales ne quittent jamais l'infrastructure sécurisée d'Aurevia. C'est un outil de travail, pas une source de données."
      variant="points"
      items={[
        { title: "Données chiffrées", detail: "En transit comme au repos." },
        { title: "Hébergement en Europe", detail: "Infrastructure située en France, soumise au RGPD." },
        { title: "Aucune revente à des tiers", detail: "Vos données ne sont ni partagées ni exploitées commercialement." },
      ]}
    />
  );
}
