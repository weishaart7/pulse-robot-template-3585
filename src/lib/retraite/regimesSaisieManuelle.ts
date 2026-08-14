/**
 * Régimes détectés sur le RIS mais exclus des paniers génériques
 * (trimestresValides / regimesPoints) côté Carriere.tsx : chacun a sa propre
 * carte de saisie manuelle dédiée (CNAVPL, fonction publique), jamais
 * auto-remplie depuis le RIS — les y inclure gonflerait à tort le panier
 * générique et, pour un utilisateur remplissant aussi la carte dédiée,
 * compterait les mêmes trimestres (ou points) deux fois (cf.
 * docs/audit/correction-double-comptage-fp-ris.md pour SRE/CNRACL, et
 * docs/audit/audit-retraite.md écart #16 pour RAFP).
 *
 * Module séparé de parseRIS.ts (qui charge pdfjs-dist au niveau module,
 * incompatible avec l'environnement de test `node` de vitest.config.ts) —
 * cette fonction est une simple prédicat sur une chaîne, sans dépendance à
 * pdf.js, pour rester testable unitairement.
 */

// Sigles courts (SRE, CNRACL, RAFP) bornés par \b : chacun est un sigle
// générique de 3-4 lettres, non délimité il matcherait n'importe quelle
// sous-chaîne — les noms complets (Service des Retraites de l'État, Caisse
// Nationale de Retraite des Agents des Collectivités Locales) sont ajoutés en
// repli, sans borne, puisqu'ils sont déjà suffisamment longs/distinctifs pour
// ne pas avoir besoin de \b. Noms officiels sourcés depuis
// docs/retraite-base-referentiel.md (§8, table des régimes de base), pas
// inventés — aucun spécimen RIS réel fonction publique n'est disponible dans
// ce dépôt (RGPD). RAFP a sa propre carte de saisie manuelle (champ « Points
// RAFP déjà accumulés » dans CarriereFonctionPublique.tsx), au même titre que
// SRE/CNRACL pour les trimestres — mais côté panier « points »
// (regimesPoints), pas « trimestres ».
const RE_REGIME_SAISIE_MANUELLE =
  /cnavpl|\bsre\b|\bcnracl\b|\brafp\b|service des retraites de l.?etat|collectivites locales/i;

/**
 * Un régime de type "trimestres" ou "points" détecté sur le RIS doit-il être
 * exclu des paniers génériques (trimestresValides / regimesPoints) côté
 * Carriere.tsx ? `nom` est normalisé (accents retirés) avant le test, même
 * précaution que `classifierTypeActivite()` dans parseRIS.ts.
 */
export function estRegimeSaisieManuelle(nom: string): boolean {
  const normalise = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return RE_REGIME_SAISIE_MANUELLE.test(normalise);
}
