import { Lock, MapPin, Ban } from "lucide-react";
import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ConfianceSection() {
  return (
    <EditorialChecklistSection
      heading="Vos données, protégées"
      paragraphs={[
        "Vos informations patrimoniales sont hébergées en Europe et ne quittent jamais l'infrastructure sécurisée de Kairos. Aucune donnée n'est revendue ni partagée à des tiers : c'est un outil de travail, pas une source de données.",
      ]}
      items={[
        { icon: Lock, color: "#007aff", label: "Données chiffrées" },
        { icon: MapPin, color: "#22c55e", label: "Hébergement en Europe" },
        { icon: Ban, color: "#ec4899", label: "Aucune revente à des tiers" },
      ]}
    />
  );
}
