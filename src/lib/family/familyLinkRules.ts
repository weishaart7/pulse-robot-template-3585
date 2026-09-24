// Règles d'affichage et d'enregistrement des champs d'un membre de la famille
// selon son lien familial. Partagées par DynamicFamilyForm.tsx (champs affichés)
// et FamilyMemberFormDialog.tsx (champs enregistrés), pour qu'un champ masqué
// ne soit jamais enregistré avec une valeur saisie pour un autre type de lien.

// Branche familiale (paternelle / maternelle) requise : sans elle,
// successionLegale.ts exclut le membre de la fente.
export const LINKS_WITH_BRANCHE = ['Oncle/Tante', 'Grand-parent', 'Cousin/Cousine', 'Arrière grand-parent'];

// Champ de rattachement (enfant_de) affiché.
export const LINKS_WITH_PARENT = [
  'Enfant', 'Parent', 'Frère/Sœur', 'Oncle/Tante', 'Petit-enfant', 'Arrière petit-enfant',
  'Grand-parent', 'Arrière grand-parent', 'Neveu/Nièce', 'Petit neveu/nièce', 'Cousin/Cousine',
];

export const LINKS_WITH_ADOPTION = ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'];

// Renonciation et enfant à charge (civil / fiscal) : Enfant uniquement.
export const LINKS_WITH_CHILD_FIELDS = ['Enfant'];

export const LINKS_WITH_EXONERATION = ['Frère/Sœur'];

interface SanitizableMember {
  lien_familial?: string;
  est_decede?: boolean;
  enfant_de?: string | null;
  branche_familiale?: string | null;
  enfant_adopte?: string | null;
  adoption_simple_abattement_plein?: boolean;
  adoption_simple_motif?: string | null;
  enfant_renoncant?: boolean;
  enfant_renoncant_de?: string | null;
  enfant_a_charge?: boolean;
  fiscalement_a_charge?: boolean;
  exoneration_succession?: boolean;
  date_deces?: Date;
}

// Remet à zéro les champs sans objet pour le lien choisi (ex. « Renonçant »
// coché puis lien changé d'Enfant à Parent) et ceux devenus sans objet par
// l'état des cases (adoption non simple, non renonçant, non décédé).
export function sanitizeMemberForLink<T extends SanitizableMember>(data: T): T {
  const lien = data.lien_familial ?? '';
  const out: T = { ...data };

  if (!LINKS_WITH_PARENT.includes(lien)) out.enfant_de = null;
  if (!LINKS_WITH_BRANCHE.includes(lien)) out.branche_familiale = null;

  const adoptionApplies = LINKS_WITH_ADOPTION.includes(lien);
  if (!adoptionApplies) out.enfant_adopte = 'Non';
  if (!adoptionApplies || out.enfant_adopte !== 'Adoption simple') {
    out.adoption_simple_abattement_plein = false;
  }
  if (!out.adoption_simple_abattement_plein) out.adoption_simple_motif = null;

  if (!LINKS_WITH_CHILD_FIELDS.includes(lien)) {
    out.enfant_renoncant = false;
    out.enfant_a_charge = false;
    out.fiscalement_a_charge = false;
  }
  if (!out.enfant_renoncant) out.enfant_renoncant_de = null;

  if (!LINKS_WITH_EXONERATION.includes(lien)) out.exoneration_succession = false;
  if (!out.est_decede) out.date_deces = undefined;

  return out;
}
