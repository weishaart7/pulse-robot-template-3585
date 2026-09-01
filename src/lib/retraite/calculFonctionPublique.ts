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
 * Seule la règle d'âge propre à la fonction publique justifie une variante
 * locale de decoteSurAge, documentée ci-dessous.
 */

import { decoteApplicable, decoteSurTrimestresPlafond25 } from './calcul';

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
 * Taux de décote par trimestre manquant, fonction publique, selon l'année
 * d'ouverture des droits (référentiel §7.3) — barème figé au millésime de
 * l'année où l'agent réunit la condition d'âge (ou de durée) ouvrant droit à
 * pension, **distinct de la date d'effet** (l'année de liquidation
 * effective) : un agent ayant ouvert ses droits en 2014 conserve 1,125 %
 * même s'il liquide sa pension en 2015 ou après.
 *
 * | Année d'ouverture des droits | Taux par trimestre |
 * |---|---|
 * | 2011 (et avant, par repli) | 0,75 % |
 * | 2012 | 0,875 % |
 * | 2013 | 1 % |
 * | 2014 | 1,125 % |
 * | 2015 et au-delà | 1,25 % |
 *
 * `anneeOuvertureDroits` est une saisie déclarative (champ libre, conseiller)
 * — cet outil ne calcule pas l'année d'ouverture des droits à partir de la
 * date de naissance/carrière (le référentiel qualifie lui-même cette donnée
 * de non triviale à déduire). `undefined` (champ non renseigné) retombe sur
 * 1,25 %, soit le comportement historique de cette fonction avant
 * l'introduction du barème — pas de régression pour un utilisateur qui ne
 * renseigne pas ce champ.
 */
export function tauxDecoteParTrimestreFonctionPublique(anneeOuvertureDroits?: number): number {
  if (anneeOuvertureDroits === undefined) return 1.25;
  if (anneeOuvertureDroits <= 2011) return 0.75;
  if (anneeOuvertureDroits === 2012) return 0.875;
  if (anneeOuvertureDroits === 2013) return 1;
  if (anneeOuvertureDroits === 2014) return 1.125;
  return 1.25;
}

/**
 * Décote fonction publique basée sur l'écart d'âge par rapport à l'âge
 * d'annulation de la décote (67 ans par défaut en catégorie sédentaire —
 * même valeur que le régime général ; le plafond -25 % est désormais commun
 * aux deux, decoteSurAge() de calcul.ts ayant été aligné).
 *
 * Pour un départ anticipé catégorie active, ageAnnulationDecote doit être
 * saisi manuellement par l'utilisateur (pas de table de corps encodée ici —
 * voir CarriereFonctionPublique.tsx) : l'âge d'annulation variant par
 * catégorie (67 ans sédentaire, 62 ans active, 57 ans super-active,
 * référentiel §7.3) n'est donc pas un écart au référentiel — le paramètre
 * est déjà libre, sans valeur unique supposée.
 *
 * `tauxParTrimestre` : taux de décote par trimestre manquant (référentiel
 * §7.3), par défaut 1,25 % — voir
 * `tauxDecoteParTrimestreFonctionPublique()` pour le barème par année
 * d'ouverture des droits.
 *
 * ⚠️ Variante locale de decoteSurAge() de calcul.ts. Ce qui la justifie
 * n'est plus le plafond (identique, -25 % des deux côtés depuis
 * l'unification) mais le paramétrage propre à la fonction publique : âge
 * d'annulation de la décote variable par catégorie et taux par trimestre
 * millésimé par année d'ouverture des droits.
 */
export function decoteSurAgeFonctionPublique(
  ageDepart: number,
  ageAnnulationDecote = 67,
  tauxParTrimestre = 1.25
): number {
  if (ageDepart >= ageAnnulationDecote) {
    return 0;
  }
  // Arrondi au trimestre supérieur (art. R. 351-27 CSS) : tout trimestre
  // entamé compte pour un trimestre plein. L'écart en mois est arrondi avant
  // la division pour absorber le bruit flottant d'un âge décimal. Règle
  // identique à `decoteSurAge()` de calcul.ts — dupliquée en 2 lignes plutôt
  // qu'exportée, le taux par trimestre millésimé restant propre à ce régime.
  const moisJusquAuTauxPlein = Math.round((ageAnnulationDecote - ageDepart) * 12);
  const ecartTrimestres = -Math.ceil(moisJusquAuTauxPlein / 3);
  return Math.max(ecartTrimestres * tauxParTrimestre, -25);
}

export interface EntreeDecoteFonctionPublique {
  trimestresLiquidables: number;
  /** Trimestres validés dans les AUTRES régimes (régime général, CNAVPL...). */
  trimestresAutresRegimes: number;
  trimestresRequis: number;
  /**
   * Âge de départ, **quel que soit le motif** (sédentaire comme catégorie
   * active). `undefined`, `null` ou `NaN` => le comptage en âge ne s'applique
   * pas et seul le comptage en trimestres joue.
   */
  ageDepart?: number | null;
  /**
   * Âge d'annulation de la décote. Non renseigné => 67 ans, valeur de la
   * catégorie sédentaire (défaut de `decoteSurAgeFonctionPublique()`).
   */
  ageAnnulationDecote?: number | null;
  /** Non renseigné => 1,25 %, cf. `tauxDecoteParTrimestreFonctionPublique()`. */
  tauxDecoteParTrimestre?: number;
}

/**
 * Décote fonction publique complète : applique la **règle du plus petit des
 * deux comptages** (art. L. 14 I CPCMR) entre le comptage en trimestres
 * (tous régimes confondus, plafond -25 %) et le comptage en âge (écart à
 * l'âge d'annulation de la décote).
 *
 * ⚠️ Cette règle vaut pour **tout** fonctionnaire, pas seulement pour un
 * départ anticipé en catégorie active : le motif du départ ne restreint pas
 * son champ d'application. Seule la disponibilité d'un âge de départ
 * conditionne le second comptage.
 *
 * Fonction unique et partagée : appelée à la fois par le moteur consolidé
 * (`pensionConsolidee.ts`) et par l'écran (`CarriereFonctionPublique.tsx`).
 * Les deux portaient auparavant une copie manuelle de cette logique, qui a
 * divergé — l'écran et le moteur doivent renvoyer la même décote pour un même
 * profil, ce que seule une implémentation unique garantit. Ne pas réintroduire
 * de calcul local chez un appelant.
 *
 * ⚠️ `decoteSurTrimestresPlafond25()` est symétrique : au-delà de
 * `trimestresRequis` elle renvoie une valeur positive qui n'est PAS une
 * surcote légitime (aucune porte d'éligibilité, aucun plafond) — écrêtée à 0
 * ici. La vraie surcote est calculée séparément par les appelants via
 * `surcoteTotale()`. Cf. docs/audit/branchement-majorations-pension-finale.md
 * §1.b. Le résultat de cette fonction est donc toujours <= 0.
 */
export function decoteFonctionPublique({
  trimestresLiquidables,
  trimestresAutresRegimes,
  trimestresRequis,
  ageDepart,
  ageAnnulationDecote,
  tauxDecoteParTrimestre,
}: EntreeDecoteFonctionPublique): number {
  const decoteTrimestres = Math.min(
    decoteSurTrimestresPlafond25(trimestresLiquidables + trimestresAutresRegimes, trimestresRequis),
    0
  );

  // `null` écarté explicitement en plus de `undefined` : ces champs viennent
  // de la base (nullable) côté moteur et d'un `parseFloat('')` (NaN) côté
  // écran — `Number.isNaN(null)` vaut `false`, un test sur le seul
  // `undefined` laisserait passer `null` jusqu'au calcul.
  if (typeof ageDepart !== 'number' || !Number.isFinite(ageDepart)) {
    return decoteTrimestres;
  }

  // Non renseigné => `undefined`, ce qui laisse `decoteSurAgeFonctionPublique()`
  // appliquer son défaut de 67 ans — pas de 67 dupliqué ici.
  const ageAnnulation =
    typeof ageAnnulationDecote === 'number' && Number.isFinite(ageAnnulationDecote)
      ? ageAnnulationDecote
      : undefined;

  return decoteApplicable(
    decoteTrimestres,
    decoteSurAgeFonctionPublique(ageDepart, ageAnnulation, tauxDecoteParTrimestre)
  );
}

/**
 * Valeur de référence du minimum garanti (traitement indiciaire brut au 1er
 * janvier 2004 de l'indice majoré 227, revalorisé) — valeur **2026 confirmée
 * par le Service des Retraites de l'État**. Exportée en constante plutôt que
 * codée en dur dans `minimumGaranti()` : cette dernière prend la valeur de
 * référence en paramètre, jamais une valeur par défaut interne.
 *
 * Remplace la valeur 2025 (1 248,33 €/mois, 14 979,96 €/an), qui était
 * retenue faute de source opposable sur 2026 — la réserve « à vérifier
 * auprès du SRE » du référentiel est levée, l'avertissement correspondant a
 * été retiré de `CarriereFonctionPublique.tsx`.
 *
 * ⚠️ L'**annuelle est la valeur de référence**, pas un dérivé de la
 * mensuelle : 1 366,35 × 12 = 16 396,20 €, soit 1 centime de plus que la
 * valeur annuelle publiée (16 396,19 €) — la mensuelle est l'arrondi au
 * centime de l'annuelle ÷ 12 (1 366,3491…). Les deux sont donc déclarées
 * séparément, sans relation de calcul entre elles. Tous les calculs de
 * pension passent par l'annuelle (le module travaille exclusivement en
 * annuel) ; la mensuelle ne sert qu'à l'affichage.
 *
 * ⚠️ À réviser à chaque revalorisation, comme les barèmes annuels du régime
 * général (cf. `MINIMUM_CONTRIBUTIF_NON_MAJORE_2026` dans calcul.ts).
 *
 * Source : Service des Retraites de l'État, "Le minimum garanti".
 */
export const VALEUR_REFERENCE_MIGA_ANNUELLE_2026 = 16396.19;
export const VALEUR_REFERENCE_MIGA_MENSUELLE_2026 = 1366.35;

/**
 * Minimum garanti fonction publique, barème par palier (référentiel §7.5,
 * art. L. 17 CPCMR) — remplace l'ancienne formule linéaire
 * (`plafond × min(trimestres/trimestresRequis, 1)`) qui sous-évaluait
 * nettement le minimum pour les carrières de 15 ans et plus (écart audité).
 *
 * `valeurReference` doit être exprimée dans la même unité que le résultat
 * souhaité (mensuelle pour un résultat mensuel, annuelle pour un résultat
 * annuel) — cette fonction ne fait aucune hypothèse d'unité, contrairement
 * au reste du module qui travaille exclusivement en annuel : à la charge de
 * l'appelant de passer `VALEUR_REFERENCE_MIGA_ANNUELLE_2026` pour rester
 * cohérent avec `pensionBaseFonctionPublique()` et
 * `pensionFonctionPubliqueFinale()`.
 *
 * `trimestresServicesEffectifs` : durée de services effectifs de l'agent
 * (pas la durée requise tous régimes) — cette fonction ne distingue pas les
 * bonifications éventuellement incluses dans les trimestres liquidables,
 * comme le reste de ce module ne le fait pas non plus ailleurs (même
 * simplification que `tauxProratisation()`/`decoteSurTrimestresPlafond25()`).
 *
 * Quatre paliers, appliqués sur la durée de services en années
 * (`trimestresServicesEffectifs / 4`, calcul continu — pas arrondi à
 * l'année inférieure, pour éviter un effet de seuil artificiel à chaque
 * anniversaire de trimestre) :
 *
 * 1. **Moins de 15 ans, hors invalidité** : `valeurReference ×
 *    trimestresServicesEffectifs / trimestresRequis` — seul palier qui
 *    dépend de la durée requise propre à la génération de l'agent, pas d'un
 *    pourcentage fixe de la valeur de référence.
 * 2. **Moins de 15 ans, invalidité** (`estInvalidite = true`) : par année de
 *    services, 1/15e de 57,5 % de la valeur de référence — ignore
 *    `trimestresRequis`, contrairement au cas général.
 * 3. **15 à 39 ans** : 57,5 % pour les 15 premières années, +2,5 points par
 *    année de 15 à 30 ans, +0,5 point par année de 30 à 40 ans — calcul
 *    continu en fonction des trimestres, pas seulement des années entières.
 * 4. **40 ans et plus** : 100 % de la valeur de référence, plafond atteint.
 *
 * Accessible à l'âge d'annulation de la décote — cette fonction ne vérifie
 * aucune condition d'âge, à la charge de l'appelant (même principe que
 * l'ancienne version).
 */
export function minimumGaranti(
  trimestresServicesEffectifs: number,
  trimestresRequis: number,
  valeurReference: number,
  estInvalidite = false
): number {
  const anneesServices = trimestresServicesEffectifs / 4;

  if (anneesServices < 15) {
    if (estInvalidite) {
      return ((0.575 * valeurReference) / 15) * anneesServices;
    }
    return (valeurReference * trimestresServicesEffectifs) / trimestresRequis;
  }

  if (anneesServices < 40) {
    const pourcentage =
      anneesServices <= 30
        ? 57.5 + 2.5 * (anneesServices - 15)
        : 57.5 + 2.5 * 15 + 0.5 * (anneesServices - 30);
    return valeurReference * (pourcentage / 100);
  }

  return valeurReference;
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

/**
 * Majoration pour 3 enfants ou plus, fonction publique (référentiel §7.6) :
 * **10 % pour 3 enfants, +5 % par enfant supplémentaire** — dégressive par
 * palier, à la différence du taux flat 10 % de `majorationTroisEnfants()`
 * (calcul.ts) partagé par le régime général et les régimes qui en héritent.
 * Fonction dédiée distincte, pas un paramètre optionnel de sa sœur : ne pas
 * confondre les deux formules.
 *
 * Conditions d'éligibilité par enfant (avoir élevé pendant au moins 9 ans
 * avant le 16e ou le 20e anniversaire selon le cas, filiation ou garde
 * effective et permanente...) : à la charge de l'appelant, comme pour
 * `majorationTroisEnfants()` — porte uniquement sur le cas courant, cf. dette
 * technique documentée dans docs/audit/implementation-majoration-enfants.md.
 */
export function majorationEnfantsFonctionPublique(nombreEnfantsEligibles: number): number {
  if (nombreEnfantsEligibles < 3) {
    return 0;
  }
  return 10 + (nombreEnfantsEligibles - 3) * 5;
}

/**
 * Supplément de pension au titre de la NBI (Nouvelle Bonification Indiciaire)
 * — référentiel §7.7.1, écart #13-NBI.
 *
 * Source primaire, citée verbatim dans `docs/retraite-base-referentiel.md`
 * §7.7.1 : Décret n° 2003-1306 du 26 décembre 2003 (régime CNRACL), art. 28 —
 * « Ce supplément de pension est égal à la moyenne annuelle de la somme
 * perçue au titre de la nouvelle bonification indiciaire, multipliée [...]
 * par la durée de perception exprimée en trimestres liquidables [...] et
 * [...] par le rapport défini au dernier alinéa du I [de l'article 16] »,
 * ce rapport étant le taux plein maximum (75 %) divisé par la durée requise
 * pour l'obtenir — le même taux d'annuité par trimestre que la pension de
 * base fonction publique (`pensionBaseFonctionPublique()` ci-dessus).
 *
 * `moyenneAnnuelleNBIRevalorisee` : un MONTANT en euros (pas un nombre de
 * points) — le texte source parle explicitement de « la somme perçue au
 * titre de la NBI », déjà revalorisée « dans les conditions prévues à
 * l'article 19 » (même revalorisation que la pension elle-même). Cet outil
 * ne recalcule pas cette revalorisation : le conseiller saisit directement
 * la moyenne annuelle telle qu'elle figure sur le relevé de carrière ou le
 * décompte de liquidation du client — champ déclaratif, pas de conversion
 * points → euros ici (à la différence des points RAFP,
 * `pensionComplementaireAnnuelle()`, où les points sont saisis puis
 * convertis via une valeur de service).
 *
 * `trimestresLiquidablesPerceptionNBI` : nombre de trimestres liquidables
 * pendant lesquels la NBI a été effectivement perçue (PAS la durée totale de
 * carrière ni les trimestres liquidables totaux de la pension) — champ
 * déclaratif, à renseigner par le conseiller à partir du relevé de carrière
 * du client, sans calcul automatique dans cet outil (aucune donnée de
 * fonctions/emplois ouvrant droit à la NBI n'existe dans ce dépôt).
 *
 * `dureeRequiseTauxPlein` : même durée requise que celle utilisée pour la
 * pension de base (`trimestresRequis`, cf. `trimestresRequisPourGeneration()`
 * dans calcul.ts) — pas une valeur propre au supplément NBI.
 *
 * Aucun seuil minimal de perception (texte source, lu intégralement : toute
 * perception, même brève, ouvre droit au supplément, proportionnellement à
 * sa durée) — sous 1 trimestre de perception, le supplément est nul par
 * construction arithmétique (`trimestresLiquidablesPerceptionNBI = 0`), pas
 * par un seuil ajouté artificiellement.
 *
 * Le ratio `trimestresLiquidablesPerceptionNBI / dureeRequiseTauxPlein` est
 * plafonné à 1 (`Math.min`) : garde-fou défensif, sur le même principe que
 * `tauxProratisation()` (calcul.ts) et non une règle explicitement énoncée
 * par le texte source — protège contre une saisie incohérente (durée de
 * perception NBI supérieure à la durée requise du taux plein), pas un cas
 * documenté par le décret.
 *
 * ⚠️ RÉSERVE CNRACL/SRE — à ne jamais perdre en branchant cette fonction sur
 * un écran : le texte source ci-dessus régit spécifiquement la CNRACL
 * (fonction publique territoriale et hospitalière). Aucune disposition
 * équivalente n'a été vérifiée directement dans le code des pensions civiles
 * et militaires de retraite (fonction publique d'État, SRE) — seules des
 * sources secondaires (service-public.gouv.fr, Service des Retraites de
 * l'État) confirment que le droit à un supplément NBI existe aussi côté
 * État, sans qu'une formule de liquidation SRE ait été localisée et citée
 * avec certitude. Cet outil ne distingue aujourd'hui SRE et CNRACL nulle
 * part (`hasFonctionPublique` est un booléen générique, cf.
 * docs/audit/implementation-nbi.md §1) : le branchement de cette fonction
 * sur un écran est volontairement différé tant que ce choix de périmètre
 * (appliquer partout avec avertissement, ou modéliser un champ
 * versant/régime pour restreindre) n'a pas été tranché — décision produit,
 * pas technique, cf. rapport pour le détail de l'arbitrage retenu.
 */
export function supplementNBI(
  moyenneAnnuelleNBIRevalorisee: number,
  trimestresLiquidablesPerceptionNBI: number,
  dureeRequiseTauxPlein: number
): number {
  if (trimestresLiquidablesPerceptionNBI <= 0) {
    return 0;
  }
  const tauxPleinMaximum = 0.75;
  // moyenne × trimestres × (75% / dureeRequise), réécrit en
  // moyenne × ratio × 75% une fois le ratio plafonné à 1 (garde-fou,
  // cf. docstring) — algébriquement identique à la formule du texte source
  // tant que le ratio n'est pas plafonné.
  const ratioPerceptionNBI = Math.min(trimestresLiquidablesPerceptionNBI / dureeRequiseTauxPlein, 1);
  return moyenneAnnuelleNBIRevalorisee * ratioPerceptionNBI * tauxPleinMaximum;
}

/**
 * Pension fonction publique avec majoration pour enfants, plafonnée au
 * dernier traitement (référentiel §7.6) : « la majoration s'applique le cas
 * échéant sur la pension portée au minimum garanti [...] le total pension +
 * majoration ne peut excéder le dernier traitement de base. »
 *
 * `pensionPorteeAuMinimumGaranti` doit donc déjà être le résultat de
 * `pensionFonctionPubliqueFinale()` (APRÈS minimum garanti) — cette fonction
 * ne recalcule pas le minimum garanti, elle applique uniquement la
 * majoration et son plafond, dans cet ordre précis de l'appelant :
 * base → décote/surcote → minimum garanti → majoration enfants (plafonnée).
 *
 * `dernierTraitementAnnuel` : même convention d'unités que
 * `pensionBaseFonctionPublique()` (TIB annuel, mensuel × 12 à la charge de
 * l'appelant).
 */
export function pensionFonctionPubliqueAvecMajorationEnfants(
  pensionPorteeAuMinimumGaranti: number,
  majorationPourcent: number,
  dernierTraitementAnnuel: number
): number {
  const pensionAvecMajoration = pensionPorteeAuMinimumGaranti * (1 + majorationPourcent / 100);
  return Math.min(pensionAvecMajoration, dernierTraitementAnnuel);
}
