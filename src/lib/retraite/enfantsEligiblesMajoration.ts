import { FamilyLink } from '@/services/familyService';

/**
 * Nombre d'enfants éligibles à `majorationTroisEnfants()` /
 * `majorationEnfantsFonctionPublique()` (référentiel §3.8), cas courant
 * uniquement : filiation directe (naissance, reconnaissance, possession
 * d'état) ou adoption **plénière** — jamais adoption simple.
 *
 * ⚠️ L'adoption simple relève de la branche « enfant recueilli sans
 * filiation » du référentiel (condition de 9 ans de charge avant le 16e
 * anniversaire), pas du cas courant — elle est donc explicitement exclue
 * ici. Correctif par rapport à une lecture antérieure erronée du référentiel
 * (`docs/audit/implementation-majoration-enfants.md` §0/§4, qui avait à tort
 * mêlé adoption simple et plénière dans le même panier « cas courant » en
 * résumé, alors que son propre §4 les distinguait déjà correctement) — cf.
 * `docs/audit/branchement-majorations-pension-finale.md` §1.c.
 *
 * `enfant_adopte` non renseigné (`undefined`) est traité comme filiation
 * directe (valeur par défaut du formulaire : `'Non'`), pas comme exclu.
 */
export function nombreEnfantsEligiblesMajorationTroisEnfants(familyLinks: FamilyLink[]): number {
  return familyLinks.filter(
    (lien) => lien.lien_familial === 'Enfant' && lien.enfant_adopte !== 'Adoption simple'
  ).length;
}

/** Enfant vu par la majoration Agirc-Arrco pour enfant à charge. */
export interface EnfantAgircArrco {
  /** ISO `AAAA-MM-JJ`, `null` si inconnue (enfant alors non compté). */
  dateNaissance: string | null;
  /** `handicap` de `family_links` (l'antériorité de l'invalidité à 21 ans n'est pas saisie). */
  invalide: boolean;
  /**
   * `enfant_a_charge` de `family_links`, utilisé faute de mieux pour la
   * condition « étudiant, apprenti ou demandeur d'emploi non indemnisé » de
   * 18 à 25 ans (aucun champ dédié).
   */
  aChargeApres18Ans: boolean;
}

export function enfantsAgircArrco(familyLinks: FamilyLink[]): EnfantAgircArrco[] {
  return familyLinks
    .filter((lien) => lien.lien_familial === 'Enfant' && !lien.est_decede)
    .map((lien) => ({
      dateNaissance: lien.date_naissance ?? null,
      invalide: lien.handicap === true,
      aChargeApres18Ans: lien.enfant_a_charge === true,
    }));
}

/** Âge en années révolues à une date, à partir d'une date ISO. */
function ageRevolu(dateNaissanceIso: string, date: Date): number | null {
  const [a, m, j] = dateNaissanceIso.split('-').map(Number);
  if (!a || !m || !j) return null;
  let age = date.getFullYear() - a;
  if (date.getMonth() + 1 < m || (date.getMonth() + 1 === m && date.getDate() < j)) age -= 1;
  return age;
}

/**
 * Nombre d'enfants à charge à la date d'effet au sens Agirc-Arrco (Fidroit
 * §5.5.1.2) : nés avant la date d'effet et âgés de moins de 18 ans, ou de 18
 * à 25 ans et encore à charge, ou invalides quel que soit l'âge. Notion
 * distincte de la charge fiscale.
 */
export function nombreEnfantsAChargeAgircArrco(enfants: EnfantAgircArrco[], dateEffet: Date): number {
  return enfants.filter((enfant) => {
    if (!enfant.dateNaissance) return false;
    const age = ageRevolu(enfant.dateNaissance, dateEffet);
    if (age === null || age < 0) return false;
    if (enfant.invalide) return true;
    if (age < 18) return true;
    return age < 26 && enfant.aChargeApres18Ans;
  }).length;
}
