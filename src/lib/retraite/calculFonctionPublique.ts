/**
 * Moteur de calcul de la pension fonction publique (CNRACL / SRE selon le
 * versant), en complément du régime général dans src/lib/retraite/calcul.ts.
 * Fonctions pures, sans JSX ni state React.
 *
 * Convention d'unités : comme le reste du module retraite (SAM, pensionBase,
 * pensionComplementaireAnnuelle), toutes les grandeurs ici sont annuelles.
 * Le TIB (Traitement Indiciaire Brut), naturellement mensuel dans la
 * fonction publique, doit être saisi/passé ici en équivalent annuel
 * (TIB mensuel × 12) — à la charge de l'appelant (UI), pas de cette fonction.
 *
 * La décote/surcote sur trimestres tous régimes confondus et la règle d'âge
 * générique restent gérées par calcul.ts (trimestresRequisPourGeneration,
 * decoteApplicable, decoteSurTrimestresPlafond25) — non dupliquées ici.
 * Seule la règle d'âge propre à la fonction publique (-25 % au lieu de
 * -20 %) justifie une variante locale de decoteSurAge, documentée ci-dessous.
 */

/**
 * Pension de base fonction publique = TIB annuel de référence (dernier
 * indice détenu depuis au moins 6 mois avant cessation) × 75 % (taux plein
 * fonction publique — PAS 50 % comme le régime général) × taux de
 * proratisation × (1 + décote/100).
 *
 * tauxProratisation doit être calculé en amont via tauxProratisation() de
 * calcul.ts (trimestresLiquidables / trimestresRequis, plafonné à 100 %) —
 * pas de logique dupliquée ici.
 *
 * Source : Code général de la fonction publique, art. L731 et s. ; Service
 * des Retraites de l'État.
 */
export function pensionBaseFonctionPublique(
  traitementIndiciaireBrut: number,
  tauxProratisation: number,
  decote: number
): number {
  const tauxPleinFonctionPublique = 0.75;
  const pensionBrute = traitementIndiciaireBrut * tauxPleinFonctionPublique * tauxProratisation;
  return pensionBrute * (1 + decote / 100);
}

/**
 * Décote fonction publique basée sur l'écart d'âge par rapport à l'âge
 * d'annulation de la décote (67 ans par défaut en catégorie sédentaire —
 * même valeur que le régime général, mais plafond différent : -25 % ici
 * contre -20 % dans decoteSurAge() de calcul.ts).
 *
 * Pour un départ anticipé catégorie active, ageAnnulationDecote doit être
 * saisi manuellement par l'utilisateur (pas de table de corps encodée ici —
 * voir CarriereFonctionPublique.tsx).
 *
 * ⚠️ Variante locale de decoteSurAge() de calcul.ts (le plafond -25 % côté
 * trimestres a été généralisé et déplacé dans calcul.ts en
 * decoteSurTrimestresPlafond25, réutilisable par d'autres régimes — mais la
 * règle d'âge fonction publique reste spécifique, aucune généralisation
 * demandée pour l'instant).
 */
export function decoteSurAgeFonctionPublique(
  ageDepart: number,
  ageAnnulationDecote = 67
): number {
  if (ageDepart >= ageAnnulationDecote) {
    return 0;
  }
  const ecartTrimestres = (ageDepart - ageAnnulationDecote) * 4;
  return Math.max(ecartTrimestres * 1.25, -25);
}

/**
 * Minimum garanti fonction publique (montant annuel) : plafond de
 * 1 366,35 €/mois (2026, indice majoré 227 revalorisé), soit 16 396,20 €/an,
 * atteint à carrière complète (trimestresLiquidables >= trimestresRequis),
 * réduit proportionnellement en dessous.
 *
 * Accessible à l'âge d'annulation de la décote (67 ans en catégorie
 * sédentaire, ou l'âge catégorie active saisi manuellement) — cette
 * fonction ne vérifie pas la condition d'âge, à la charge de l'appelant.
 *
 * Source : Service des Retraites de l'État, "Le minimum garanti".
 */
const MINIMUM_GARANTI_PLAFOND_MENSUEL = 1366.35;
const MINIMUM_GARANTI_PLAFOND_ANNUEL = MINIMUM_GARANTI_PLAFOND_MENSUEL * 12;

export function minimumGaranti(trimestresLiquidables: number, trimestresRequis: number): number {
  const tauxCarriere = Math.min(trimestresLiquidables / trimestresRequis, 1);
  return MINIMUM_GARANTI_PLAFOND_ANNUEL * tauxCarriere;
}

/**
 * Pension fonction publique finale : la plus favorable des deux entre la
 * pension calculée (TIB × taux plein × proratisation × décote) et le
 * minimum garanti.
 */
export function pensionFonctionPubliqueFinale(
  pensionCalculee: number,
  minimumGaranti: number
): number {
  return Math.max(pensionCalculee, minimumGaranti);
}
