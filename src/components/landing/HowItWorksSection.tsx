import { UploadCloud, BarChart3, Compass } from "lucide-react";
import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function HowItWorksSection() {
  return (
    <EditorialChecklistSection
      heading="Comment ça marche"
      paragraphs={[
        "Trois étapes suffisent pour passer d'une situation patrimoniale confuse à une vision claire, prête à guider vos décisions.",
      ]}
      items={[
        { icon: UploadCloud, color: "#007aff", label: "Vous importez votre patrimoine" },
        { icon: BarChart3, color: "#22c55e", label: "Kairos l'analyse" },
        { icon: Compass, color: "#f59e0b", label: "Vous décidez, accompagné" },
      ]}
    />
  );
}
