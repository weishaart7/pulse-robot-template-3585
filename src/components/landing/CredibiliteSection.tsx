import { ShieldCheck, BookCheck, Sparkles, Compass } from "lucide-react";
import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function CredibiliteSection() {
  return (
    <EditorialChecklistSection
      heading="Rigoureux sur le fond, agréable à parcourir"
      paragraphs={[
        "Décidez l'esprit tranquille : chaque calcul de succession, d'IFI ou de fiscalité s'appuie sur des règles sourcées et testées à chaque mise à jour. Aucune approximation, aucune boîte noire.",
        "Un sujet réputé aride, enfin agréable à parcourir : Kairos transforme des données patrimoniales denses en une navigation claire.",
      ]}
      items={[
        { icon: ShieldCheck, color: "#007aff", label: "Règles fiscales sourcées" },
        { icon: BookCheck, color: "#22c55e", label: "Calculs testés à chaque mise à jour" },
        { icon: Sparkles, color: "#f59e0b", label: "Navigation claire et agréable" },
        { icon: Compass, color: "#ec4899", label: "Aucune boîte noire" },
      ]}
    />
  );
}
