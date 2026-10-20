import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function CredibiliteSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Méthode"
      tag="Rigueur"
      heading={["Rigoureux sur le fond.", "Agréable à parcourir."]}
      paragraph="Chaque calcul de succession, d'IFI ou de fiscalité s'appuie sur des règles sourcées et testées à chaque mise à jour. Un sujet réputé aride, enfin lisible."
      variant="points"
      items={[
        {
          title: "Règles fiscales sourcées",
          detail: "Chaque règle appliquée renvoie au texte qui la fonde.",
        },
        {
          title: "Calculs testés à chaque mise à jour",
          detail: "Des scénarios de référence vérifient les résultats avant chaque mise en ligne.",
        },
        {
          title: "Aucune boîte noire",
          detail: "Le détail de chaque montant est consultable, étape par étape.",
        },
      ]}
    />
  );
}
