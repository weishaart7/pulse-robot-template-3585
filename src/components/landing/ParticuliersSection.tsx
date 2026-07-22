import { Eye, Calculator, Users, History } from "lucide-react";
import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ParticuliersSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Pour vous"
      heading="Devenez votre propre expert"
      paragraphs={[
        "Prenez enfin vos décisions patrimoniales en toute connaissance de cause : votre situation, vos options, vos marges de manœuvre, réunies en un seul endroit clair.",
        "Et si une question dépasse l'outil, un accompagnement humain reste à portée — vous n'êtes jamais seul face à vos choix.",
      ]}
      items={[
        { icon: Eye, color: "#007aff", label: "Vue d'ensemble de votre patrimoine" },
        { icon: Calculator, color: "#22c55e", label: "Simulation succession & IFI" },
        { icon: Users, color: "#f59e0b", label: "Accompagnement humain disponible" },
        { icon: History, color: "#ec4899", label: "Historique et suivi des décisions" },
      ]}
    />
  );
}
