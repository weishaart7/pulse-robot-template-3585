import { Zap, FileText, FolderKanban, Bell } from "lucide-react";
import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ProfessionnelsSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Pour votre cabinet"
      heading="Passez votre conseil à la vitesse supérieure"
      paragraphs={[
        "Gagnez des heures sur chaque dossier : les calculs patrimoniaux et fiscaux les plus longs à produire à la main sont automatisés, fiables, prêts à présenter.",
        "Ce temps retrouvé, vous le consacrez à ce qui compte — le conseil. La relation avec votre client reste la vôtre, du premier au dernier rendez-vous.",
      ]}
      items={[
        { icon: Zap, color: "#007aff", label: "Calculs automatisés" },
        { icon: FileText, color: "#22c55e", label: "Rapports client prêts à l'emploi" },
        { icon: FolderKanban, color: "#f59e0b", label: "Suivi de tous vos dossiers" },
        { icon: Bell, color: "#ec4899", label: "Alertes fiscales et échéances" },
      ]}
    />
  );
}
