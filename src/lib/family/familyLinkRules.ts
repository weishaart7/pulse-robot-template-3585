import { ageEnAnnees } from '@/lib/family/age';

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

// Exonération des frères et sœurs (art. 796-0 ter CGI) : les trois conditions
// sont cumulatives et s'apprécient au jour du décès, simulé ici à la date du jour.
//  1. célibataire, veuf, divorcé ou séparé de corps ;
//  2. plus de 50 ans, ou infirmité empêchant de subvenir à ses besoins ;
//  3. domicilié avec le défunt de façon continue pendant les 5 ans précédents.
// « Plus de 50 ans » est lu comme 50 ans révolus (ageEnAnnees >= 50).
export const AGE_MIN_EXONERATION_FRERE_SOEUR = 50;

export interface ConditionsExonerationFrereSoeur {
  seul?: boolean;
  infirmite?: boolean;
  cohabitation5Ans?: boolean;
  dateNaissance?: Date | string | null;
}

export interface ResultatExonerationFrereSoeur {
  exonere: boolean;
  conditionsManquantes: string[];
}

export function evaluerExonerationFrereSoeur(
  c: ConditionsExonerationFrereSoeur,
  today: Date = new Date()
): ResultatExonerationFrereSoeur {
  const manquantes: string[] = [];
  if (!c.seul) manquantes.push('célibataire, veuf(ve), divorcé(e) ou séparé(e) de corps');

  if (!c.infirmite) {
    if (!c.dateNaissance) {
      manquantes.push('plus de 50 ans (date de naissance non renseignée) ou infirmité');
    } else if (ageEnAnnees(c.dateNaissance, today) < AGE_MIN_EXONERATION_FRERE_SOEUR) {
      manquantes.push('plus de 50 ans ou infirmité');
    }
  }

  if (!c.cohabitation5Ans) manquantes.push('domicilié avec vous depuis au moins 5 ans');

  return { exonere: manquantes.length === 0, conditionsManquantes: manquantes };
}

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
  exo_frere_soeur_seul?: boolean;
  exo_frere_soeur_infirmite?: boolean;
  exo_frere_soeur_cohabitation_5_ans?: boolean;
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

  if (!LINKS_WITH_EXONERATION.includes(lien)) {
    out.exoneration_succession = false;
    out.exo_frere_soeur_seul = false;
    out.exo_frere_soeur_infirmite = false;
    out.exo_frere_soeur_cohabitation_5_ans = false;
  }
  if (!out.est_decede) out.date_deces = undefined;

  return out;
}
