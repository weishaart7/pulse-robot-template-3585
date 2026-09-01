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

/**
 * Nombre d'enfants éligibles à la majoration familiale **Agirc-Arrco**
 * (`majorationEnfantsAgircArrco()` dans calcul.ts).
 *
 * ⚠️ Fonction DISTINCTE de `nombreEnfantsEligiblesMajorationTroisEnfants()`
 * ci-dessus, et non un simple alias : le critère Agirc-Arrco (« enfants nés
 * ou élevés ») est **plus large** que celui du régime général. Réutiliser le
 * compteur du régime général sous-évaluerait la majoration Agirc-Arrco.
 * Différence concrète : l'**adoption simple** est exclue du cas courant du
 * régime général (elle relève de la branche « enfant recueilli », condition
 * de 9 ans de charge) mais établit bien une filiation légale, donc compte
 * ici au titre des enfants « nés ».
 *
 * Critère « nés » — implémenté : filiation légalement établie (naissance,
 * reconnaissance, adoption simple **ou** plénière).
 *
 * ⚠️ Critère « élevés » — NON implémenté, faute de donnée : un enfant sans
 * filiation élevé au moins 9 ans avant son 16e anniversaire (enfant du
 * conjoint, enfant recueilli) ouvre droit à la majoration Agirc-Arrco, mais
 * `FamilyLink` ne porte ni type de lien « enfant recueilli », ni durée de
 * prise en charge. Ces enfants ne sont donc pas comptés : la majoration est
 * SOUS-évaluée dans ce cas, jamais sur-évaluée. Même lacune structurelle que
 * la branche « enfant recueilli » du régime général, déjà documentée.
 *
 * `dateDepart` : la situation des enfants s'apprécie à la date de départ en
 * retraite — un enfant né APRÈS cette date n'est pas pris en compte. Un
 * enfant dont la date de naissance est inconnue est conservé : l'absence de
 * date ne permet pas d'établir qu'il est né après, et `date_naissance` est
 * un champ optionnel fréquemment vide sur les fiches existantes.
 */
export function nombreEnfantsEligiblesMajorationAgircArrco(
  familyLinks: FamilyLink[],
  dateDepart: Date
): number {
  return familyLinks.filter((lien) => {
    if (lien.lien_familial !== 'Enfant') {
      return false;
    }
    if (!lien.date_naissance) {
      return true;
    }
    const naissance = new Date(lien.date_naissance);
    if (Number.isNaN(naissance.getTime())) {
      return true;
    }
    return naissance.getTime() <= dateDepart.getTime();
  }).length;
}
