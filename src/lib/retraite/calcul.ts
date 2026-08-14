/**
 * Moteur de calcul de la pension de retraite (régime de base + surcote/décote).
 * Fonctions pures, sans JSX ni state React — sur le modèle de
 * src/lib/patrimoine/bareme669CGI.ts.
 */

import { RegimeDetecte } from './parseRIS';

/**
 * Date de naissance décomposée en année + mois (1-12) — nécessaire pour
 * résoudre correctement les générations à découpage infra-annuel du barème
 * légal (1951, 1961, 1965 ; cf. `BAREME_STABLE_AVANT_1964` et
 * `BAREME_INSTABLE_1964_1968` ci-dessous). Le jour n'intervient dans aucune
 * des bornes du référentiel retenues ici — seul le mois compte.
 */
export interface DateNaissance {
  annee: number;
  mois: number; // 1-12
}

/**
 * Parse une date ISO ("YYYY-MM-DD", format des colonnes `date` Postgres) en
 * `DateNaissance`, par découpage de chaîne plutôt que via `new Date(...)`.
 * `new Date("1965-04-01")` est interprétée comme minuit UTC puis relue avec
 * `.getMonth()` en heure LOCALE : un fuseau horaire en décalage négatif peut
 * faire retomber le résultat sur le mois civil précédent — un décalage
 * silencieux exactement sur les bornes qui comptent ici (1er avril 1965, 1er
 * septembre 1961...). Le découpage de chaîne élimine ce risque.
 */
export function dateNaissanceDepuisISO(dateISO: string): DateNaissance {
  const [annee, mois] = dateISO.split('-').map(Number);
  return { annee, mois };
}

/**
 * Parse une date ISO ("YYYY-MM-DD", format des champs `<input type="date">`
 * et des colonnes `date` Postgres) en `Date` UTC à minuit — même précaution
 * que `dateNaissanceDepuisISO()` (construction explicite plutôt que
 * `new Date(dateISO)` seul, pour ne dépendre d'aucune conversion de fuseau
 * horaire local). Utilisée pour une date d'effet saisie directement par
 * l'utilisateur (ex. date de liquidation, Trimestres.tsx depuis la Session
 * B), par opposition à `dateEffetSimuleeParAge()` ci-dessous qui reste une
 * approximation à partir d'un âge.
 */
export function dateDepuisISO(dateISO: string): Date {
  return new Date(`${dateISO}T00:00:00Z`);
}

/**
 * Date d'effet approximée à partir d'un âge de départ plutôt que d'une date
 * saisie explicitement : anniversaire (mois de naissance) de l'année
 * `dateNaissance.annee + age`. Depuis la Session B, ce proxy ne sert plus
 * qu'au tableau comparatif non interactif de Trimestres.tsx (une ligne par
 * âge fixe 62-70 ans, pas un contrôle de saisie) — le scénario réellement
 * sélectionné par l'utilisateur y est désormais piloté par une vraie date de
 * liquidation (`dateDepuisISO()` ci-dessus), cf.
 * docs/audit/implementation-date-effet-ui.md.
 */
export function dateEffetSimuleeParAge(dateNaissance: DateNaissance, age: number): Date {
  return new Date(Date.UTC(dateNaissance.annee + age, dateNaissance.mois - 1, 1));
}

function moisAbsolu(date: DateNaissance): number {
  return date.annee * 12 + (date.mois - 1);
}

/**
 * Trois jeux de paramètres légaux coexistent selon la date d'effet de la
 * pension (référentiel §2.1.3) :
 * - `lfss_2026` : barème issu de l'art. 105 de la loi 2025-1403 (LFSS 2026),
 *   opposable aux pensions prenant effet à compter du 1er septembre 2026
 *   (référentiel §2.1.1).
 * - `calendrier_2023` : barème de la loi 2023-270, opposable aux pensions
 *   prenant effet entre le 1er septembre 2023 et le 31 août 2026
 *   (référentiel §2.1.2) — reste seul opposable à ces dates malgré la
 *   publication ultérieure de la LFSS 2026.
 * - `anterieur_2023` : barème antérieur à la réforme 2023 (réformes 2010 /
 *   2014). Le référentiel ne le détaille pas (§12.2 point 4 : « barème
 *   antérieur (réformes 2010/2014) » mentionné mais non chiffré) — ce jeu
 *   n'est donc PAS couvert par ce module. Cf. `trimestresRequisPourGeneration()`
 *   et `ageLegalPourGeneration()` pour la façon dont chacune gère ce cas.
 */
export type JeuBareme = 'anterieur_2023' | 'calendrier_2023' | 'lfss_2026';

const BASCULE_CALENDRIER_2023 = Date.UTC(2023, 8, 1); // 1er septembre 2023
const BASCULE_LFSS_2026 = Date.UTC(2026, 8, 1); // 1er septembre 2026

export function jeuBaremeApplicable(dateEffet: Date): JeuBareme {
  const instant = dateEffet.getTime();
  if (instant >= BASCULE_LFSS_2026) return 'lfss_2026';
  if (instant >= BASCULE_CALENDRIER_2023) return 'calendrier_2023';
  return 'anterieur_2023';
}

export interface AgeLegal {
  ans: number;
  mois: number;
}

interface ParametresGeneration {
  ageLegal: AgeLegal;
  trimestresRequis: number;
}

interface TrancheStable {
  naissanceMax: DateNaissance; // borne haute incluse
  parametres: ParametresGeneration;
}

/**
 * Barème identique pour les jeux `calendrier_2023` et `lfss_2026` — vérifié
 * ligne à ligne entre le référentiel §2.1.1 et §2.1.2 : aucun écart hors de
 * la zone 1964-1968 (`BAREME_INSTABLE_1964_1968` ci-dessous), qui seule
 * justifie de stocker deux valeurs. Couvre les découpages infra-annuels 1951
 * (1er juillet) et 1961 (1er septembre) — référentiel §2.1.1, §12.3.
 *
 * ⚠️ Pour la tranche « avant le 01/07/1951 », le référentiel indique une
 * durée requise « — » (non chiffrée). Faute de valeur documentée, et cette
 * génération n'étant pas un cas d'usage réaliste pour un outil utilisé en
 * 2026 (76 ans et plus), la valeur de la tranche suivante (163) est retenue
 * par défaut plutôt que de fabriquer un nombre non sourcé — l'âge légal, lui
 * documenté (60 ans), reste exact.
 */
const BAREME_STABLE_AVANT_1964: TrancheStable[] = [
  { naissanceMax: { annee: 1951, mois: 6 }, parametres: { ageLegal: { ans: 60, mois: 0 }, trimestresRequis: 163 } },
  { naissanceMax: { annee: 1951, mois: 12 }, parametres: { ageLegal: { ans: 60, mois: 4 }, trimestresRequis: 163 } },
  { naissanceMax: { annee: 1952, mois: 12 }, parametres: { ageLegal: { ans: 60, mois: 9 }, trimestresRequis: 164 } },
  { naissanceMax: { annee: 1953, mois: 12 }, parametres: { ageLegal: { ans: 61, mois: 2 }, trimestresRequis: 165 } },
  { naissanceMax: { annee: 1954, mois: 12 }, parametres: { ageLegal: { ans: 61, mois: 7 }, trimestresRequis: 165 } },
  { naissanceMax: { annee: 1957, mois: 12 }, parametres: { ageLegal: { ans: 62, mois: 0 }, trimestresRequis: 166 } },
  { naissanceMax: { annee: 1960, mois: 12 }, parametres: { ageLegal: { ans: 62, mois: 0 }, trimestresRequis: 167 } },
  { naissanceMax: { annee: 1961, mois: 8 }, parametres: { ageLegal: { ans: 62, mois: 0 }, trimestresRequis: 168 } },
  { naissanceMax: { annee: 1961, mois: 12 }, parametres: { ageLegal: { ans: 62, mois: 3 }, trimestresRequis: 169 } },
  { naissanceMax: { annee: 1962, mois: 12 }, parametres: { ageLegal: { ans: 62, mois: 6 }, trimestresRequis: 169 } },
  { naissanceMax: { annee: 1963, mois: 12 }, parametres: { ageLegal: { ans: 62, mois: 9 }, trimestresRequis: 170 } },
];

const BAREME_1969_ET_APRES: ParametresGeneration = { ageLegal: { ans: 64, mois: 0 }, trimestresRequis: 172 };

interface TrancheInstable {
  naissanceMin: DateNaissance;
  naissanceMax: DateNaissance;
  calendrier2023: ParametresGeneration;
  lfss2026: ParametresGeneration;
}

/**
 * Zone instable 1964-1968 (référentiel §2.1.1 vs §2.1.2, écart détaillé au
 * §12.1) : seule zone où `calendrier_2023` et `lfss_2026` divergent
 * réellement — d'où un stockage à deux valeurs limité à ces six lignes
 * plutôt que dupliqué sur tout le barème (cf.
 * docs/audit/conception-date-effet.md §3a). Découpage infra-annuel de la
 * génération 1965 au 1er avril (référentiel §2.1.1, §12.3) : deux lignes
 * distinctes, pas une par année.
 */
const BAREME_INSTABLE_1964_1968: TrancheInstable[] = [
  {
    naissanceMin: { annee: 1964, mois: 1 },
    naissanceMax: { annee: 1964, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 0 }, trimestresRequis: 171 },
    lfss2026: { ageLegal: { ans: 62, mois: 9 }, trimestresRequis: 170 },
  },
  {
    naissanceMin: { annee: 1965, mois: 1 },
    naissanceMax: { annee: 1965, mois: 3 },
    calendrier2023: { ageLegal: { ans: 63, mois: 3 }, trimestresRequis: 172 },
    lfss2026: { ageLegal: { ans: 62, mois: 9 }, trimestresRequis: 170 },
  },
  {
    naissanceMin: { annee: 1965, mois: 4 },
    naissanceMax: { annee: 1965, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 3 }, trimestresRequis: 172 },
    lfss2026: { ageLegal: { ans: 63, mois: 0 }, trimestresRequis: 171 },
  },
  {
    naissanceMin: { annee: 1966, mois: 1 },
    naissanceMax: { annee: 1966, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 6 }, trimestresRequis: 172 },
    lfss2026: { ageLegal: { ans: 63, mois: 3 }, trimestresRequis: 172 },
  },
  {
    naissanceMin: { annee: 1967, mois: 1 },
    naissanceMax: { annee: 1967, mois: 12 },
    calendrier2023: { ageLegal: { ans: 63, mois: 9 }, trimestresRequis: 172 },
    lfss2026: { ageLegal: { ans: 63, mois: 6 }, trimestresRequis: 172 },
  },
  {
    naissanceMin: { annee: 1968, mois: 1 },
    naissanceMax: { annee: 1968, mois: 12 },
    calendrier2023: { ageLegal: { ans: 64, mois: 0 }, trimestresRequis: 172 },
    lfss2026: { ageLegal: { ans: 63, mois: 9 }, trimestresRequis: 172 },
  },
];

function trouverZoneInstable(dateNaissance: DateNaissance): TrancheInstable | undefined {
  const m = moisAbsolu(dateNaissance);
  return BAREME_INSTABLE_1964_1968.find((t) => m >= moisAbsolu(t.naissanceMin) && m <= moisAbsolu(t.naissanceMax));
}

function resoudreBaremeStable(dateNaissance: DateNaissance): ParametresGeneration {
  const m = moisAbsolu(dateNaissance);
  const tranche = BAREME_STABLE_AVANT_1964.find((t) => m <= moisAbsolu(t.naissanceMax));
  return tranche ? tranche.parametres : BAREME_1969_ET_APRES;
}

/**
 * Résout le barème pour un jeu déjà déterminé (`calendrier_2023` ou
 * `lfss_2026` — jamais `anterieur_2023`, cf. `trimestresRequisPourGeneration()`
 * et `ageLegalPourGeneration()` pour la façon dont ce troisième cas est géré
 * par chacune). Hors zone instable, les deux jeux sont rigoureusement
 * identiques (vérifié référentiel §2.1.1 vs §2.1.2) : la valeur ne dépend
 * alors même pas du jeu demandé.
 */
function resoudreParJeu(dateNaissance: DateNaissance, jeu: 'calendrier_2023' | 'lfss_2026'): ParametresGeneration {
  const zoneInstable = trouverZoneInstable(dateNaissance);
  if (zoneInstable) {
    return jeu === 'lfss_2026' ? zoneInstable.lfss2026 : zoneInstable.calendrier2023;
  }
  return resoudreBaremeStable(dateNaissance);
}

/**
 * Trimestres requis pour le taux plein, résolus selon la génération ET la
 * date d'effet de la pension (référentiel §2.1.3) — remplace l'ancienne
 * version, qui appliquait un seul barème (post-suspension LFSS 2026)
 * inconditionnellement, sans notion de date d'effet ni découpage infra-
 * annuel de la génération 1965 (écarts #2 et #3, docs/audit/audit-retraite.md
 * §7 et docs/audit/conception-date-effet.md).
 *
 * Repli documenté pour une `dateEffet` antérieure au 1er septembre 2023 : le
 * référentiel ne détaille pas ce barème (cf. `JeuBareme`), donc plutôt que de
 * fabriquer une valeur, cette fonction retombe sur le jeu `lfss_2026` — le
 * comportement de cet outil AVANT la présente correction (il appliquait déjà
 * ce jeu inconditionnellement, quelle que soit la date). Aucune régression
 * pour ce cas ; correction réelle pour toute date d'effet à compter du
 * 1er septembre 2023. `ageLegalPourGeneration()` ci-dessous, à l'inverse,
 * signale ce cas explicitement plutôt que d'y appliquer un repli silencieux
 * — cf. sa docstring pour la justification de cette différence de contrat.
 */
export function trimestresRequisPourGeneration(dateNaissance: DateNaissance, dateEffet: Date): number {
  const jeu = jeuBaremeApplicable(dateEffet);
  const jeuResolu = jeu === 'anterieur_2023' ? 'lfss_2026' : jeu;
  return resoudreParJeu(dateNaissance, jeuResolu).trimestresRequis;
}

/**
 * Résultat de `ageLegalPourGeneration()` — union discriminée plutôt qu'un
 * objet `{ age }` toujours renseigné : pour une date d'effet antérieure au
 * 1er septembre 2023, le référentiel ne documente pas le barème applicable
 * (cf. `JeuBareme`), et il n'existe ici aucune valeur de repli défendable à
 * renvoyer silencieusement — contrairement à `trimestresRequisPourGeneration()`,
 * qui peut légitimement retomber sur son propre comportement historique
 * (elle ignorait déjà la date d'effet avant cette correction). Un champ
 * `age` toujours renseigné inciterait un appelant pressé à le lire sans
 * vérifier `stable`, produisant un âge silencieusement faux.
 *
 * Design conservé de la version précédente de cette fonction (même
 * principe : union discriminée plutôt que valeur de repli), appliqué
 * désormais à une indétermination différente — barème antérieur à 2023 non
 * documenté, plutôt que zone 1964-1968 sans date d'effet. Cette dernière
 * indétermination est résolue par construction dès lors qu'une date d'effet
 * est fournie, ce qui est désormais toujours le cas.
 */
export type AgeLegalResultat = { stable: true; age: AgeLegal } | { stable: false; raison: string };

/**
 * Âge légal de départ à la retraite, résolu selon la génération ET la date
 * d'effet (référentiel §2.1.3), reconnectée à `resoudreParJeu()` — la même
 * table que `trimestresRequisPourGeneration()` (auparavant deux tables non
 * synchronisées, cf. docs/audit/conception-date-effet.md §1). Aucun écran ne
 * consomme aujourd'hui la valeur d'âge légal elle-même pour l'affichage
 * (recherche confirmée dans la note de conception) ; cette fonction est
 * néanmoins appelée en production par Trimestres.tsx, dont le résultat est
 * inclus dans l'objet de scénario retourné par `simulerPourAge()` — prêt
 * pour un affichage futur (Session B), et n'est donc plus un point d'entrée
 * mort.
 */
export function ageLegalPourGeneration(dateNaissance: DateNaissance, dateEffet: Date): AgeLegalResultat {
  const jeu = jeuBaremeApplicable(dateEffet);
  if (jeu === 'anterieur_2023') {
    return {
      stable: false,
      raison:
        `Barème non documenté pour une date d'effet antérieure au 1er septembre 2023 ` +
        `(référentiel §2.1.3, §12.2 point 4 : seuls les barèmes à compter de cette date sont détaillés).`,
    };
  }
  return { stable: true, age: resoudreParJeu(dateNaissance, jeu).ageLegal };
}

/**
 * Convertit un âge légal (`{ ans, mois }`, tel que retourné par
 * `ageLegalPourGeneration()`) en date exacte d'anniversaire, à partir d'une
 * date de naissance — même principe que `dateEffetSimuleeParAge()` ci-dessus
 * (âge → date), appliqué ici à un âge en années ET mois plutôt qu'à un
 * nombre entier d'années. Aucun nouveau calcul de barème : consomme
 * directement le résultat de `ageLegalPourGeneration()` (Session A).
 */
export function dateAnniversaireLegal(dateNaissance: DateNaissance, ageLegal: AgeLegal): Date {
  const moisAbsoluNaissance = dateNaissance.mois - 1 + ageLegal.mois; // 0-indexé
  const anneesSupplementaires = Math.floor(moisAbsoluNaissance / 12);
  const moisResultat = moisAbsoluNaissance % 12;
  return new Date(Date.UTC(dateNaissance.annee + ageLegal.ans + anneesSupplementaires, moisResultat, 1));
}

/**
 * Indique si l'âge légal (référentiel §2.1, §2.3.1 condition n° 2) est
 * atteint à la date d'effet — condition cumulative de la surcote, avec
 * `dureeRequiseAtteinte` (simple comparaison trimestresValides >=
 * trimestresRequis, à la charge de l'appelant, cf. `surcotePourTrimestresCotises()`
 * ci-dessous).
 *
 * `undefined` (pas `false`) quand `ageLegalPourGeneration()` ne peut pas
 * déterminer le barème applicable (dateEffet antérieure au 01/09/2023,
 * cf. sa docstring) — ne jamais fabriquer une réponse binaire à partir d'une
 * donnée indéterminée. Un appelant qui reçoit `undefined` doit traiter le cas
 * comme non tranché, pas comme "non atteint".
 */
export function ageLegalAtteint(dateNaissance: DateNaissance, dateEffet: Date): boolean | undefined {
  const resultat = ageLegalPourGeneration(dateNaissance, dateEffet);
  if (!resultat.stable) {
    return undefined;
  }
  return dateEffet.getTime() >= dateAnniversaireLegal(dateNaissance, resultat.age).getTime();
}

/**
 * Sous-condition n° 2 de la surcote parentale (référentiel §2.3.2) : l'âge
 * légal de la génération est-il égal ou supérieur à 63 ans ? Distincte de
 * `ageLegalAtteint()` ci-dessus — celle-ci compare l'âge légal à la date
 * d'effet (« l'assuré a-t-il atteint son âge légal ? »), alors que cette
 * fonction compare l'âge légal lui-même à un seuil fixe de 63 ans (« l'âge
 * légal DE CETTE GÉNÉRATION est-il ≥ 63 ans ? ») — deux questions différentes
 * qui portent sur la même valeur (`resultat.age.ans`) mais ne doivent pas
 * être confondues.
 *
 * Effet de bord documenté par le référentiel (§2.3.2, conséquence
 * d'implémentation) : sous le barème LFSS 2026, les générations 1964 et
 * 1965-T1 ont un âge légal de 62 ans 9 mois — sous le seuil — alors que sous
 * le calendrier 2023, ces mêmes générations avaient un âge légal de 63 ans
 * (1964) ou 63 ans 3 mois (1965), et étaient donc éligibles. La suspension
 * LFSS 2026 les fait donc *sortir* du champ de la surcote parentale, un
 * effet contre-intuitif que le référentiel demande de tester explicitement
 * (cf. `calcul.test.ts`). Résolu nativement par la réutilisation de
 * `ageLegalPourGeneration()` : aucun barème codé en dur ici, comme déjà
 * vérifié pour l'écart #5 (`docs/audit/implementation-surcote.md` §4).
 *
 * `undefined` (pas `false`) quand le barème n'est pas déterminé, même
 * principe que `ageLegalAtteint()` — ne jamais fabriquer une éligibilité à
 * partir d'une donnée indéterminée.
 */
export function ageLegalParentaleEligible(dateNaissance: DateNaissance, dateEffet: Date): boolean | undefined {
  const resultat = ageLegalPourGeneration(dateNaissance, dateEffet);
  if (!resultat.stable) {
    return undefined;
  }
  return resultat.age.ans >= 63;
}

/**
 * Surcote pour prolongation d'activité (référentiel §2.3.1) — fonction
 * dédiée et séparée de `decoteSurTrimestres()` (celle-ci reste inchangée,
 * cf. docs/audit/conception-surcote.md §2 : décote et surcote sont deux
 * mécanismes distincts du référentiel, pas deux lectures d'un même
 * excédent).
 *
 * Deux conditions cumulatives, explicitement des booléens à la charge de
 * l'appelant plutôt que recalculées ici :
 * - `ageLegalAtteintFlag` : cf. `ageLegalAtteint()` ci-dessus — `undefined`
 *   traité comme non éligible (`false` implicite via `!ageLegalAtteintFlag`),
 *   par prudence : un barème non déterminé ne doit jamais produire une
 *   surcote fabriquée.
 * - `dureeRequiseAtteinte` : trimestresValides >= trimestresRequis, tous
 *   régimes confondus (référentiel §2.3.1 condition n° 1) — simple
 *   comparaison, aucune fonction dédiée nécessaire.
 *
 * `trimestresCotisesDansPeriodeDeReference` : nombre de trimestres COTISÉS
 * (pas assimilés, référentiel §2.3.1/§2.5) situés dans la période de
 * référence de la surcote — À LA CHARGE DE L'APPELANT de fournir ce nombre
 * déjà filtré et borné dans le temps. Cette fonction ne fait aucune
 * hypothèse sur la façon dont ce nombre a été obtenu : elle n'implémente pas
 * la chronologie infra-annuelle de la période de référence (dette technique
 * documentée, cf. docs/audit/implementation-surcote.md) — seule la formule
 * et la porte d'éligibilité relèvent de cette fonction.
 *
 * 1,25 % par trimestre, sans plafond (référentiel §2.3.1 : « soit 5 % par
 * an, sans plafond »).
 */
export function surcotePourTrimestresCotises(
  trimestresCotisesDansPeriodeDeReference: number,
  ageLegalAtteintFlag: boolean | undefined,
  dureeRequiseAtteinte: boolean
): number {
  if (!ageLegalAtteintFlag || !dureeRequiseAtteinte) {
    return 0;
  }
  return Math.max(0, trimestresCotisesDansPeriodeDeReference) * 1.25;
}

/**
 * Surcote parentale (référentiel §2.3.2) — fonction dédiée et séparée de
 * `surcotePourTrimestresCotises()` (la surcote classique) : mécanisme
 * distinct du référentiel, avec sa propre porte d'éligibilité et son propre
 * plafond, sur le modèle déjà posé pour l'écart #5
 * (`docs/audit/implementation-surcote.md`) et l'écart #7
 * (`majorationTroisEnfants()`).
 *
 * Décision produit actée (option B, cf. `docs/audit/conception-majorations-enfants.md`
 * §6.3/§7) : champ **déclaratif** plutôt qu'un sous-système de répartition
 * MDA par enfant (garde, autorité parentale, options cerfa 15046...). La
 * condition n° 1 ci-dessous se limite donc à un booléen saisi par le
 * conseiller, pas à un décompte de trimestres MDA reconstitué.
 *
 * Trois conditions cumulatives, toutes à la charge de l'appelant :
 * - `auMoinsUnTrimestreMajorationEnfant` : condition n° 1 (référentiel
 *   §2.3.2) — au moins 1 trimestre de majoration de durée d'assurance au
 *   titre de la maternité, de l'adoption, de l'éducation, d'un enfant
 *   handicapé ou d'un congé parental, quel que soit le régime de base qui
 *   l'octroie. Une condition binaire déclarative, pas un décompte.
 * - `ageLegalParentaleEligibleFlag` : premier volet de la condition n° 2 —
 *   cf. `ageLegalParentaleEligible()` ci-dessus (âge légal de la génération
 *   ≥ 63 ans). `undefined` traité comme non éligible, même principe que
 *   `surcotePourTrimestresCotises()`.
 * - `dureeRequiseAtteinte` : second volet de la condition n° 2 — durée
 *   requise réunie « dès l'année précédant l'âge légal ». Même
 *   simplification et même dette technique que `surcotePourTrimestresCotises()`
 *   (`docs/audit/implementation-surcote.md`) : cette fonction ne résout pas
 *   la chronologie infra-annuelle de « l'année précédant » — l'appelant
 *   fournit un booléen déjà tranché (par exemple, en pratique, une
 *   comparaison trimestresValides >= trimestresRequis à la même date de
 *   référence que la surcote classique, en l'absence d'un calcul
 *   chronologique plus précis).
 *
 * `trimestresCotisesAnneeReference` : nombre de trimestres COTISÉS sur
 * l'année de référence (l'année précédant l'âge légal), à obtenir par
 * l'appelant via `parAnnee` de `trimestresCotisesEtAssimilesDepuisCarriere()`
 * (écart #5) — pas un nouveau calcul de ventilation annuelle ici.
 *
 * Montant : 1,25 % par trimestre cotisé sur cette année, **plafonné à 5 %**
 * (4 trimestres) — à la différence de `surcotePourTrimestresCotises()`, qui
 * n'a aucun plafond (référentiel §2.3.1 : « sans plafond » pour la surcote
 * classique, contre « plafonné à 5 % » explicitement pour la surcote
 * parentale, §2.3.2).
 */
export function surcoteParentale(
  auMoinsUnTrimestreMajorationEnfant: boolean,
  ageLegalParentaleEligibleFlag: boolean | undefined,
  dureeRequiseAtteinte: boolean,
  trimestresCotisesAnneeReference: number
): number {
  if (!auMoinsUnTrimestreMajorationEnfant || !ageLegalParentaleEligibleFlag || !dureeRequiseAtteinte) {
    return 0;
  }
  const trimestresPlafonnes = Math.min(Math.max(0, trimestresCotisesAnneeReference), 4);
  return trimestresPlafonnes * 1.25;
}

/**
 * Cumul de la surcote classique et de la surcote parentale — matérialise la
 * divergence de règle de cumul entre régimes (référentiel §2.3.2, §7.4,
 * §12.3 ; cartographiée dans `docs/audit/conception-majorations-enfants.md`
 * §2) comme un paramètre nommé plutôt qu'un `if` caché dans un composant,
 * même principe que `decoteApplicable()` pour la règle du plus petit des
 * deux comptages.
 *
 * `cumulable = true` (régime général et régimes qui en héritent
 * intégralement sur ce point — SSI, CNAVPL, CNBF, agents contractuels,
 * artistes-auteurs) : les deux surcotes **s'additionnent**.
 *
 * `cumulable = false` (fonction publique uniquement, référentiel §7.4 :
 * « elle ne se cumule pas avec la surcote de droit commun ») : **la plus
 * élevée des deux est retenue**, pas leur somme.
 *
 * ⚠️ Interprétation à signaler pour validation (cf.
 * `docs/audit/implementation-surcote-parentale.md`) : le référentiel affirme
 * le non-cumul pour la fonction publique mais ne formule pas explicitement
 * une règle de choix entre les deux surcotes au-delà de « l'une ou l'autre »
 * — retenir la plus élevée est une supposition raisonnable (cohérente avec
 * le reste du droit de la sécurité sociale, qui retient systématiquement la
 * solution la plus favorable à l'assuré dans ce type d'alternative), pas une
 * citation directe du référentiel pour ce point précis.
 */
export function surcoteTotale(
  surcoteClassiqueValeur: number,
  surcoteParentaleValeur: number,
  cumulable: boolean
): number {
  return cumulable
    ? surcoteClassiqueValeur + surcoteParentaleValeur
    : Math.max(surcoteClassiqueValeur, surcoteParentaleValeur);
}

/**
 * Taux de proratisation, plafonné à 100 % : au-delà de trimestresRequis,
 * l'avantage supplémentaire relève de la surcote (calculée séparément),
 * pas d'un ratio > 1 ici.
 */
export function tauxProratisation(trimestresValides: number, trimestresRequis: number): number {
  return Math.min(trimestresValides / trimestresRequis, 1);
}

/**
 * Décote/surcote basée sur l'écart de trimestres validés par rapport aux
 * trimestres requis : -1,25 % par trimestre manquant (plafonné à -20 %),
 * +1,25 % par trimestre excédentaire.
 */
export function decoteSurTrimestres(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) {
    return Math.max(difference * 1.25, -20);
  }
  if (difference > 0) {
    return difference * 1.25;
  }
  return 0;
}

/**
 * Décote/surcote basée sur l'écart de trimestres validés par rapport aux
 * trimestres requis, avec un plafond de -25 % (20 trimestres) au lieu de
 * -20 % — mécanique partagée par plusieurs régimes dont le barème de décote
 * diffère du régime général sur ce seul point (fonction publique, CNAVPL).
 *
 * ⚠️ Ne pas confondre avec decoteSurTrimestres() ci-dessus (plafond -20 %,
 * régime général) : la mécanique (1,25 %/trimestre) est identique, seul le
 * plafond change selon le régime.
 */
export function decoteSurTrimestresPlafond25(trimestresValides: number, trimestresRequis: number): number {
  const difference = trimestresValides - trimestresRequis;
  if (difference < 0) {
    return Math.max(difference * 1.25, -25);
  }
  if (difference > 0) {
    return difference * 1.25;
  }
  return 0;
}

/**
 * Décote basée sur l'écart d'âge par rapport à l'âge du taux plein
 * automatique (67 ans par défaut) : même barème que decoteSurTrimestres pour
 * un départ anticipé (1,25 % par trimestre d'écart, 4 trimestres par année
 * d'écart, plafonné à -20 %). À partir de l'âge du taux plein automatique,
 * celui-ci est acquis d'office : cette règle ne génère jamais de surcote (la
 * seule surcote possible vient de decoteSurTrimestres, via decoteApplicable).
 */
export function decoteSurAge(ageDepart: number, ageTauxPleinAuto = 67): number {
  if (ageDepart >= ageTauxPleinAuto) {
    return 0;
  }
  const ecartTrimestres = (ageDepart - ageTauxPleinAuto) * 4;
  return Math.max(ecartTrimestres * 1.25, -20);
}

/**
 * Retient la décote/surcote la plus favorable (la moins négative) entre les
 * deux règles : l'utilisateur bénéficie du calcul le plus avantageux.
 */
export function decoteApplicable(decoteSurTrimestres: number, decoteSurAge: number): number {
  return Math.max(decoteSurTrimestres, decoteSurAge);
}

/**
 * Montant annuel du minimum contributif (MiCo) non majoré, régime général.
 *
 * Source : circulaire CNAV n° 2025-34 du 23/12/2025, montant applicable au
 * 1er janvier 2026 (756,29 €/mois × 12). ⚠️ À réviser chaque année lors de
 * la revalorisation.
 *
 * Ne couvre que la version de base (non majorée). Le MiCo majoré, réservé
 * aux carrières longues (120 trimestres cotisés requis), n'est pas
 * implémenté — cf. dette technique documentée dans docs/audit/audit-retraite.md.
 */
export const MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 = 9075.48;

/**
 * Minimum contributif proratisé, régime général, version non majorée
 * uniquement.
 *
 * Éligibilité stricte : le MiCo ne s'applique qu'à une pension liquidée à
 * taux plein, c'est-à-dire sans décote (decote < 0 déclenche une exclusion
 * totale, pas un plafonnement — un assuré décoté n'est pas éligible, quel
 * que soit son nombre de trimestres).
 */
export function minimumContributif(
  trimestresValides: number,
  trimestresRequis: number,
  decote: number
): number {
  if (decote < 0) {
    return 0;
  }
  return MINIMUM_CONTRIBUTIF_NON_MAJORE_2026 * Math.min(trimestresValides / trimestresRequis, 1);
}

/**
 * Pension de base ajustée : SAM × 50 % × taux de proratisation, puis
 * application de la décote/surcote.
 */
export function pensionBase(
  salaireAnnuelMoyen: number,
  tauxProratisation: number,
  decote: number
): number {
  const tauxPlein = 0.5;
  const pensionBrute = salaireAnnuelMoyen * tauxPlein * tauxProratisation;
  return pensionBrute * (1 + decote / 100);
}

/**
 * Majoration pour 3 enfants ou plus (référentiel §3.8) : 10 % flat de la
 * pension de base dès 3 enfants éligibles, sans palier ni plafond. Accordée
 * même en l'absence de taux plein — cette fonction ne vérifie donc aucune
 * condition de durée d'assurance ou d'âge, à la différence de
 * `surcotePourTrimestresCotises()`.
 *
 * Régimes concernés par cette formule flat, tous confirmés « mêmes règles
 * qu'au régime général » par le référentiel : régime général lui-même,
 * SSI (§4.3.1), agents contractuels (§8.1), artistes-auteurs (§9.5), CNAVPL
 * et CNBF (§5.4, §6.3) — réutiliser directement cette fonction pour ces six
 * régimes, pas de fonction dupliquée par régime (même principe que
 * `decoteSurTrimestresPlafond25()`, réutilisée telle quelle par CNAVPL et la
 * fonction publique). Seule la fonction publique a une formule dégressive
 * différente (+5 %/enfant au-delà de 3, plafonnée au dernier traitement) —
 * voir `majorationEnfantsFonctionPublique()` dans `calculFonctionPublique.ts`.
 *
 * Porte uniquement sur le cas courant : filiation directe (naissance,
 * reconnaissance, possession d'état) et adoption simple/plénière. La branche
 * « enfant recueilli sans filiation » (enfant du conjoint/PACS/concubin,
 * condition de 9 ans de charge avant le 16e anniversaire) n'est pas couverte
 * — aucune donnée disponible pour la distinguer du cas courant, cf. dette
 * technique documentée dans docs/audit/implementation-majoration-enfants.md.
 *
 * Ordre d'application : cette fonction ne connaît ni le MICO ni la surcote —
 * comme `surcotePourTrimestresCotises()`, c'est à l'appelant d'appliquer le
 * pourcentage retourné APRÈS le MICO pour les régimes qui en ont un (régime
 * général et régimes hérités), ou directement sur la pension issue de la
 * décote/surcote pour CNAVPL/CNBF qui n'ont pas d'étage MICO (référentiel
 * §5.5 : « pas de MICO ») — cette fonction n'introduit donc jamais de MICO
 * par elle-même, quel que soit le régime appelant.
 */
export function majorationTroisEnfants(nombreEnfantsEligibles: number): number {
  if (nombreEnfantsEligibles < 3) {
    return 0;
  }
  return 10;
}

/**
 * Pension complémentaire annuelle d'un régime à points : uniquement
 * calculable si points et valeurPoint sont tous deux connus (pas de valeur
 * par défaut inventée si l'un des deux manque). Constante dans le temps :
 * ne dépend d'aucun âge de départ.
 */
export function pensionComplementaireAnnuelle(regime: RegimeDetecte): number | undefined {
  return regime.points !== undefined && regime.valeurPoint !== undefined
    ? regime.points * regime.valeurPoint
    : undefined;
}

/**
 * Rachat de trimestres (« versement pour la retraite ») — coût par trimestre.
 *
 * Barème CNAV 2026 (circulaire n° 2026-04 du 5 février 2026), gelé depuis
 * 2013 : seuls les seuils de revenus (indexés sur le PASS) sont réactualisés
 * chaque année. Applicable au régime général ET aux indépendants SSI
 * (retraite de base alignée sur le régime général depuis 2018).
 *
 * ⚠️ NE PAS utiliser pour les professions libérales réglementées (CIPAV,
 * CARMF, CARPIMKO, CAVEC...) : leur barème de rachat n'est pas public, chaque
 * caisse établit un devis individualisé sur demande.
 *
 * Source : moneyvox.fr, citant la circulaire CNAV n° 2026-04. À
 * vérifier/réactualiser chaque année si une nouvelle circulaire CNAV est
 * publiée.
 */
export type OptionRachat = 'tauxSeul' | 'tauxEtDuree';

interface TrancheRachat {
  bas: number; // coût fixe si revenu < 36 045 €
  pourcentage: number; // % du revenu si 36 045 € <= revenu <= 48 060 €
  haut: number; // coût fixe si revenu > 48 060 €
}

const BAREME_RACHAT_TAUX_SEUL: Record<number, TrancheRachat> = {
  20: { bas: 1055, pourcentage: 3.8, haut: 1407 },
  21: { bas: 1076, pourcentage: 3.87, haut: 1434 },
  22: { bas: 1097, pourcentage: 3.95, haut: 1462 },
  23: { bas: 1118, pourcentage: 4.03, haut: 1491 },
  24: { bas: 1168, pourcentage: 4.2, haut: 1557 },
  25: { bas: 1219, pourcentage: 4.39, haut: 1625 },
  26: { bas: 1271, pourcentage: 4.58, haut: 1694 },
  27: { bas: 1324, pourcentage: 4.77, haut: 1765 },
  28: { bas: 1377, pourcentage: 4.96, haut: 1836 },
  29: { bas: 1432, pourcentage: 5.16, haut: 1909 },
  30: { bas: 1487, pourcentage: 5.35, haut: 1983 },
  31: { bas: 1543, pourcentage: 5.55, haut: 2057 },
  32: { bas: 1599, pourcentage: 5.76, haut: 2132 },
  33: { bas: 1656, pourcentage: 5.96, haut: 2208 },
  34: { bas: 1713, pourcentage: 6.17, haut: 2284 },
  35: { bas: 1771, pourcentage: 6.38, haut: 2361 },
  36: { bas: 1828, pourcentage: 6.58, haut: 2438 },
  37: { bas: 1886, pourcentage: 6.79, haut: 2515 },
  38: { bas: 1945, pourcentage: 7.0, haut: 2593 },
  39: { bas: 2005, pourcentage: 7.22, haut: 2673 },
  40: { bas: 2065, pourcentage: 7.43, haut: 2753 },
  41: { bas: 2126, pourcentage: 7.65, haut: 2834 },
  42: { bas: 2187, pourcentage: 7.87, haut: 2915 },
  43: { bas: 2247, pourcentage: 8.09, haut: 2995 },
  44: { bas: 2306, pourcentage: 8.3, haut: 3075 },
  45: { bas: 2366, pourcentage: 8.52, haut: 3154 },
  46: { bas: 2426, pourcentage: 8.74, haut: 3235 },
  47: { bas: 2488, pourcentage: 8.96, haut: 3317 },
  48: { bas: 2549, pourcentage: 9.18, haut: 3398 },
  49: { bas: 2610, pourcentage: 9.4, haut: 3479 },
  50: { bas: 2672, pourcentage: 9.62, haut: 3563 },
  51: { bas: 2734, pourcentage: 9.84, haut: 3646 },
  52: { bas: 2796, pourcentage: 10.07, haut: 3728 },
  53: { bas: 2857, pourcentage: 10.29, haut: 3810 },
  54: { bas: 2919, pourcentage: 10.51, haut: 3891 },
  55: { bas: 2980, pourcentage: 10.73, haut: 3973 },
  56: { bas: 3041, pourcentage: 10.95, haut: 4055 },
  57: { bas: 3103, pourcentage: 11.17, haut: 4138 },
  58: { bas: 3162, pourcentage: 11.39, haut: 4216 },
  59: { bas: 3220, pourcentage: 11.59, haut: 4294 },
  60: { bas: 3275, pourcentage: 11.79, haut: 4367 },
  61: { bas: 3329, pourcentage: 11.99, haut: 4439 },
  62: { bas: 3383, pourcentage: 12.18, haut: 4510 },
  63: { bas: 3298, pourcentage: 11.87, haut: 4397 },
  64: { bas: 3214, pourcentage: 11.57, haut: 4285 },
  65: { bas: 3129, pourcentage: 11.27, haut: 4172 },
  66: { bas: 3044, pourcentage: 10.96, haut: 4059 },
};

const BAREME_RACHAT_TAUX_ET_DUREE: Record<number, TrancheRachat> = {
  20: { bas: 1564, pourcentage: 5.63, haut: 2085 },
  21: { bas: 1594, pourcentage: 5.74, haut: 2126 },
  22: { bas: 1625, pourcentage: 5.85, haut: 2167 },
  23: { bas: 1657, pourcentage: 5.96, haut: 2209 },
  24: { bas: 1731, pourcentage: 6.23, haut: 2308 },
  25: { bas: 1806, pourcentage: 6.5, haut: 2408 },
  26: { bas: 1883, pourcentage: 6.78, haut: 2511 },
  27: { bas: 1961, pourcentage: 7.06, haut: 2615 },
  28: { bas: 2041, pourcentage: 7.35, haut: 2721 },
  29: { bas: 2122, pourcentage: 7.64, haut: 2829 },
  30: { bas: 2204, pourcentage: 7.93, haut: 2938 },
  31: { bas: 2286, pourcentage: 8.23, haut: 3048 },
  32: { bas: 2370, pourcentage: 8.53, haut: 3160 },
  33: { bas: 2454, pourcentage: 8.84, haut: 3272 },
  34: { bas: 2539, pourcentage: 9.14, haut: 3385 },
  35: { bas: 2624, pourcentage: 9.45, haut: 3499 },
  36: { bas: 2709, pourcentage: 9.76, haut: 3613 },
  37: { bas: 2795, pourcentage: 10.06, haut: 3727 },
  38: { bas: 2882, pourcentage: 10.38, haut: 3843 },
  39: { bas: 2971, pourcentage: 10.7, haut: 3961 },
  40: { bas: 3060, pourcentage: 11.02, haut: 4080 },
  41: { bas: 3150, pourcentage: 11.34, haut: 4201 },
  42: { bas: 3240, pourcentage: 11.67, haut: 4320 },
  43: { bas: 3329, pourcentage: 11.99, haut: 4439 },
  44: { bas: 3418, pourcentage: 12.3, haut: 4557 },
  45: { bas: 3506, pourcentage: 12.62, haut: 4674 },
  46: { bas: 3596, pourcentage: 12.95, haut: 4794 },
  47: { bas: 3687, pourcentage: 13.27, haut: 4915 },
  48: { bas: 3777, pourcentage: 13.6, haut: 5036 },
  49: { bas: 3867, pourcentage: 13.92, haut: 5156 },
  50: { bas: 3960, pourcentage: 14.26, haut: 5279 },
  51: { bas: 4052, pourcentage: 14.59, haut: 5402 },
  52: { bas: 4143, pourcentage: 14.92, haut: 5525 },
  53: { bas: 4234, pourcentage: 15.25, haut: 5646 },
  54: { bas: 4325, pourcentage: 15.57, haut: 5767 },
  55: { bas: 4416, pourcentage: 15.9, haut: 5888 },
  56: { bas: 4507, pourcentage: 16.23, haut: 6009 },
  57: { bas: 4599, pourcentage: 16.56, haut: 6132 },
  58: { bas: 4686, pourcentage: 16.87, haut: 6248 },
  59: { bas: 4772, pourcentage: 17.18, haut: 6363 },
  60: { bas: 4854, pourcentage: 17.48, haut: 6472 },
  61: { bas: 4933, pourcentage: 17.76, haut: 6578 },
  62: { bas: 5013, pourcentage: 18.05, haut: 6684 },
  63: { bas: 4888, pourcentage: 17.6, haut: 6517 },
  64: { bas: 4762, pourcentage: 17.15, haut: 6350 },
  65: { bas: 4637, pourcentage: 16.7, haut: 6183 },
  66: { bas: 4512, pourcentage: 16.24, haut: 6015 },
};

const SEUIL_REVENU_BAS = 36045;
const SEUIL_REVENU_HAUT = 48060;

/**
 * Coût d'un trimestre racheté, selon l'âge au moment du rachat, le revenu
 * moyen des 3 dernières années (donnée distincte du SAM) et l'option
 * choisie.
 *
 * En dessous de 20 ans : cas limite sans portée pratique (âge minimum
 * légal d'entrée dans la vie active), on retient la borne basse du barème.
 * Au-delà de 66 ans : retourne `undefined` — contrairement à la borne
 * basse, ce n'est pas une limite de couverture du barème mais une
 * impossibilité légale (le rachat de trimestres n'est plus ouvert
 * au-delà de 66 ans), donc pas de coût à afficher, même approximatif.
 */
export function coutRachatTrimestre(
  age: number,
  revenuMoyen3DernieresAnnees: number,
  option: OptionRachat
): number | undefined {
  // Années révolues (floor), pas arrondi au plus proche : à 66,99 ans on a
  // encore légalement 66 ans, pas 67.
  const ageRevolu = Math.floor(age);
  if (ageRevolu > 66) {
    return undefined;
  }
  const ageBareme = Math.max(20, ageRevolu);
  const bareme = option === 'tauxSeul' ? BAREME_RACHAT_TAUX_SEUL : BAREME_RACHAT_TAUX_ET_DUREE;
  const tranche = bareme[ageBareme];

  if (revenuMoyen3DernieresAnnees < SEUIL_REVENU_BAS) {
    return tranche.bas;
  }
  if (revenuMoyen3DernieresAnnees <= SEUIL_REVENU_HAUT) {
    return revenuMoyen3DernieresAnnees * (tranche.pourcentage / 100);
  }
  return tranche.haut;
}

/**
 * Point mort du rachat, en années : nombre d'années de pension nécessaires
 * pour rentabiliser le coût total, brut de fiscalité (le rachat de
 * trimestres est déductible du revenu imposable, non pris en compte ici).
 */
export function pointMort(coutTotal: number, gainPensionAnnuel: number): number {
  return coutTotal / gainPensionAnnuel;
}
