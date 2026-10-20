import { EditorialChecklistSection } from "./EditorialChecklistSection";

export function ProfessionnelsSection() {
  return (
    <EditorialChecklistSection
      eyebrow="Aurevia pour votre cabinet"
      tag="Productivité"
      heading={["Des heures gagnées sur chaque dossier.", "Le conseil reste le vôtre."]}
      paragraph="Les calculs patrimoniaux et fiscaux les plus longs à produire à la main sont automatisés, fiables, prêts à présenter. Le temps retrouvé, vous le consacrez à la relation client."
      items={[
        {
          title: "Calculs automatisés",
          detail: "Succession, IFI, fiscalité des revenus : les règles sont appliquées sans ressaisie, à partir des données déjà présentes dans le dossier.",
        },
        {
          title: "Rapports client prêts à l'emploi",
          detail: "Des restitutions claires, présentables telles quelles en rendez-vous, sans mise en forme à refaire.",
        },
        {
          title: "Suivi de tous vos dossiers",
          detail: "Une vue par client, structurée de la même façon d'un dossier à l'autre, pour reprendre n'importe quelle situation en quelques secondes.",
        },
        {
          title: "Alertes fiscales et échéances",
          detail: "Les points d'attention et les échéances à venir remontent d'eux-mêmes, avant qu'ils ne deviennent urgents.",
        },
      ]}
    />
  );
}
