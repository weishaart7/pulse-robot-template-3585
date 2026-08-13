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
