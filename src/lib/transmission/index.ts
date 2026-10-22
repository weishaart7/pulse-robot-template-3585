import {
  FamilyGraph,
  PatrimonySnapshot,
  Liberalite,
  TransmissionParams,
  TransmissionResult,
  ConjointOption,
  PersonId,
  RawAssetInput
} from './types';
import { calculateSuccessionLegale } from './successionLegale';
import {
  computeMasseCalcul,
  computeReserveAndQD,
  imputeLiberalites,
  applyReductions,
  computeRapport,
  imputeLiberalitesConjoint,
  valeurLiberalite
} from './reserve';
import { computeNotaryFees, computeDebours } from './fiscal';
import { computeNetPerHeir } from './netBreakdown';
import { computePartage } from './partage';
import { getPartSuccessorale, BienNonQualifieError } from '../patrimoine/succession';
import { getFractionDemembrement, DemembrementFractionContext } from '../patrimoine/demembrementFraction';
import { AssetDemembrement } from '../../services/assetDemembrementService';
import {
  computeSoldeRecompenses,
  computeSoldeCreancesEntreEpoux,
  regimeHasMasseCommune,
  RecompenseCalcInput,
  CreanceCalcInput,
} from '../patrimoine/recompensesCreances';
import {
  computeParticipationAcquets,
  regimeIsParticipationAcquets,
  PatrimoineLigneCalcInput,
} from '../patrimoine/participationAcquets';
import { getAssetCategory, isContratHorsSuccession, isBienRuralNonQualifie, getExonerationRurale, getFractionEligibleRurale, isNatureRurale, isPrevoyanceDeces, NATURE_ARTICLE_82, isBien787CNonQualifie, isExonere787C, NATURES_787C, NATURES_PLANCHER_ASSURANCE, TAUX_PLANCHER_ASSURANCE, isAssuranceVieHorsSuccession, NATURE_RETRAITE_ETRANGERE, isPEA, isActionnariatSalarie, NATURE_CRYPTO, isDroitsAuteur } from '../../constants/assetTypes';
import { isDetenteurSpouse } from '../patrimoine/utils';
import {
  computeDMTG,
  DEFAULT_DMTG_PARAMS,
  Asset as DmtgAsset,
  Beneficiary as DmtgBeneficiary,
  CivilShare,
  Donation as DmtgDonation,
  AVContract as DmtgAVContract,
  getPartCaduque
} from '../dmtg';

export interface TransmissionContext {
  family: FamilyGraph;
  patrimony: PatrimonySnapshot;
  liberalites: Liberalite[];
  params: TransmissionParams;
  conjointOption?: ConjointOption;
  // Lignes "assets" brutes (forme Supabase) : computeTransmission fait lui-même
  // l'adaptation vers les Asset[] attendus par computeDMTG (cf. Phase 2 de la
  // consolidation du moteur — computeTransmission est le seul point d'entrée
  // appelé par l'UI, computeDMTG n'est plus jamais invoqué depuis un composant).
  rawAssets?: RawAssetInput[];
  // Démembrement (barème 669 CGI) des rawAssets déjà en Usufruit/Nue-propriété
  // au jour de cette simulation — pondère valeurVenale (dmtgAssets) et la
  // valeur DUH ci-dessous, même mécanisme que usePatrimoineCalculations.ts
  // côté module Patrimoine (lib/patrimoine/demembrementFraction.ts). Sans ces
  // deux champs, un rawAsset démembré reste compté à sa valeur pleine
  // propriété (comportement historique).
  assetDemembrements?: AssetDemembrement[];
  demembrementCtx?: DemembrementFractionContext;
  // Contrats AV déjà construits par utils/transmissionHelpers.ts::buildAVContracts
  // (primes avant/après 70 ans déjà réparties, bénéficiaires résolus vers de
  // vrais familyLinkId/survivingSpouseId) — même logique que `liberalites`,
  // pré-assemblé par l'appelant plutôt que reconstruit ici depuis du brut.
  avContracts?: DmtgAVContract[];
  // Date de référence pour valoriser l'usufruit (barème art. 669 CGI, fonction
  // de l'âge de l'usufruitier) et pour le calcul DMTG (deathDate). Cet outil
  // simule un décès survenant aujourd'hui (le profil du défunt reste
  // `estDecede: false` tant que l'utilisateur est en vie) : il n'existe pas de
  // date de décès réelle à lire ailleurs. Par défaut, la date du jour.
  referenceDate?: string;
  // marital_status.partage_envisage : le droit de partage (art. 746 CGI) n'est dû que
  // si un partage est effectivement envisagé entre les héritiers — jamais présumé par
  // défaut. Sans effet si un héritier est en démembrement, cf. netBreakdown.ts.
  partageEnvisage?: boolean;
  // marital_status.regime_matrimonial (libellé humain, ex. "Communauté réduite
  // aux acquêts (...)") — sert uniquement à déterminer si les récompenses
  // ci-dessous sont pertinentes (masse commune requise, cf.
  // recompensesCreances.ts::regimeHasMasseCommune). Les créances entre époux
  // ne dépendent pas de ce champ (applicables dans tous les régimes).
  regimeMatrimonial?: string;
  // Récompenses et créances entre époux (chantier 3A, art. 1468-1478 et 1479,
  // 1543 C. civ.) — soldes nets ajoutés à la masse successorale via une ligne
  // d'actif synthétique (cf. plus bas), jamais en modifiant getPartSuccessorale
  // bien par bien (mécanisme A laissé intact).
  recompenses?: RecompenseCalcInput[];
  creancesEntreEpoux?: CreanceCalcInput[];
  // Créance de participation (art. 1569-1581 C. civ.), décès uniquement pour
  // cette v1.
  participationAcquets?: {
    patrimoineOriginaire: PatrimoineLigneCalcInput[];
    patrimoineFinal: PatrimoineLigneCalcInput[];
    exclusionBiensProfessionnels: boolean;
    /** Partage inégal de la créance de participation. undefined = partage par moitié (défaut légal). */
    partageInegalPct?: number;
    /** Extension de la qualification d'acquêts (augmente la masse de calcul de la créance). */
    extensionQualificationAcquets?: boolean;
  };
  // Valeur de rachat d'un contrat AV non dénoué du conjoint survivant, à
  // réintégrer dans la masse commune à liquider civilement (doctrine Ciot,
  // §9.6.1 : régime de communauté + origine_fonds deniers_communs, cf.
  // utils/transmissionHelpers.ts::computeAVReintegrationCivile). Canal
  // volontairement séparé d'`avContracts` (qui reste réservé au calcul fiscal
  // 990I/757B) : un contrat non dénoué ne doit jamais transiter par
  // `avContracts` de CE contexte, sous peine d'être taxé à tort dans cette
  // succession — précalculé par l'appelant, jamais dérivé ici d'`avContracts`.
  avReintegrationCivileMontant?: number;
  // marital_status.duh_opte : droit d'usage et d'habitation (DUH, C. civ. art.
  // 764-766, référentiel §5.9) — distinct du droit de jouissance temporaire
  // (§5.8, effet direct du mariage, purement informatif ci-dessous). Le DUH
  // est un droit successoral optionnel (1 an pour se manifester, jamais
  // tacite) : sans ce booléen explicite, aucune valeur n'est imputée sur la
  // part du conjoint — pas de calcul automatique par défaut.
  duhOpte?: boolean;
  // marital_status.valeur_biens_partage : valeur nette des biens existants au
  // jour du partage (masse à partager, art. 860). Absente = valeurs du décès.
  // Sans effet sur la réserve, la réduction ni la fiscalité (décès).
  valeurBiensPartage?: number | null;
  // Sociétés dont le pacte Dutreil est validé (societe_dutreil.eligibilite_validee,
  // art. 787 B CGI) : les titres rattachés (assets.societe_id) sont exonérés à
  // 75 % dans l'assiette des droits. Engagement individuel de conservation des
  // héritiers (4 ans, 6 ans depuis le 21/02/2026) présumé, signalé dans les explications.
  societesDutreil?: string[];
  // Part (0 à 100 %) de la valeur des titres de chaque société Dutreil
  // correspondant à des biens non affectés à l'activité (societe_dutreil.
  // part_biens_non_affectes, LF 2026) — exclue de l'exonération. Obligatoire
  // (0 accepté) pour une transmission depuis le 21/02/2026, sinon calcul bloqué.
  dutreilPartsNonAffectees?: Record<string, number | null>;
  // Dettes rattachées à un bien (emprunts.asset_id), déjà pondérées et
  // comprises dans patrimony.passifs (cf. transmissionHelpers.ts::
  // buildPassifsParBien) : imputées par priorité sur un bien exonéré (art.
  // 769 II CGI).
  passifsParBien?: Record<string, number>;
}

// Loi n° 2026-103 du 19/02/2026, art. 8 : engagement individuel porté à 6 ans
// et exclusion des biens non affectés à l'activité, transmissions depuis cette date.
export const DATE_DUTREIL_LF2026 = '2026-02-21';

/**
 * Rôle ('user' ou 'spouse') du défunt simulé dans CE calcul, déduit de
 * family.decedentId selon la convention déjà posée par
 * utils/transmissionHelpers.ts (buildFamilyGraph : decedentId =
 * familyProfile.id, rôle 'user' ; buildSpouseAsDecedentFamilyGraph :
 * decedentId = `conjoint-${familyProfile.id}`, rôle 'spouse' — même
 * mécanisme que celui utilisé pour construire le second décès dans
 * computeChainedTransmission, pas un nouveau système). Un FamilyGraph
 * construit hors de ces deux fonctions (fixtures de test, ids arbitraires)
 * retombe par défaut sur 'user' — sans incidence tant qu'aucune récompense
 * ni créance n'est fournie pour ce calcul.
 */
export function getDecedentRole(decedentId: PersonId): 'user' | 'spouse' {
  return decedentId.startsWith('conjoint-') ? 'spouse' : 'user';
}

/**
 * Pourcentage de la valeur en pleine propriété representé par l'usufruit ou la
 * nue-propriété, selon l'âge de l'usufruitier (barème forfaitaire art. 669 CGI).
 * Usufruit et nue-propriété sont deux droits sur la MÊME assiette : leurs
 * pourcentages somment toujours à 1 pour une tranche d'âge donnée.
 */
export function getDemembrementPct(age: number, type: 'usufruit' | 'nue_propriete'): number {
  const entry = DEFAULT_DMTG_PARAMS.demembrementViager.find(
    (e) => age >= e.minAge && age <= e.maxAge
  );
  if (!entry) {
    throw new Error(`Aucune tranche du barème 669 CGI trouvée pour l'âge ${age}`);
  }
  return type === 'usufruit' ? entry.usufruitPct : entry.nuePropPct;
}

/**
 * Âge d'une personne à une date de référence, à partir de sa date de
 * naissance — seule variable du barème 669 CGI. Factorisé pour être
 * réutilisable par tout usufruitier (conjoint via getConjointAge, ou tout
 * autre bénéficiaire désigné en usufruit dans une clause d'assurance-vie,
 * cf. transmissionHelpers.ts::buildAVContracts).
 */
export function getAgeAtDate(dateNaissance: string, referenceDateISO: string): number {
  const naissance = new Date(dateNaissance);
  const reference = new Date(referenceDateISO);
  let age = reference.getFullYear() - naissance.getFullYear();
  const moisPasse = reference.getMonth() - naissance.getMonth();
  if (moisPasse < 0 || (moisPasse === 0 && reference.getDate() < naissance.getDate())) {
    age--;
  }
  return age;
}

/**
 * Âge du conjoint survivant à la date de référence, seule variable du barème
 * 669 CGI. Pas de valeur par défaut en cas de date de naissance manquante :
 * un âge deviné produirait un montant fiscal silencieusement faux.
 */
export function getConjointAge(family: FamilyGraph, referenceDateISO: string): number {
  const conjoint = family.persons.find(p => p.id === family.survivingSpouseId);
  if (!conjoint?.dateNaissance) {
    throw new Error(
      "Date de naissance du conjoint manquante : impossible de valoriser l'usufruit (barème art. 669 CGI)."
    );
  }
  return getAgeAtDate(conjoint.dateNaissance, referenceDateISO);
}

// Natures de dons exonérés (DonationForm.tsx) : don familial de sommes d'argent (art. 790 G) et
// dons d'argent exonérés de l'art. 790 A bis, avec leur période d'application.
export const NATURE_790G = "Dons familiaux de sommes d'argent";
export const NATURES_790A_BIS: Record<string, { debut: string; fin: string }> = {
  "Don d'argent pour résidence principale (2025)": { debut: '2025-02-15', fin: '2026-12-31' },
  "Don d'argent sous condition de remploi (2020)": { debut: '2020-07-15', fin: '2021-06-30' }
};

/**
 * Libéralités du défunt simulé (`role`), pondérées selon leur donateur :
 * 100 % pour ses propres donations, 50 % pour une donation de biens communs
 * consentie par les deux époux (chacun donateur pour moitié : masse de
 * calcul, rapport — art. 850 C. civ. —, rappel fiscal — art. 784 CGI), 0 %
 * pour celles de l'autre époux. Les legs, toujours de l'Utilisateur, ne
 * jouent que dans sa succession. Les valeurs pondérées sont toutes celles
 * portées par la libéralité (décès, acte, partage, forfait de rapport).
 */
export function liberalitesDuDefunt(liberalites: Liberalite[], role: 'user' | 'spouse'): Liberalite[] {
  return liberalites.flatMap(lib => {
    if (lib.type === 'legs') return role === 'user' ? [lib] : [];
    const donateur = lib.donateur ?? 'user';
    const coef = donateur === 'communaute' ? 0.5 : donateur === role ? 1 : 0;
    if (coef === 0) return [];
    if (coef === 1) return [lib];
    const pondere = (v: number | undefined) => (v === undefined ? undefined : v * coef);
    return [{
      ...lib,
      valeur: lib.valeur * coef,
      valeurFiscaleActe: pondere(lib.valeurFiscaleActe),
      valeurPartage: pondere(lib.valeurPartage),
      montantRapportForfaitaire: pondere(lib.montantRapportForfaitaire)
    }];
  });
}

/**
 * Orchestrateur principal : calcule la transmission complète (dévolution
 * civile + fiscalité DMTG + net par héritier). Seul point d'entrée appelé
 * par l'UI — computeDMTG n'est plus invoqué directement par les composants.
 */
export function computeTransmission(ctx: TransmissionContext): TransmissionResult {
  const { family, params, conjointOption, rawAssets, partageEnvisage, duhOpte } = ctx;
  const explicationsLiberalites: string[] = [];
  // Sentinelle 'conjoint' (liberalites.beneficiaire_conjoint) résolue vers le
  // conjoint du graphe — marié (héritier) ou partenaire de PACS (légataire
  // seulement). Conjoint prédécédé dans ce chaînage : legs caduc (art. 1039
  // C. civ.), donation conservée dans la masse de calcul (art. 922) sous un id
  // sans héritier. Sans conjoint dans le graphe (divorce…) : traité comme un tiers.
  const referenceDate = ctx.referenceDate || new Date().toISOString().split('T')[0];
  const liberalitesDefunt = liberalitesDuDefunt(ctx.liberalites, getDecedentRole(family.decedentId))
    .filter(lib => {
      const caduc = lib.type === 'legs' && lib.beneficiaireId === 'conjoint' && !family.survivingSpouseId && !!family.conjointPredecede;
      if (caduc) {
        explicationsLiberalites.push(
          `Legs « ${lib.beneficiaireName || lib.id} » au conjoint prédécédé : caduc (C. civ. art. 1039), les biens restent dans la succession.`
        );
      }
      return !caduc;
    });
  // Libéralité en usufruit viager : usufruit du bénéficiaire au barème 669 CGI
  // selon son âge au décès (valeur au jour du décès, art. 922). Jamais deviné :
  // bénéficiaire hors fiche ou sans date de naissance → erreur explicite.
  const liberalites = liberalitesDefunt.map(lib => {
    const resolue = lib.beneficiaireId === 'conjoint'
      ? { ...lib, beneficiaireId: family.survivingSpouseId || (family.conjointPredecede ? 'conjoint-predecede' : 'tiers') }
      : lib;
    if (resolue.droitTransmis !== 'usufruit') return resolue;
    // Usufruit donné au conjoint prédécédé : éteint à son décès, plus rien à évaluer.
    if (resolue.beneficiaireId === 'conjoint-predecede') return { ...resolue, pctUsufruit: 0 };
    const beneficiaire = family.persons.find(p => p.id === resolue.beneficiaireId);
    if (!beneficiaire?.dateNaissance) {
      throw new Error(
        `Libéralité en usufruit « ${resolue.beneficiaireName || resolue.id} » : date de naissance du bénéficiaire ` +
        `manquante, impossible de valoriser l'usufruit (barème art. 669 CGI).`
      );
    }
    return { ...resolue, pctUsufruit: getDemembrementPct(getAgeAtDate(beneficiaire.dateNaissance, referenceDate), 'usufruit') };
  });

  // 0. Récompenses (art. 1468-1478 C. civ.) et créances entre époux
  // (art. 1479, 1543 C. civ.) — chantier 3A, branché sur le mécanisme A.
  // Le solde net vient ajuster la masse successorale AVANT le
  // calcul par bien (impact civil : réserve/QD/parts des héritiers) ET dans
  // dmtgAssets (impact fiscal, cf. plus bas) — les deux doivent bouger
  // ensemble pour rester alignés, comme le reste du mécanisme A
  // (cf. commentaire de valeurVenale plus bas sur cet alignement).
  const decedentRole = getDecedentRole(family.decedentId);

  // Valeur d'un rawAsset repliée sur valeur_acquisition si valeur_estimee est
  // absente (même ordre de repli que buildPatrimonySnapshot côté civil,
  // utils/transmissionHelpers.ts), puis pondérée par le barème 669 CGI pour un
  // actif en Usufruit/Nue-propriété (même fonction que le Résumé Patrimoine,
  // lib/patrimoine/demembrementFraction.ts::getFractionDemembrement). Fraction
  // non calculable (âge de l'usufruitier manquant) : valeur 0, jamais compté à
  // sa valeur pleine propriété. Usufruit viager : éteint au décès de son
  // titulaire (art. 617 C. civ., art. 1133 CGI), valeur successorale nulle —
  // même règle que transmissionHelpers.ts côté civil.
  const getValeurEstimeePonderee = (asset: RawAssetInput): number => {
    if (asset.mode_detention === 'Usufruit') return 0;
    const brute = Number(asset.valeur_estimee) || Number(asset.valeur_acquisition) || 0;
    const demembrementsForAsset = (ctx.assetDemembrements || []).filter(d => d.asset_id === asset.id);
    const fraction = getFractionDemembrement(asset, demembrementsForAsset, ctx.demembrementCtx || {});
    return fraction === null ? 0 : brute * fraction;
  };

  // Un contrat AV n'est dénoué — et donc fiscalement taxable (990I/757B) —
  // que par le décès de son détenteur réel (souscripteur/assuré). Un contrat
  // détenu par le conjoint survivant n'est jamais dénoué par le décès simulé
  // ici : il ne doit jamais entrer dans l'assiette fiscale de CETTE
  // succession (doctrine Ciot, §9.6.1), quel que soit le régime matrimonial —
  // sa réintégration civile éventuelle passe par `avReintegrationCivileMontant`
  // (canal séparé, cf. TransmissionContext), jamais par ce tableau. Détenteur
  // absent (contrats existants non renseignés) : rattaché à l'Utilisateur par
  // défaut, même convention que `assets.detenteur`/isDetenteurUser.
  const avContracts = (ctx.avContracts || []).filter(
    contract => (contract.detenteur ?? 'user') === decedentRole
  );
  const soldeRecompenses = computeSoldeRecompenses(ctx.recompenses || []);
  const soldeCreances = computeSoldeCreancesEntreEpoux(ctx.creancesEntreEpoux || []);

  // Récompenses : seulement pertinentes si le régime a une masse commune (cf.
  // regimeHasMasseCommune). La communauté varie de la somme des soldes
  // (solde = doit − dû), dont le défunt recueille la moitié (ratio 50 % de
  // getPartSuccessorale('Bien commun')) ; mais il paie lui-même son propre
  // solde. Effet net : (solde survivant − solde défunt) / 2 — une récompense
  // due par le défunt réduit sa succession, celle due par le survivant l'accroît.
  const survivantRole = decedentRole === 'user' ? 'spouse' : 'user';
  const impactRecompenses = regimeHasMasseCommune(ctx.regimeMatrimonial)
    ? (soldeRecompenses.parEpoux[survivantRole].soldeNet - soldeRecompenses.parEpoux[decedentRole].soldeNet) / 2
    : 0;
  // Créances entre époux : dette/créance du patrimoine PROPRE du défunt
  // simulé, à 100% (pas de fractionnement, contrairement à la masse commune).
  const impactCreances = soldeCreances[decedentRole];
  const deltaRecompensesCreances = impactRecompenses + impactCreances;

  // 0ter. Créance de participation aux acquêts (art. 1569-1581 C. civ.),
  // décès uniquement pour cette v1. N'opère jamais sur rawAssets/
  // qualification_bien (contrairement aux avantages matrimoniaux ci-dessous) :
  // symétrique dans les deux sens de décès par construction, cf. commentaire
  // de TransmissionContext.participationAcquets. Défunt débiteur → passif de
  // sa succession (delta négatif) ; défunt créancier → actif (delta positif) ;
  // créance nulle (acquêts nets égaux) → aucun impact.
  let deltaParticipationAcquets = 0;
  if (ctx.participationAcquets && regimeIsParticipationAcquets(ctx.regimeMatrimonial)) {
    const { epouxDebiteur, epouxCreancier, montantCreance } = computeParticipationAcquets({
      patrimoineOriginaire: ctx.participationAcquets.patrimoineOriginaire,
      patrimoineFinal: ctx.participationAcquets.patrimoineFinal,
      exclusionBiensProfessionnels: ctx.participationAcquets.exclusionBiensProfessionnels,
      partCreancierPct: ctx.participationAcquets.partageInegalPct,
      extensionQualificationAcquets: ctx.participationAcquets.extensionQualificationAcquets,
    });
    if (epouxDebiteur === decedentRole) {
      deltaParticipationAcquets = -montantCreance;
    } else if (epouxCreancier === decedentRole) {
      deltaParticipationAcquets = montantCreance;
    }
  }

  // Fraction successorale par bien : getPartSuccessorale (comportement
  // légal par défaut) — même fonction utilisée côté civil (delta ci-dessous)
  // et côté fiscal (dmtgAssets plus bas), pour rester alignés.
  const getFractionSuccessorale = (asset: RawAssetInput): number =>
    getPartSuccessorale(asset, asset.denomination || asset.id);

  // patrimony est ré-ancré ici (plutôt que déstructuré directement depuis ctx
  // avec les autres champs ci-dessus) pour que TOUTES les lectures en aval de
  // patrimony.biensExistants — masse de calcul, rapport pour partage, frais de
  // notaire, transmission nette, netBreakdown — intègrent le même ajustement.
  // Sans ce ré-ancrage local, seule l'assiette fiscale (dmtgAssets ci-dessous)
  // bougerait, désalignant à nouveau le civil et le fiscal (cf. le bug déjà
  // corrigé une fois entre Synthese.tsx et ProcessusCalcul.tsx sur
  // netBreakdown, lib/patrimoine/succession.ts).
  // Capital des contrats dénoués par CE décès dont la clause est caduque
  // (tous bénéficiaires renoncés ou prédécédés) : entre dans la succession
  // du souscripteur (art. L132-11 C. assur.), au civil ci-dessous comme au
  // fiscal (ligne synthétique dans dmtgAssets) — jamais taxé en 990I/757B,
  // resolveEffectiveAVBeneficiaires ne lui attribuant aucun bénéficiaire.
  const capitalAVCaduc = avContracts.reduce(
    (sum, contract) => sum + contract.capitalDeces * getPartCaduque(contract.niveaux), 0
  );
  const deltaCivilTotal = deltaRecompensesCreances + deltaParticipationAcquets
    + (ctx.avReintegrationCivileMontant || 0) + capitalAVCaduc;
  const patrimony: PatrimonySnapshot = deltaCivilTotal !== 0
    ? { ...ctx.patrimony, biensExistants: ctx.patrimony.biensExistants + deltaCivilTotal }
    : ctx.patrimony;

  // 1. Dévolution civile (succession légale, source unique de vérité)
  // hasTestament = false : la dévolution légale détermine toujours les réservataires,
  // un testament ne fait que redistribuer la quotité disponible (ne supprime pas la réserve).
  const successionLegaleResult = calculateSuccessionLegale(family, false, conjointOption);
  const heirsShares = successionLegaleResult.heritiers;
  successionLegaleResult.explicationsTexte.push(...explicationsLiberalites);

  // Usufruit du conjoint au barème 669 (âge au décès) : nécessaire dès qu'un
  // démembrement légal/DDV ou une libéralité au conjoint existe (quotité
  // spéciale, art. 1094-1). Date de naissance manquante : erreur si un
  // usufruit doit être valorisé ; sinon 0 (disponible ramené à la QDO en PP).
  const conjointId = family.hasSurvivingSpouse ? family.survivingSpouseId : undefined;
  // Conjoint marié ou partenaire de PACS (légataire) : tous deux peuvent
  // recevoir une libéralité en usufruit.
  const usufruitConjointRequis = successionLegaleResult.heritiers.some(h => h.typeQuotePart === 'usufruit')
    || liberalites.some(l => l.droitTransmis === 'usufruit' && l.beneficiaireId === family.survivingSpouseId);
  const conjointPersonne = family.persons.find(p => p.id === family.survivingSpouseId);
  const pctUsufruitConjoint = family.survivingSpouseId && (usufruitConjointRequis || conjointPersonne?.dateNaissance)
    ? getDemembrementPct(getConjointAge(family, referenceDate), 'usufruit')
    : 0;

  // 2. Masse de calcul / réserve / QD
  const masseCalcul = computeMasseCalcul(patrimony, liberalites);
  // Nombre d'enfants au sens de la réserve = nombre de souches (enfants
  // vivants ou représentés) déjà calculé par calculateSuccessionLegale, qui
  // tient compte des décès ET des renonciations (successionLegale.ts).
  // Ne pas recalculer séparément à partir de family.childrenOfDecedent : ce
  // dernier liste tous les enfants au sens civil (vivants, décédés,
  // renonçants) et ne reflète pas les souches réellement héritières.
  const nbEnfants = successionLegaleResult.nbSouchesEnfants;

  const reserveResult = computeReserveAndQD(
    masseCalcul,
    nbEnfants,
    family.hasSurvivingSpouse
  );

  // 3. Imputation donations -> legs
  // childrenIds = uniquement les souches encore actives dans cette
  // succession (cf. Règle D : un enfant renonçant sans descendance ne doit
  // pas diluer la réserve personnelle des autres souches dans le calcul
  // d'imputation ci-dessous).
  // Quotité spéciale entre époux (art. 1094-1) : en présence de descendants,
  // les libéralités au conjoint sont imputées à part (imputeLiberalitesConjoint).
  const conjointQDSId = conjointId && nbEnfants > 0 ? conjointId : undefined;
  const imputationResult = imputeLiberalites(
    liberalites,
    reserveResult,
    successionLegaleResult.souchesEnfantsRootIds,
    conjointQDSId,
    conjointId && nbEnfants === 0 ? conjointId : undefined
  );

  // 4. Réduction si nécessaire
  const reductionAutres = applyReductions(
    liberalites,
    imputationResult,
    reserveResult
  );
  const imputationConjoint = conjointQDSId
    ? imputeLiberalitesConjoint(liberalites, conjointQDSId, reserveResult, imputationResult)
    : undefined;
  const reductionResult = imputationConjoint && imputationConjoint.reductions.length > 0
    ? {
        reductions: [...reductionAutres.reductions, ...imputationConjoint.reductions],
        totalReduit: reductionAutres.totalReduit + imputationConjoint.reductions.reduce((s, r) => s + r.montantReduit, 0)
      }
    : reductionAutres;
  if (reductionAutres.reductions.some(r => liberalites.find(l => l.id === r.liberaliteId)?.droitTransmis === 'usufruit')) {
    successionLegaleResult.explicationsTexte.push(
      `Une libéralité en usufruit excède la quotité disponible : elle est comparée « en assiette » ` +
      `(les biens qu'elle grève face à la quotité disponible, Cass. civ. 1, 22 juin 2022) et réduite ` +
      `à l'usufruit de ce qui reste disponible ; les héritiers réservataires recouvrent la pleine ` +
      `propriété du surplus.`
    );
  }
  if (imputationConjoint && imputationConjoint.reductions.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Les libéralités consenties au conjoint excèdent la quotité disponible spéciale entre époux ` +
      `(C. civ. art. 1094-1 : quotité ordinaire en pleine propriété, 1/4 en pleine propriété et 3/4 en ` +
      `usufruit, ou totalité en usufruit), compte tenu des libéralités faites à d'autres : elles sont ` +
      `réduites. Contrôle « en assiette » : l'usufruit se compare par les biens qu'il grève ` +
      `(Cass. civ. 1, 22 juin 2022).`
    );
  }

  // 5. Rapport pour partage (égalité entre héritiers) — souchesEnfantsRootIds
  // permet à computeRapport de distinguer un legs 'sur part successorale' à
  // un enfant réservataire (rééquilibré comme une donation rapportable) d'un
  // legs 'hors part' (prélevé sur le pot avant division).
  const rapportResult = computeRapport(
    patrimony,
    liberalites,
    reductionResult,
    successionLegaleResult.souchesEnfantsRootIds
  );

  // 6. Partage entre héritiers (lib/transmission/partage.ts — audit « résultat
  // notaire » du 2026-09-29, règles R1-R5 documentées dans docs/transmission.md) :
  // ce que chacun détient déjà (donations), reçoit des biens de la succession
  // (clé de l'assiette DMTG), reçoit ou doit en soulte de rapport, et reçoit
  // au titre d'une indemnité de réduction. Le démembrement usufruit /
  // nue-propriété est valorisé au barème 669 CGI (âge du conjoint au décès).
  const actifNet = Math.max(0, patrimony.biensExistants - patrimony.passifs);
  const residuelReel = actifNet;
  // 6bis-0. Legs maintenus à des légataires qui n'héritent pas (tiers, famille
  // hors dévolution légale, partenaire de PACS) : déjà retirés de
  // massePartageable par computeRapport, ils doivent aussi sortir du résiduel
  // réel AVANT la répartition du cash entre héritiers — sans quoi la branche
  // « surplus » ci-dessous les reverse aux héritiers (qui seraient taxés sur
  // un bien qui ne leur revient pas) et le légataire n'est jamais taxé. Un
  // legs sans bénéficiaire identifié ('tiers') reste une ligne distincte par
  // legs (personnes a priori différentes). Si les legs excèdent le résiduel
  // (passif important), ils sont ramenés au prorata du disponible.
  const heirIds = new Set(heirsShares.map(h => h.personId));
  const legsNonHeritiersBruts = liberalites
    .filter(lib => lib.type === 'legs' && !heirIds.has(lib.beneficiaireId))
    .map(lib => {
      const reduction = reductionResult.reductions.find(r => r.liberaliteId === lib.id);
      return {
        personId: lib.beneficiaireId === 'tiers' ? `tiers-${lib.id}` : lib.beneficiaireId,
        nom: lib.beneficiaireName || 'Légataire',
        montant: Math.max(0, valeurLiberalite({ ...lib, valeur: lib.valeur - (reduction?.montantReduit || 0) }))
      };
    })
    .filter(l => l.montant > 0);
  const totalLegsNonHeritiersBrut = legsNonHeritiersBruts.reduce((sum, l) => sum + l.montant, 0);
  const ratioLegs = totalLegsNonHeritiersBrut > residuelReel && totalLegsNonHeritiersBrut > 0
    ? residuelReel / totalLegsNonHeritiersBrut
    : 1;
  const legsParLegataire = new Map<PersonId, { personId: PersonId; nom: string; montant: number }>();
  legsNonHeritiersBruts.forEach(l => {
    const existing = legsParLegataire.get(l.personId);
    if (existing) existing.montant += l.montant * ratioLegs;
    else legsParLegataire.set(l.personId, { ...l, montant: l.montant * ratioLegs });
  });
  const legsNonHeritiers = Array.from(legsParLegataire.values());
  const totalLegsNonHeritiers = legsNonHeritiers.reduce((sum, l) => sum + l.montant, 0);

  const hasDemembrement = heirsShares.some(h => h.typeQuotePart === 'usufruit' || h.typeQuotePart === 'nue_propriete');
  // Option du conjoint issue d'une donation au dernier vivant (libéralité,
  // soumise à la quotité spéciale) plutôt que de la loi (art. 757).
  const conjointAUsufruit = heirsShares.some(h => h.personId === conjointId && h.typeQuotePart === 'usufruit')
    || liberalites.some(l => l.beneficiaireId === conjointId && l.droitTransmis === 'usufruit');
  const optionIssueDDV = !!family.hasDDV && (
    conjointOption === 'qd_pp' || conjointOption === 'quart_pp_3quarts_us' ||
    (conjointOption === 'usufruit_total' && !successionLegaleResult.optionConjoint?.enfantsCommuns)
  );
  const partage = computePartage({
    lines: heirsShares.map(h => ({ personId: h.personId, quotePart: h.quotePart, typeQuotePart: h.typeQuotePart })),
    biensExistants: patrimony.biensExistants,
    passifs: patrimony.passifs,
    liberalites,
    reductions: reductionResult,
    rapports: rapportResult.rapports,
    childrenIds: successionLegaleResult.souchesEnfantsRootIds,
    spouseId: family.hasSurvivingSpouse ? family.survivingSpouseId : undefined,
    // Pleine propriété encore disponible : QDO moins les libéralités aux
    // autres et, sous quotité spéciale, la PP déjà reçue par le conjoint.
    // Pleine propriété encore disponible pour le conjoint : QDO restante, ou
    // le quart s'il reçoit aussi de l'usufruit (option DDV ou libéralité).
    qdRestante: imputationConjoint
      ? Math.max(0, (conjointAUsufruit ? imputationConjoint.ppMaxAvecUsufruit : imputationConjoint.ppMaxSansUsufruit)
          - imputationConjoint.ppMaintenue)
      : Math.max(0, reserveResult.quotiteDisponible - Math.min(imputationResult.besoinTotalSurQD, reserveResult.quotiteDisponible)),
    // Option issue d'une DDV : l'assiette de son usufruit est plafonnée « en
    // assiette » par ce que laissent les autres libéralités (art. 1094-1).
    plafondAssietteUsufruitDDV: imputationConjoint && optionIssueDDV
      ? Math.max(0, imputationConjoint.assietteUsufruitMax - imputationConjoint.assietteUsufruitMaintenue)
      : undefined,
    totalLegsNonHeritiers,
    ratioBiensPartage: ctx.valeurBiensPartage != null && actifNet > 0
      ? Math.max(0, ctx.valeurBiensPartage) / actifNet
      : 1,
    pctUsufruit: hasDemembrement || usufruitConjointRequis ? pctUsufruitConjoint : 0,
    pctNuePropriete: hasDemembrement || usufruitConjointRequis ? 1 - pctUsufruitConjoint : 1,
  });

  const heirs = heirsShares.map((heir, i) => {
    const p = partage.heirs[i];
    return {
      personId: heir.personId,
      nom: `${heir.prenom} ${heir.nom}`.trim(),
      lien: heir.lien,
      partCivile: heir.quotePart * masseCalcul,
      partFinale: Math.max(0, p.partFinale),
      typeQuotePart: heir.typeQuotePart,
      representation: heir.representation,
      representationRootId: heir.representationRootId,
      representationCount: heir.representationCount,
      pluraliteSouches: heir.pluraliteSouches,
      dejaDetenu: p.dejaDetenu,
      recuSuccession: p.recuSuccession,
      soulte: p.soulte,
      indemniteReduction: p.indemniteReduction,
      valeurUsufruit: p.valeurUsufruit
    };
  });
  const cashReparti = heirs.map(h => h.recuSuccession);

  if (partage.droitsConjointPlafonnes) {
    successionLegaleResult.explicationsTexte.push(
      `Les droits du conjoint en pleine propriété sont limités aux biens restant disponibles : ` +
      `ils ne s'exercent que sur les biens non légués et sans entamer la réserve des enfants ` +
      `(C. civ. art. 758-5 al. 2), après imputation des libéralités qu'il a déjà reçues (art. 758-6).`
    );
  }
  heirs.forEach((h, i) => {
    if (h.soulte < 0 && partage.heirs.findIndex((_, k) => heirs[k].personId === h.personId) === i) {
      successionLegaleResult.explicationsTexte.push(
        `${h.nom} a reçu des donations rapportables supérieures à sa part : il doit une soulte de ` +
        `${Math.round(-h.soulte).toLocaleString('fr-FR')} € à ses cohéritiers (rapport en valeur, C. civ. ` +
        `art. 858 et 860), en supposant qu'il accepte la succession.`
      );
    }
  });
  const partageADesValeursPropres = ctx.valeurBiensPartage != null
    || liberalites.some(l => l.type === 'donation' && l.valeurPartage !== undefined);
  if (partageADesValeursPropres) {
    successionLegaleResult.explicationsTexte.push(
      `Partage évalué au jour du partage (C. civ. art. 860) : rapports à la valeur des biens donnés au ` +
      `partage, dans leur état au jour de la donation, indemnités de réduction réévaluées (art. 924-2), ` +
      `biens existants à leur valeur au partage. Réserve, réduction et droits de succession restent ` +
      `calculés au jour du décès (art. 922).`
    );
  }
  if (partage.totalIndemnitesReduction > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Une ou plusieurs donations excèdent la quotité disponible : le donataire doit une indemnité de ` +
      `réduction de ${Math.round(partage.totalIndemnitesReduction).toLocaleString('fr-FR')} € aux ` +
      `héritiers réservataires (C. civ. art. 924), intégrée à leur part.`
    );
  }

  // 5.9bis. Droit d'usage et d'habitation (DUH, C. civ. art. 764-766,
  // référentiel §5.9) — optionnel (1 an pour se manifester, jamais tacite,
  // d'où `duhOpte` explicite). Sa valeur s'impute sur ce que le conjoint
  // reçoit des biens de la succession (art. 765) ; si elle dépasse ses droits,
  // aucune soulte n'est due. La part ainsi imputée revient aux autres
  // héritiers, au prorata de ce qu'ils reçoivent déjà de la succession.
  // Assiette : logement de nature exacte 'Résidence principale', sans
  // vérification d'occupation ni des exclusions légales (SCI, logement loué,
  // usufruit seul du défunt), signalées dans le texte. Valeur = 60 % de
  // l'usufruit (barème 669 CGI) à l'âge du conjoint un an après le décès.
  if (duhOpte && family.hasSurvivingSpouse && rawAssets) {
    const valeurLogementDUH = rawAssets
      .filter(asset => asset.nature === 'Résidence principale')
      .reduce((sum, asset) => sum + getValeurEstimeePonderee(asset) * getFractionSuccessorale(asset), 0);

    if (valeurLogementDUH > 0) {
      const referenceDateUnAnApres = new Date(referenceDate);
      referenceDateUnAnApres.setFullYear(referenceDateUnAnApres.getFullYear() + 1);
      const ageConjointDansUnAn = getConjointAge(family, referenceDateUnAnApres.toISOString().slice(0, 10));
      const pctUsufruitDUH = getDemembrementPct(ageConjointDansUnAn, 'usufruit');
      const valeurDUH = valeurLogementDUH * pctUsufruitDUH * 0.60;

      const estConjoint = (i: number) => heirs[i].personId === family.survivingSpouseId;
      const recuConjoint = cashReparti.reduce((sum, c, i) => sum + (estConjoint(i) ? c : 0), 0);
      const imputeDUH = Math.min(valeurDUH, recuConjoint);
      const recuAutres = cashReparti.reduce((sum, c, i) => sum + (estConjoint(i) ? 0 : c), 0);
      if (imputeDUH > 0 && recuAutres > 0) {
        cashReparti.forEach((c, i) => {
          cashReparti[i] = estConjoint(i)
            ? c - imputeDUH * (recuConjoint > 0 ? c / recuConjoint : 0)
            : c + imputeDUH * (c / recuAutres);
        });
        // Aligne ce qui est reçu de la succession (lu au 2nd décès) sur le DUH.
        cashReparti.forEach((c, i) => { heirs[i].recuSuccession = c; });
      }

      successionLegaleResult.explicationsTexte.push(
        `Le conjoint survivant a opté pour le droit d'usage et d'habitation sur le logement qui ` +
        `constituait la résidence principale effective du défunt (C. civ. art. 764-766) — option ` +
        `exercée dans le délai d'un an, non tacite. Valeur retenue : 60% de la valeur d'usufruit du ` +
        `logement selon le barème art. 669 CGI, calculée à l'âge du conjoint un an après le décès ` +
        `(${ageConjointDansUnAn} ans), soit ${Math.round(valeurDUH).toLocaleString('fr-FR')} € ` +
        `(${Math.round(valeurLogementDUH).toLocaleString('fr-FR')} € × ${Math.round(pctUsufruitDUH * 100)}% × 60%). ` +
        `Cette valeur s'impute sur la part successorale du conjoint (elle ne s'y ajoute pas) : si elle ` +
        `dépasse la part qui lui revient, aucune soulte n'est due aux autres héritiers. Sont exclus de ` +
        `l'assiette : logement détenu via une SCI (sauf bail), logement loué, logement dont le défunt ` +
        `n'avait que l'usufruit après cession de la nue-propriété — à vérifier au cas par cas par le ` +
        `notaire, non qualifié automatiquement ici.`
      );
    }
  }

  // 6ter. Droit de jouissance temporaire du logement (C. civ. art. 763,
  // référentiel §5.8) — effet DIRECT du mariage, non successoral : ne s'impute
  // JAMAIS sur la part civile du conjoint (heirs ci-dessus n'est pas modifié
  // par ce bloc), il s'ajoute à celle-ci. Automatique, gratuit, sans
  // formalité, durée 1 an. Purement informatif ici : aucune donnée du
  // patrimoine ne permet aujourd'hui de distinguer un logement loué (jamais
  // un actif détenu, donc invisible de rawAssets) d'un logement en SCI ou
  // d'un usufruit exclusif du défunt (exclusions légales) — le notaire doit
  // vérifier l'assiette réelle avant d'en confirmer le bénéfice, cf.
  // caveat dans le texte ci-dessous plutôt qu'une nouvelle donnée saisie.
  if (family.hasSurvivingSpouse) {
    successionLegaleResult.explicationsTexte.push(
      `Le conjoint survivant bénéficie de plein droit, pendant un an à compter du décès, ` +
      `de la jouissance gratuite du logement qui constituait sa résidence principale effective ` +
      `(C. civ. art. 763) — que ce logement soit détenu en propre par les époux, en indivision, ` +
      `commun, ou loué. Ce droit est un effet direct du mariage : il ne s'impute pas sur sa part ` +
      `successorale, il s'ajoute à celle-ci. Sont exclus : résidence secondaire, logement détenu ` +
      `via une SCI (sauf bail entre la société et les époux), logement dont le défunt n'était ` +
      `qu'usufruitier. Si les époux étaient locataires, les loyers remboursés par la succession ` +
      `sont déductibles de l'actif en cas d'exécution en espèces (art. 768 CGI) — à confirmer au cas par cas.`
    );
  } else if (family.survivantPartenairePacs && family.survivingSpouseId) {
    // Partenaire de PACS : même droit temporaire d'un an (art. 515-6 al. 3,
    // renvoi à l'art. 763 al. 1 et 2), alors qu'il n'est pas héritier. Le
    // droit viager au logement (art. 764) ne lui est en revanche pas ouvert.
    successionLegaleResult.explicationsTexte.push(
      `Le partenaire de PACS survivant bénéficie de plein droit, pendant un an à compter du décès, ` +
      `de la jouissance gratuite du logement qui constituait sa résidence principale effective ` +
      `et du mobilier qui le garnit (C. civ. art. 515-6 al. 3, renvoyant à l'art. 763 al. 1 et 2), ` +
      `bien qu'il ne soit pas héritier. Si le logement était loué, les loyers de cette année sont ` +
      `remboursés par la succession. Il n'a en revanche aucun droit viager au logement (art. 764 ` +
      `réservé au conjoint marié) : au-delà d'un an, son maintien dans les lieux suppose un legs ` +
      `ou l'accord des héritiers. Mêmes exclusions que pour le conjoint (résidence secondaire, SCI, ` +
      `logement dont le défunt n'était qu'usufruitier) — à confirmer au cas par cas.`
    );
  }

  // 6quater. Faculté de conversion de l'usufruit du conjoint (C. civ. art.
  // 759 à 762, référentiel §5.7) — purement informatif, aucun montant
  // calculé : la rente est fixée par le juge selon le revenu net de
  // l'usufruit estimé au jour de la conversion (pouvoir souverain
  // d'appréciation, Cass. civ. 1, 9 sept. 2015, n° 14-15957), et le capital
  // suppose un accord amiable de toutes les parties (prix librement
  // négocié) — aucun barème ni convention de calcul n'existe dans le
  // référentiel pour l'une ou l'autre voie (vérifié à nouveau sur l'ensemble
  // du document avant ce correctif), donc aucune calculette n'est possible
  // ici contrairement au DUH ci-dessus (§5.9, qui a un barème art. 669 CGI).
  //
  // Ciblage : ne se déclenche que si `heirs` porte une part du conjoint en
  // typeQuotePart 'usufruit', c.-à-d. un usufruit issu de la dévolution
  // LÉGALE (conjointOption 'usufruit_total' ou 'quart_pp_3quarts_us', seule
  // origine que ce moteur qualifie explicitement). Le référentiel inclut
  // aussi l'usufruit testamentaire et celui issu d'une DDV dans l'assiette
  // de la conversion — mais `Liberalite` (types.ts) ne porte aucun champ
  // typeQuotePart : un legs ou une DDV en usufruit au conjoint n'est nulle
  // part distingué d'un legs en pleine propriété par ce moteur. Ce
  // déclencheur est donc un sous-ensemble de l'assiette réelle (limite
  // signalée dans le texte ci-dessous plutôt que silencieuse). À l'inverse,
  // l'usufruit issu d'une convention matrimoniale (préciput/attribution
  // intégrale en usufruit, cf. `needsNpSurvivant` plus haut) n'est jamais
  // capturé par typeQuotePart ici et n'active donc jamais ce message à
  // tort — cohérent avec l'exclusion légale de l'art. 759.
  if (family.hasSurvivingSpouse) {
    const conjointUsufruitier = heirs.some(
      h => h.personId === family.survivingSpouseId && h.typeQuotePart === 'usufruit'
    );
    if (conjointUsufruitier) {
      successionLegaleResult.explicationsTexte.push(
        `Le conjoint survivant dispose ici d'un usufruit (dévolution légale) qui peut faire l'objet ` +
        `d'une conversion (C. civ. art. 759 à 762) : en rente viagère, à la demande du conjoint OU ` +
        `des héritiers nus-propriétaires, par voie amiable ou judiciaire ; ou en capital, uniquement ` +
        `par accord de toutes les parties (pas de voie judiciaire, prix librement négocié). L'assiette ` +
        `couvre l'usufruit légal, testamentaire, ou issu d'une donation de biens à venir — mais exclut ` +
        `l'usufruit né d'une convention matrimoniale ou d'une donation entre vifs. Le juge ne peut pas ` +
        `imposer cette conversion contre la volonté du conjoint pour le logement occupé à titre de ` +
        `résidence principale et son mobilier. Coût fiscal : droit fixe des actes innomés de 125 €, sauf ` +
        `si la conversion est stipulée rétroactive au décès (possible uniquement par accord des parties, ` +
        `jamais imposée par le juge), ce qui modifie l'assiette des droits de succession — non chiffré ` +
        `ici. Aucun montant de rente ou de capital n'est calculé par cet outil : en cas de conversion en ` +
        `rente, son montant est fixé par le juge selon le revenu net de l'usufruit estimé au jour de la ` +
        `conversion, sans barème légal de capitalisation (pouvoir souverain d'appréciation) ; en cas de ` +
        `conversion en capital, le prix résulte d'une négociation libre entre les parties. À déterminer ` +
        `au cas par cas, hors périmètre de cet outil.`
      );
    }
  }

  // 7. Construction des entrées DMTG (déplacé depuis Synthese.tsx — Phase 2
  // de la consolidation du moteur : computeTransmission appelle lui-même
  // computeDMTG, l'UI n'a plus à connaître la forme du contexte DMTG).

  // civilShares[].fraction = part de CHAQUE héritier dans ce qu'il reçoit
  // réellement de la succession (cashReparti : biens existants + indemnité de
  // réduction, jamais les donations déjà détenues ni les soultes de rapport,
  // déjà taxées comme donations). L'indemnité de réduction entre dans
  // l'assiette DMTG via une ligne d'actif synthétique (cf. dmtgAssets).
  // Les héritiers se partagent l'assiette hors legs aux non-héritiers au
  // prorata de ce qu'ils reçoivent, exprimé en valeurs au partage (art. 860) :
  // l'assiette fiscale reste celle du décès (R29), seule la clé en dépend.
  const baseRepartition = residuelReel + partage.totalIndemnitesReduction;
  const partHeritiers = baseRepartition > 0 ? Math.max(0, baseRepartition - totalLegsNonHeritiers) / baseRepartition : 0;
  const totalRecuHeritiers = cashReparti.reduce((sum, c) => sum + Math.max(0, c), 0);
  const civilShares: CivilShare[] = heirs.map((heir, i) => ({
    beneficiaryId: heir.personId,
    fraction: totalRecuHeritiers > 0 ? (Math.max(0, cashReparti[i]) / totalRecuHeritiers) * partHeritiers : 0,
    source: 'legal'
  }));
  legsNonHeritiers.forEach(l => {
    civilShares.push({
      beneficiaryId: l.personId,
      fraction: baseRepartition > 0 ? l.montant / baseRepartition : 0,
      source: 'legal'
    });
  });

  // Enfants (vivants, ou décédés en laissant une descendance) d'un bénéficiaire,
  // pour la réduction pour charges de famille (art. 780 CGI).
  const aDescendanceVivante = (id: PersonId): boolean => family.links
    .filter(l => l.from === id && l.relation === 'child')
    .some(l => {
      const p = family.persons.find(x => x.id === l.to);
      return !!p && (!p.estDecede || aDescendanceVivante(p.id));
    });
  const nbEnfantsDe = (id: PersonId): number => family.links
    .filter(l => l.from === id && l.relation === 'child')
    .filter(l => {
      const p = family.persons.find(x => x.id === l.to);
      return !!p && (!p.estDecede || aDescendanceVivante(p.id));
    }).length;

  // Part de chaque représentant dans sa souche (art. 779 I CGI).
  const partSouche = (rootId: PersonId, personId: PersonId): number => {
    const membres = heirs.filter(h => !!h.representation && (h.representationRootId || h.personId) === rootId);
    const total = membres.reduce((s, h) => s + h.partCivile, 0);
    const siens = membres.filter(h => h.personId === personId).reduce((s, h) => s + h.partCivile, 0);
    return total > 0 ? siens / total : 0;
  };

  const beneficiaries: DmtgBeneficiary[] = heirs.map(heir => {
    // Le lien retenu pour la fiscalité DMTG est celui calculé par la
    // dévolution civile (heir.lien), pas la catégorie du formulaire famille
    // (ex: "Petit-enfant") : c'est la seule source qui sait si la personne
    // hérite par représentation, et de qui.
    let dmtgLien: DmtgBeneficiary['lien'] = 'autre';
    if (heir.lien === 'conjoint') dmtgLien = 'conjoint';
    else if (heir.lien === 'enfant' || heir.lien === 'petit_enfant') dmtgLien = 'enfant';
    // Tout ascendant (parents, grands-parents, arrière-grands-parents) relève
    // de l'abattement et du barème en ligne directe (art. 779 I et 777 CGI).
    else if (heir.lien === 'parent' || heir.lien === 'grand_parent' || heir.lien === 'arriere_grand_parent') dmtgLien = 'ascendant';
    else if (heir.lien === 'frere_soeur') dmtgLien = 'frere_soeur';
    else if (heir.lien === 'neveu_niece') dmtgLien = 'neveu_niece';
    // Collatéraux ordinaires jusqu'au 4e degré (oncles/tantes 3e, cousins
    // germains 4e) : 55%, abattement de droit commun 1 594€ (art. 777 CGI).
    else if (heir.lien === 'oncle_tante' || heir.lien === 'cousin') dmtgLien = 'collateral_4';

    // Représentation : un petit-enfant représentant un enfant
    // prédécédé/renonçant partage l'abattement enfant (100 000€) de la
    // souche ; un neveu/nièce représentant un frère/sœur prédécédé partage
    // l'abattement frère/sœur (15 932€) et relève du barème frère/sœur
    // plutôt que du barème collatéral à 55%.
    // En ligne collatérale, la représentation fiscale suppose plusieurs
    // souches (BOI-ENR-DMTG-10-50-80 § 330, aucune dérogation) : neveux d'une
    // souche unique taxés de leur chef (7 967 € chacun, 55 %).
    const representationNeveu = heir.lien === 'neveu_niece' && !!heir.representation && !!heir.pluraliteSouches;
    const isRepresentation = !!heir.representation && (heir.lien === 'petit_enfant' || representationNeveu);
    const representationRootId = isRepresentation ? (heir.representationRootId || heir.personId) : null;

    const person = family.persons.find(p => p.id === heir.personId);

    return {
      id: heir.personId,
      lien: dmtgLien,
      representedOf: representationRootId,
      representationGroup: representationRootId,
      numberOfRepresentants: isRepresentation ? heir.representationCount : undefined,
      partDansSouche: representationRootId ? partSouche(representationRootId, heir.personId) : undefined,
      comesFromRepresentationWithPlurality: representationNeveu,
      isAdoptionSimple: person?.enfantAdopte === 'Adoption simple',
      adoptionSimpleAbattementPlein: person?.adoptionSimpleAbattementPlein || false,
      exonerationSuccession: person?.exonerationSuccession || false,
      isHandicapped: !!person?.handicap,
      nbEnfants: nbEnfantsDe(heir.personId)
    };
  });

  // Légataires non héritiers : lien fiscal déduit du graphe familial (jamais
  // de la dévolution civile, qui ne les connaît pas). Conjoint marié ou
  // partenaire de PACS (survivingSpouseId, présent dans le graphe dans les
  // deux cas) : exonéré (art. 796-0 bis CGI). Petit-enfant de son propre chef :
  // barème ligne directe, abattement 1 594€ (art. 788 IV). Tiers hors fiche
  // famille : 60 %.
  const lienFiscalLegataire = (personId: PersonId): DmtgBeneficiary['lien'] => {
    if (personId === family.survivingSpouseId) return 'conjoint';
    const personne = family.persons.find(p => p.id === personId);
    // Beau-parent, beau-frère… : aucun lien de parenté avec le défunt (tiers).
    if (personne?.horsFamilleDuDefunt) return 'autre';
    const lien = personne?.lienFamilial?.toLowerCase() || '';
    if (lien === 'enfant') return 'enfant';
    if (lien.includes('petit-enfant') || lien.includes('petit_enfant')) return 'petit_enfant';
    if (lien === 'parent' || lien === 'père' || lien === 'mère' || lien.includes('grand-parent') ||
        lien.includes('grand_parent') || lien.includes('arrière-grand') || lien.includes('arriere-grand') ||
        lien === 'grand-père' || lien === 'grand-mère') return 'ascendant';
    if (lien.includes('frère') || lien.includes('sœur') || lien === 'frere_soeur') return 'frere_soeur';
    if (lien.includes('neveu') || lien.includes('nièce')) return 'neveu_niece';
    if (lien.includes('oncle') || lien.includes('tante') || lien.includes('cousin')) return 'collateral_4';
    return 'autre';
  };
  legsNonHeritiers.forEach(l => {
    const person = family.persons.find(p => p.id === l.personId);
    beneficiaries.push({
      id: l.personId,
      lien: lienFiscalLegataire(l.personId),
      isAdoptionSimple: person?.enfantAdopte === 'Adoption simple',
      adoptionSimpleAbattementPlein: person?.adoptionSimpleAbattementPlein || false,
      exonerationSuccession: person?.exonerationSuccession || false,
      isHandicapped: !!person?.handicap,
      nbEnfants: nbEnfantsDe(l.personId)
    });
  });

  // Un bénéficiaire désigné dans une clause AV n'est pas forcément un héritier
  // civil (ex. petit-enfant désigné alors que les enfants sont vivants) : sans
  // extension, computeAssuranceVie() l'ignorerait silencieusement (il ne
  // résout que contre `beneficiaries`, cf. dmtg/assurance-vie.ts). On complète
  // donc la liste avec les bénéficiaires AV absents, en dérivant leur `lien`
  // depuis le graphe familial plutôt que depuis leur statut d'héritier — seul
  // conjoint/frère-sœur importent réellement ici (le barème 990I/757B est
  // plat, `lien` ne sert qu'aux exonérations, cf. dmtg/assurance-vie.ts).
  const dmtgBeneficiaryIds = new Set(beneficiaries.map(b => b.id));
  // Bénéficiaire AV non héritier : même lien fiscal qu'un légataire. Il
  // compte pour les primes versées après 70 ans, taxées au barème des
  // successions selon la parenté (art. 757 B) — petit-enfant en ligne
  // directe, enfant renonçant avec son abattement de 100 000 €, neveu à 55 %.
  const registerAvBeneficiary = (id: string) => {
    if (dmtgBeneficiaryIds.has(id)) return;
    dmtgBeneficiaryIds.add(id);
    const person = family.persons.find(p => p.id === id);
    beneficiaries.push({
      id,
      lien: lienFiscalLegataire(id),
      isAdoptionSimple: person?.enfantAdopte === 'Adoption simple',
      adoptionSimpleAbattementPlein: person?.adoptionSimpleAbattementPlein || false,
      exonerationSuccession: person?.exonerationSuccession || false,
      isHandicapped: !!person?.handicap,
      nbEnfants: nbEnfantsDe(id)
    });
  };
  avContracts.forEach(contract => {
    contract.niveaux.forEach(niveau => {
      niveau.beneficiaires.forEach(b => {
        registerAvBeneficiary(b.beneficiaryId);
        // Le nu-propriétaire d'une clause démembrée (barème art. 669 CGI) est
        // un bénéficiaire fiscal à part entière, potentiellement absent des
        // niveaux et des héritiers civils — même raisonnement que ci-dessus.
        if (b.typeDetention === 'usufruit' && b.nuProprietaireId) {
          registerAvBeneficiary(b.nuProprietaireId);
        }
      });
    });
  });

  // Adaptation des lignes "assets" brutes (forme Supabase) vers les Asset[]
  // attendus par computeDMTG. `nature` provient de la valeur humaine saisie
  // dans le formulaire Immobilier (ex. "Résidence principale", "Résidences
  // secondaires" — cf. constants/assetTypes.ts::ASSET_NATURES), jamais du
  // littéral 'immobilier' : on passe donc par getAssetCategory() (même
  // fonction que PatrimoineTreeView/AssetForm) pour rattacher un bien à
  // l'assiette immobilière — l'ancienne comparaison `nature === 'immobilier'`
  // ne matchait jamais aucune donnée réelle (diagnostic du 2026-07-17).
  // isResidencePrincipale ne dépend que du libellé exact "Résidence
  // principale" (pas de la catégorie générale) : abattement -20% (art. 764
  // bis CGI, dmtg/assets.ts), sous condition d'occupation présumée (cf.
  // abattementRPApplicable ci-dessous).
  //
  // valeurVenale est pondérée par getFractionSuccessorale
  // (lib/patrimoine/succession.ts::getPartSuccessorale — régime matrimonial /
  // indivision) : même fonction que le chemin civil
  // (transmissionHelpers.ts::buildPatrimonySnapshot), pour que le fiscal et le
  // civil restent alignés sur la même assiette successorale.
  // Les contrats d'assurance-vie réellement hors succession (art. L132-12 code des assurances —
  // "Contrat d'assurance-vie"/"Contrat vie-génération"/"PEP assurance vie", PAS "Bons & contrats
  // de capitalisation" qui intègrent l'actif successoral classique) sont exclus de l'assiette
  // DMTG, taxés séparément via avContracts (990 I / 757 B, cf. dmtg/assurance-vie.ts) — sans
  // cette exclusion, un même contrat serait taxé deux fois dès qu'avContracts est réellement
  // alimenté (cf. isContratHorsSuccession, constants/assetTypes.ts — inclut le PER assurantiel).
  // Abattement de 20 % sur la résidence principale (art. 764 bis CGI) : dû
  // seulement si, au décès, le logement est aussi la résidence principale du
  // conjoint ou partenaire de PACS survivant, ou d'un enfant (du défunt ou de
  // son conjoint) mineur ou handicapé. L'occupation effective n'est pas
  // saisie : elle est présumée dès qu'une telle personne existe (hypothèse
  // validée le 2026-09-29), et rappelée dans les explications. Un enfant sans
  // date de naissance n'est jamais présumé mineur.
  const aUneRP = (rawAssets || []).some(a => a.nature === 'Résidence principale' && !isContratHorsSuccession(a));
  const enfantsOccupantsPossibles = family.persons.filter(p =>
    !p.estDecede && p.id !== family.decedentId &&
    (family.childrenOfDecedent.includes(p.id) || p.lienFamilial?.toLowerCase() === 'enfant') &&
    (p.handicap || (!!p.dateNaissance && getAgeAtDate(p.dateNaissance, referenceDate) < 18))
  );
  const survivantCohabitant = (family.hasSurvivingSpouse || !!family.survivantPartenairePacs) && !!family.survivingSpouseId;
  const abattementRPApplicable = survivantCohabitant || enfantsOccupantsPossibles.length > 0;
  if (aUneRP) {
    successionLegaleResult.explicationsTexte.push(abattementRPApplicable
      ? `Abattement de 20 % appliqué à la résidence principale (art. 764 bis CGI), en présumant qu'elle ` +
        `était aussi, au décès, la résidence principale ${survivantCohabitant
          ? (family.survivantPartenairePacs ? 'du partenaire de PACS survivant' : 'du conjoint survivant')
          : "d'un enfant mineur ou handicapé"} — à confirmer.`
      : `Pas d'abattement de 20 % sur la résidence principale (art. 764 bis CGI) : il suppose qu'au décès ` +
        `le logement soit aussi occupé par le conjoint, le partenaire de PACS ou un enfant mineur ou ` +
        `handicapé, et aucune de ces personnes n'est présente.`);
  }

  const biensEnUsufruit = (rawAssets || []).filter(a => a.mode_detention === 'Usufruit' && getFractionSuccessorale(a) > 0);
  if (biensEnUsufruit.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Usufruit détenu par le défunt sur ${biensEnUsufruit.map(a => a.denomination || 'un bien').join(', ')} : ` +
      `il s'éteint au décès (C. civ. art. 617) et la nue-propriété se réunit sans droits (art. 1133 CGI), ` +
      `ce bien n'entre donc pas dans la succession. Exception : si la nue-propriété appartient à un héritier ` +
      `présomptif sans donation régulière antérieure de plus de trois mois, le bien est présumé faire partie ` +
      `de la succession en pleine propriété (art. 751 CGI) — à vérifier.`
    );
  }

  if (avContracts.some(c => (c.primesExonerees || 0) > 0)) {
    successionLegaleResult.explicationsTexte.push(
      `Assurance-vie : les primes versées avant le 13 octobre 1998 (avant 70 ans, ou à tout âge sur un contrat ` +
      `souscrit avant le 20 novembre 1991) ne supportent ni le prélèvement de l'art. 990 I ni les droits de ` +
      `l'art. 757 B (BOI-TCAS-AUT-60 § 80).`
    );
  }
  if (avContracts.some(c => !c.dateSouscriptionConnue && c.primesApres70 > 0)) {
    successionLegaleResult.explicationsTexte.push(
      `Assurance-vie : date d'ouverture non renseignée pour un contrat alimenté après 70 ans — régime des contrats ` +
      `souscrits depuis le 20 novembre 1991 présumé (art. 757 B). Un contrat plus ancien relève du seul art. 990 I : ` +
      `renseignez la date d'ouverture du contrat.`
    );
  }

  if (avContracts.some(c => (c.psDecesDeduits || 0) > 0)) {
    successionLegaleResult.explicationsTexte.push(
      `Prélèvements sociaux au décès (17,2 % ; 18,6 % pour un PER) sur les produits des unités de compte : ` +
      `${avContracts.filter(c => (c.psDecesDeduits || 0) > 0).map(c => `${c.label || 'un contrat'} ${Math.round(c.psDecesDeduits!).toLocaleString('fr-FR')} €`).join(', ')}, ` +
      `retenus par l'assureur et déduits du capital versé (assiette du prélèvement 990 I). Gain estimé au prorata ` +
      `de la part en unités de compte saisie ; ceux du fonds euros ont déjà été prélevés chaque année.`
    );
  }
  if (avContracts.some(c => (c.avanceDeduite || 0) > 0)) {
    successionLegaleResult.explicationsTexte.push(
      `Avance en cours sur ${avContracts.filter(c => (c.avanceDeduite || 0) > 0).map(c => c.label || 'un contrat').join(', ')} : ` +
      `déduite par l'assureur du capital versé aux bénéficiaires, qui sert d'assiette au prélèvement ; elle n'est pas ` +
      `déduite du passif de la succession — à confirmer.`
    );
  }
  if (avContracts.some(c => isPrevoyanceDeces(c.nature))) {
    successionLegaleResult.explicationsTexte.push(
      `Prévoyance décès : capital garanti versé hors succession aux bénéficiaires de la clause (art. L132-12 ` +
      `C. assur.), contrat présumé en cours au décès. Contrat non rachetable : le prélèvement de l'art. 990 I ne ` +
      `porte que sur les primes versées dans l'année précédant le décès (plus la valeur de rachat d'une vie ` +
      `entière) ; les primes versées après 70 ans relèvent de l'art. 757 B.`
    );
  }
  if (avContracts.some(c => c.nature === NATURE_ARTICLE_82)) {
    successionLegaleResult.explicationsTexte.push(
      `Contrat article 82 : présumé en phase de constitution au décès — capital versé hors succession aux ` +
      `bénéficiaires de la clause, régime de l'assurance-vie (art. 990 I / 757 B). Une rente déjà liquidée et ` +
      `non réversible ne transmet rien.`
    );
  }

  const titresDutreil = (rawAssets || []).filter(a => !!a.societe_id && (ctx.societesDutreil || []).includes(a.societe_id));
  const regimeDutreil2026 = referenceDate >= DATE_DUTREIL_LF2026;
  // Biens non affectés à l'activité (LF 2026) : jamais présumés absents.
  const titreDutreilNonQualifie = regimeDutreil2026
    ? titresDutreil.find(a => ctx.dutreilPartsNonAffectees?.[a.societe_id!] == null)
    : undefined;
  if (titreDutreilNonQualifie) {
    throw new BienNonQualifieError(
      `Pacte Dutreil : la part de la valeur des titres « ${titreDutreilNonQualifie.denomination || 'de société'} » ` +
      `correspondant à des biens non affectés à l'activité (véhicules de tourisme, yachts, objets d'art, logements…) ` +
      `n'est pas renseignée — elle n'est plus exonérée depuis le 21/02/2026 (art. 787 B CGI). Renseignez-la (0 % si ` +
      `aucun) dans Sociétés → Transmission.`
    );
  }
  if (titresDutreil.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Pacte Dutreil (art. 787 B CGI) : les titres ${titresDutreil.map(a => a.denomination || 'de société').join(', ')} ` +
      `sont exonérés de droits à hauteur de 75 %${regimeDutreil2026
        ? ", hors fraction de leur valeur correspondant à des biens non affectés à l'activité depuis 3 ans"
        : ''}. Suppose que chaque héritier s'engage à conserver les titres pendant ${regimeDutreil2026 ? 6 : 4} ans ` +
      `et que l'un d'eux exerce une fonction de direction pendant 3 ans — à confirmer.`
    );
  }

  // Dette rattachée à un bien exonéré (art. 769 II CGI) : imputée par
  // priorité sur sa valeur. Le rattachement (« bien financé », emprunts.asset_id ;
  // l'actif donné en garantie n'y entre pas) présume un prêt d'acquisition, signalé.
  const biensExoneresEndettes = (rawAssets || []).filter(a =>
    !isContratHorsSuccession(a) && (ctx.passifsParBien?.[a.id] || 0) > 0 && (
      (!!a.societe_id && (ctx.societesDutreil || []).includes(a.societe_id)) || getExonerationRurale(a) !== null
    )
  );
  if (biensExoneresEndettes.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Emprunt rattaché à ${biensExoneresEndettes.map(a => a.denomination || a.nature).join(', ')} : bien exonéré en ` +
      `partie, la dette s'impute par priorité sur sa valeur (art. 769 II CGI) et n'est déduite que pour sa fraction ` +
      `taxable. Présume un emprunt contracté pour l'acquisition ou dans l'intérêt du bien — sans effet si le bien n'en ` +
      `est que la garantie, à vérifier.`
    );
  }

  // Entreprise individuelle (art. 787 C CGI) : conditions saisies, jamais présumées.
  const bien787CNonQualifie = (rawAssets || []).find(a => isBien787CNonQualifie(a) && getFractionSuccessorale(a) > 0);
  if (bien787CNonQualifie) {
    throw new BienNonQualifieError(
      `Le bien « ${bien787CNonQualifie.denomination || bien787CNonQualifie.nature} » n'indique pas si les conditions de ` +
      `l'exonération des biens professionnels (art. 787 C CGI) sont remplies : impossible de calculer ses droits de ` +
      `succession. Renseignez-le dans la fiche du bien.`
    );
  }
  const biens787C = (rawAssets || []).filter(a => NATURES_787C.includes(a.nature || '') && getFractionSuccessorale(a) > 0);
  if (biens787C.some(isExonere787C)) {
    successionLegaleResult.explicationsTexte.push(
      `Entreprise individuelle (art. 787 C CGI) : ${biens787C.filter(isExonere787C).map(a => a.denomination || a.nature).join(', ')} ` +
      `exonérés de droits à hauteur de 75 %. Suppose que les héritiers s'engagent à conserver les biens pendant 4 ans ` +
      `et que l'un d'eux poursuive l'exploitation pendant 3 ans — à confirmer.`
    );
  }
  if (biens787C.some(a => !isExonere787C(a))) {
    successionLegaleResult.explicationsTexte.push(
      `${biens787C.filter(a => !isExonere787C(a)).map(a => a.denomination || a.nature).join(', ')} : conditions de ` +
      `l'art. 787 C non remplies, biens taxés sur leur pleine valeur.`
    );
  }

  // Bijoux, objets d'art ou de collection : plancher de 60 % de la valeur
  // d'assurance (art. 764 II CGI), appliqué au calcul fiscal seulement.
  const biensPlancher = (rawAssets || []).filter(a =>
    NATURES_PLANCHER_ASSURANCE.includes(a.nature || '') && (Number(a.valeur_assuree) || 0) > 0 && getFractionSuccessorale(a) > 0
  );
  const valeurFiscalePlancher = (asset: RawAssetInput, valeur: number): number => {
    if (!NATURES_PLANCHER_ASSURANCE.includes(asset.nature || '') || asset.mode_detention === 'Usufruit') return valeur;
    const plancher = TAUX_PLANCHER_ASSURANCE * (Number(asset.valeur_assuree) || 0) * getFractionSuccessorale(asset);
    return Math.max(valeur, plancher);
  };
  if (biensPlancher.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Bijoux, objets d'art et de collection (${biensPlancher.map(a => a.denomination || a.nature).join(', ')}) : valeur ` +
      `imposable d'au moins 60 % de leur valeur d'assurance (contrat en cours, conclu depuis moins de 10 ans, art. 764 ` +
      `II CGI), sauf preuve contraire.`
    );
  }

  // Assurance-vie dont l'assuré n'est pas le souscripteur : non dénouée par ce
  // décès, sa valeur de rachat entre dans l'actif successoral (droit commun).
  const avAssureTiers = (rawAssets || []).filter(a => isAssuranceVieHorsSuccession(a.nature) && a.assure_tiers && getFractionSuccessorale(a) > 0);
  if (avAssureTiers.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${avAssureTiers.map(a => a.denomination || a.nature).join(', ')} : assuré distinct du souscripteur, contrat non ` +
      `dénoué par ce décès — sa valeur de rachat entre dans la succession du souscripteur et se transmet à ses héritiers ` +
      `(droits de succession de droit commun, ni 990 I ni 757 B). Le capital sera versé au décès de l'assuré.`
    );
  }

  // Cryptomonnaies en portefeuille personnel : sans accès aux clés, les avoirs sont perdus.
  const cryptosAutoConservees = (rawAssets || []).filter(a => a.nature === NATURE_CRYPTO
    && a.conservation_crypto === 'portefeuille_personnel' && getFractionSuccessorale(a) > 0);
  if (cryptosAutoConservees.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Cryptomonnaies en portefeuille personnel (${cryptosAutoConservees.map(a => a.denomination || a.nature).join(', ')}) : ` +
      `retenues pour leur valeur au jour du décès, mais récupérables seulement si les héritiers ont accès aux clés privées ` +
      `ou à la phrase de récupération. Sans cet accès, les avoirs sont perdus alors que les droits de succession restent dus.`
    );
  }

  // Actionnariat salarié non exercé (stock-options, AGA en période d'acquisition, BSPCE) : doctrine
  // incertaine sur l'inclusion dans l'actif taxable, aucun traitement dédié.
  const droitsSalaries = (rawAssets || []).filter(a => isActionnariatSalarie(a.nature) && getFractionSuccessorale(a) > 0);
  if (droitsSalaries.length > 0) {
    const libelles = droitsSalaries.map(a => a.denomination || a.nature).join(', ');
    const aOptions = droitsSalaries.some(a => a.nature !== 'Actions gratuites');
    const aAGA = droitsSalaries.some(a => a.nature === 'Actions gratuites');
    successionLegaleResult.explicationsTexte.push(
      `Actionnariat salarié (${libelles}) : droits non exercés, retenus pour leur valeur saisie. ` +
      (aOptions ? `Stock-options et BSPCE sont exerçables par les héritiers dans les 6 mois du décès ; levées dans ce délai, le gain de levée des stock-options est exonéré d'impôt sur le revenu (art. 80 bis I CGI). ` : '') +
      (aAGA ? `Pour les actions gratuites en période d'acquisition, les héritiers peuvent demander l'attribution dans les 6 mois (art. L225-197-3 C. com.), sans période de conservation. ` : '') +
      `Leur inclusion dans l'actif taxable (exclusion, ou valeur intrinsèque) est discutée — à faire confirmer par le notaire.`
    );
  }

  // Droits sociaux / holding non rattachés à une société : le Dutreil n'est jamais appliqué.
  const titresNonRattaches = (rawAssets || []).filter(a => (a.nature === 'Droits sociaux' || a.nature === 'Parts de holding')
    && !a.societe_id && getFractionSuccessorale(a) > 0);
  if (titresNonRattaches.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${titresNonRattaches.map(a => a.denomination || a.nature).join(', ')} : titres non rattachés à une société du module Sociétés, ` +
      `retenus pour leur valeur saisie sans exonération Dutreil (art. 787 B, 75 %). Rattachez la société pour l'appliquer si un ` +
      `engagement de conservation existe. Une décote d'illiquidité des titres non cotés n'est pas appliquée.`
    );
  }

  // Créances sur un proche ou un tiers : imputation sur la part d'un héritier débiteur.
  const creancesPret = (rawAssets || []).filter(a => (a.nature === 'Prêt consenti à un proche' || a.nature === 'Créance sur un tiers (reconnaissance de dette)')
    && getFractionSuccessorale(a) > 0);
  if (creancesPret.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${creancesPret.map(a => a.denomination || a.nature).join(', ')} : créance retenue pour sa valeur saisie (capital restant dû et ` +
      `intérêts courus au décès). Si le débiteur est un héritier, la dette s'impute sur sa part (non modélisé) ; une remise de dette ` +
      `consentie de son vivant par le défunt vaut donation, à rapporter.`
    );
  }

  // Droits d'auteur : usufruit légal du conjoint sur le droit d'exploitation (auteur seulement ; les
  // droits à royalties achetés comme placement relèvent du droit commun).
  const droitsAuteur = (rawAssets || []).filter(a => isDroitsAuteur(a.nature) && getFractionSuccessorale(a) > 0);
  if (droitsAuteur.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${droitsAuteur.map(a => a.denomination || a.nature).join(', ')} : valeur saisie (en général capitalisation des revenus). ` +
      `Le conjoint survivant dispose d'un usufruit légal sur le droit d'exploitation (art. L123-6 CPI), ` +
      `en plus de ses droits successoraux : non modélisé dans le partage. Le droit moral se transmet sans valeur.`
    );
  }

  // Comptes joints (art. 753 CGI) : présumés appartenir pour moitié à chaque cotitulaire.
  const comptesJoints = (rawAssets || []).filter(a => getAssetCategory(a.nature || '') === 'épargne bancaire / liquidités'
    && (['common', 'commun', 'couple', 'le couple'].includes((a.detenteur || '').toLowerCase()) || a.qualification_bien === 'Indivision') && getFractionSuccessorale(a) > 0);
  if (comptesJoints.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${comptesJoints.map(a => a.denomination || a.nature).join(', ')} : un compte joint est présumé appartenir pour moitié ` +
      `à chaque cotitulaire (art. 753 CGI), sauf preuve contraire (origine des fonds). Retenu ici selon la qualification saisie.`
    );
  }

  // Épargne salariale : le décès est un cas de déblocage anticipé.
  const plansEpargneSalariale = (rawAssets || []).filter(a => (a.nature === 'PEE' || a.nature === 'PEI') && getFractionSuccessorale(a) > 0);
  if (plansEpargneSalariale.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${plansEpargneSalariale.map(a => a.denomination || a.nature).join(', ')} : le décès permet le déblocage anticipé des avoirs, ` +
      `qui entrent dans l'actif successoral pour leur valeur au jour du décès. Les gains restent exonérés d'impôt sur le revenu ; ` +
      `les prélèvements sociaux (18,6 %) sont dus au déblocage (non déduits ici).`
    );
  }

  // PEA / PEA-PME : clôturés par le décès de leur titulaire (seul), le gain reste exonéré d'IR
  // mais supporte les prélèvements sociaux, quelle que soit l'ancienneté du plan. Un PEA commun
  // dont le titulaire est le conjoint survivant n'est pas clôturé : seule la moitié de sa valeur
  // (créance sur la communauté) entre dans cette succession.
  const peaEnSuccession = (rawAssets || []).filter(a => isPEA(a.nature) && getFractionSuccessorale(a) > 0);
  const titulaireRole = (a: RawAssetInput) => isDetenteurSpouse(a.detenteur ?? undefined) ? 'spouse' : 'user';
  const plansPEA = peaEnSuccession.filter(a => titulaireRole(a) === decedentRole);
  const plansPEASurvivant = peaEnSuccession.filter(a => titulaireRole(a) !== decedentRole);
  if (plansPEASurvivant.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${plansPEASurvivant.map(a => a.denomination || a.nature).join(', ')} : plan commun dont le conjoint survivant est ` +
      `titulaire. Il n'est pas clôturé par ce décès ; la moitié de sa valeur entre dans la succession et se règle ` +
      `au partage, le survivant restant seul titulaire du plan.`
    );
  }
  if (plansPEA.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${plansPEA.map(a => a.denomination || a.nature).join(', ')} : le plan est clôturé par le décès. Le gain réalisé depuis ` +
      `l'ouverture est exonéré d'impôt sur le revenu mais supporte les prélèvements sociaux (18,6 %), dus par la succession ` +
      `(non déduits ici). Les titres entrent dans l'actif pour leur valeur au jour du décès.`
    );
  }

  // Régime de retraite étranger : transmission qualifiée sur le bien.
  const retraitesEtrangeres = (rawAssets || []).filter(a => a.nature === NATURE_RETRAITE_ETRANGERE && getFractionSuccessorale(a) > 0);
  if (retraitesEtrangeres.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Régimes de retraite étrangers (${retraitesEtrangeres.map(a => a.denomination || a.nature).join(', ')}) : traités ` +
      `selon la transmission indiquée (succession, capital aux bénéficiaires au régime de l'assurance-vie, ou rien). ` +
      `L'application du droit français (art. 990 I / 757 B, convention fiscale) est à vérifier.`
    );
  }

  const meublesMeublants = (rawAssets || []).filter(a => a.nature === 'Meubles meublants' && getFractionSuccessorale(a) > 0);
  if (meublesMeublants.length > 0 && !params.inventaireNotarieProduit) {
    successionLegaleResult.explicationsTexte.push(
      `Meubles meublants : sans inventaire, leur valeur imposable ne peut être inférieure à 5 % des autres biens de la ` +
      `succession (art. 764 CGI) — la valeur déclarée est retenue si elle est supérieure, le forfait sinon.`
    );
  }

  // Biens ruraux, groupements fonciers, bois et forêts (art. 793 et 793 bis
  // CGI) : régime et conditions saisis dans Patrimoine, jamais présumés — un
  // bien non qualifié bloque le calcul (même renvoi que BienNonQualifieError).
  const bienRuralNonQualifie = (rawAssets || []).find(a => isBienRuralNonQualifie(a) && getFractionSuccessorale(a) > 0);
  if (bienRuralNonQualifie) {
    throw new BienNonQualifieError(
      `Le bien « ${bienRuralNonQualifie.denomination || bienRuralNonQualifie.nature} » n'indique pas son régime d'exonération ` +
      `(forestier, agricole ou aucun) ni si ses conditions sont remplies : impossible de calculer ses droits de succession ` +
      `(art. 793 et 793 bis CGI). Renseignez-le dans la fiche du bien.`
    );
  }
  const biensRuraux = (rawAssets || []).filter(a => isNatureRurale(a.nature) && getFractionSuccessorale(a) > 0);
  const biensRurauxExoneres = biensRuraux.filter(a => getExonerationRurale(a) !== null);
  if (biensRurauxExoneres.some(a => getExonerationRurale(a) === 'forestier')) {
    successionLegaleResult.explicationsTexte.push(
      `Bois et forêts (art. 793 CGI) : ${biensRurauxExoneres.filter(a => getExonerationRurale(a) === 'forestier').map(a => a.denomination || a.nature).join(', ')} ` +
      `exonérés de droits aux 3/4, sans plafond. Suppose que chaque héritier s'engage à appliquer une gestion durable ` +
      `pendant 30 ans — à confirmer.`
    );
  }
  if (biensRurauxExoneres.some(a => getExonerationRurale(a) === 'agricole')) {
    successionLegaleResult.explicationsTexte.push(
      `Biens ruraux et GFA loués par bail à long terme (art. 793 bis CGI) : ${biensRurauxExoneres.filter(a => getExonerationRurale(a) === 'agricole').map(a => a.denomination || a.nature).join(', ')} ` +
      `exonérés aux 3/4 jusqu'à 600 000 € par héritier, à 1/2 au-delà. Suppose que chaque héritier conserve les biens ` +
      `5 ans — à confirmer. Le seuil de 20 M€ (conservation 18 ans) n'est pas modélisé.`
    );
  }
  const biensRurauxTaxes = biensRuraux.filter(a => getExonerationRurale(a) === null);
  if (biensRurauxTaxes.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${biensRurauxTaxes.map(a => a.denomination || a.nature).join(', ')} : aucune exonération de droits retenue ` +
      `(régime « aucun » ou conditions non remplies), bien taxé sur sa pleine valeur.`
    );
  }

  const dmtgAssets: DmtgAsset[] = (rawAssets || [])
    .filter(asset => !isContratHorsSuccession(asset))
    .map(asset => ({
      id: asset.id,
      label: asset.denomination || '',
      valeurVenale: valeurFiscalePlancher(asset, getValeurEstimeePonderee(asset) * getFractionSuccessorale(asset)),
      nature: getAssetCategory(asset.nature || '') === 'actifs immobiliers' ? 'immobilier' : 'autre',
      location: 'metropole',
      isResidencePrincipale: asset.nature === 'Résidence principale' && abattementRPApplicable,
      isDutreil: !!asset.societe_id && (ctx.societesDutreil || []).includes(asset.societe_id),
      partNonExonereeDutreil: regimeDutreil2026 && asset.societe_id
        ? (ctx.dutreilPartsNonAffectees?.[asset.societe_id] ?? 0) / 100
        : undefined,
      exonerationRurale: getExonerationRurale(asset) ?? undefined,
      fractionEligibleRurale: getFractionEligibleRurale(asset),
      isExonere787C: isExonere787C(asset),
      isMeublesMeublants: asset.nature === 'Meubles meublants',
      detteImputee: ctx.passifsParBien?.[asset.id],
      exclurePour: {}
    }));

  // Ligne d'actif synthétique portant le solde net des récompenses/créances
  // entre époux (cf. calcul en tête de fonction) : traverse le même pipeline
  // fiscal (abattements, répartition par bénéficiaire via civilShares) que
  // n'importe quel autre bien, sans toucher getPartSuccessorale ni
  // qualification.ts. nature: 'autre' (jamais 'immobilier', pour ne pas
  // fausser l'assiette de calcul des frais de notaire ci-dessous). Absente si
  // le solde est nul, pour ne rien changer aux dossiers sans récompense/créance.
  if (deltaRecompensesCreances !== 0) {
    dmtgAssets.push({
      id: 'ajustement-recompenses-creances',
      label: 'Ajustement récompenses / créances entre époux',
      valeurVenale: deltaRecompensesCreances,
      nature: 'autre',
      location: 'metropole',
      exclurePour: {}
    });
  }

  // Ligne d'actif synthétique portant la créance de participation aux
  // acquêts (cf. calcul en tête de fonction), même mécanisme que la ligne
  // récompenses/créances ci-dessus : traverse le même pipeline fiscal sans
  // toucher getPartSuccessorale ni qualification.ts. Absente si le régime
  // n'est pas la participation aux acquêts ou si la créance est nulle.
  if (deltaParticipationAcquets !== 0) {
    dmtgAssets.push({
      id: 'ajustement-participation-acquets',
      label: 'Créance de participation aux acquêts',
      valeurVenale: deltaParticipationAcquets,
      nature: 'autre',
      location: 'metropole',
      exclurePour: {}
    });
  }

  // Indemnité de réduction due par un donataire réduit (art. 924) : reçue
  // par les réservataires au titre de la succession, donc taxable comme telle.
  if (partage.totalIndemnitesReduction > 0) {
    dmtgAssets.push({
      id: 'indemnite-reduction',
      label: 'Indemnités de réduction',
      valeurVenale: partage.totalIndemnitesReduction,
      nature: 'autre',
      location: 'metropole',
      exclurePour: {}
    });
  }

  // Capital d'assurance-vie / PER à clause caduque (cf. capitalAVCaduc) :
  // actif financier de droit commun de la succession du souscripteur.
  if (capitalAVCaduc > 0) {
    dmtgAssets.push({
      id: 'ajustement-av-clause-caduque',
      label: 'Capitaux décès à clause bénéficiaire caduque',
      valeurVenale: capitalAVCaduc,
      nature: 'autre',
      location: 'metropole',
      exclurePour: {}
    });
  }

  // Pas de regimeMatrimonial transmis à computeDMTG : la liquidation de
  // communauté par mécanisme agrégé est désormais redondante avec la
  // pondération par bien ci-dessus (mécanisme A, seul retenu — cf.
  // diagnostic du 2026-07-17).
  //
  // 8. Calcul DMTG (seul moteur fiscal, cf. dmtg/index.ts) — donations
  // alimentées depuis les libéralités réelles (mêmes lignes que l'imputation
  // civile ci-dessus) pour le rappel fiscal 15 ans ; donorId est toujours le
  // défunt simulé (un seul défunt dans cet outil, pas de colonne dédiée).
  // Les legs sont exclus : ils prennent effet au décès, hors périmètre du
  // rappel des donations antérieures. avContracts : contrats réels construits
  // par l'appelant (buildAVContracts), primes déjà réparties avant/après 70
  // ans par versement réel (cf. décision du 2026-07-18).
  // valeurDon = valeur déclarée dans l'acte (art. 784 CGI), jamais la valeur
  // au décès (`valeur`, calcul civil). Donation sans valeur à l'acte
  // (antérieure à la colonne) : repli sur `valeur`, signalé ci-dessous.
  const donationsSansValeurActe = liberalites.filter(
    l => l.type === 'donation' && l.valeurFiscaleActe === undefined
  );
  if (donationsSansValeurActe.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `${donationsSansValeurActe.length} donation(s) sans valeur déclarée dans l'acte : le rappel ` +
      `fiscal des donations de moins de 15 ans (art. 784 CGI) retient à défaut leur valeur actuelle, ` +
      `qui peut différer de la valeur déclarée à l'époque. Renseignez la valeur de l'acte pour un calcul exact.`
    );
  }

  // Don familial de sommes d'argent (art. 790 G CGI) : exonération réservée
  // aux dons d'un donateur de moins de 80 ans à un donataire majeur (émancipation
  // non enregistrée par l'app), enfant/petit-enfant/arrière-petit-enfant ou, à
  // défaut de descendance, neveu/nièce — conditions appréciées au jour du don.
  // Condition non remplie : don ordinaire (consomme l'abattement général),
  // signalé. Donnée manquante (date de naissance) : exonération maintenue,
  // signalée comme non vérifiable (décision actée, audit 2026-09).
  const donateur = family.persons.find(p => p.id === family.decedentId);
  const aDesDescendants = family.childrenOfDecedent.length > 0;
  const verifier790G = (l: Liberalite): boolean => {
    const donataire = family.persons.find(p => p.id === l.beneficiaireId);
    const nomDonataire = l.beneficiaireName || (donataire ? `${donataire.prenom} ${donataire.nom}`.trim() : 'donataire');
    // Neveu ou nièce du conjoint : hors du champ de l'art. 790 G pour ce donateur.
    const lien = donataire?.horsFamilleDuDefunt ? '' : (donataire?.lienFamilial?.toLowerCase() || '');
    const estDescendant = lien === 'enfant' || lien.includes('petit-enfant');
    const estNeveu = lien.includes('neveu') || lien.includes('nièce');
    const motifs: string[] = [];
    if (!(estDescendant || (estNeveu && !aDesDescendants))) {
      motifs.push(estNeveu
        ? 'un neveu ou une nièce n\'est éligible qu\'à défaut de descendance du donateur'
        : 'le donataire n\'est ni un descendant ni, à défaut, un neveu ou une nièce');
    }
    const nonVerifiable: string[] = [];
    if (donateur?.dateNaissance) {
      if (getAgeAtDate(donateur.dateNaissance, l.date) >= 80) motifs.push('le donateur avait 80 ans ou plus au jour du don');
    } else {
      nonVerifiable.push('date de naissance du donateur');
    }
    if (donataire?.dateNaissance) {
      if (getAgeAtDate(donataire.dateNaissance, l.date) < 18) motifs.push('le donataire était mineur au jour du don (émancipation non prise en compte)');
    } else if (estDescendant || estNeveu) {
      nonVerifiable.push('date de naissance du donataire');
    }
    if (motifs.length > 0) {
      successionLegaleResult.explicationsTexte.push(
        `Don de sommes d'argent à ${nomDonataire} : exonération de l'art. 790 G non retenue (${motifs.join(' ; ')}). ` +
        `Traité comme une donation ordinaire pour le rappel fiscal.`
      );
      return false;
    }
    if (nonVerifiable.length > 0) {
      successionLegaleResult.explicationsTexte.push(
        `Don de sommes d'argent à ${nomDonataire} : exonération de l'art. 790 G retenue sans vérification ` +
        `possible des conditions d'âge (${nonVerifiable.join(', ')} manquante).`
      );
    }
    return true;
  };

  // Dons de sommes d'argent exonérés au titre de l'art. 790 A bis (logement
  // neuf ou rénovation énergétique, 2025-2026 ; versions 2020-2021) : jusqu'à
  // 100 000 € par donateur, fraction exonérée exclue du rappel fiscal
  // (BOI-ENR-DMTG-20-20-20 § 980). Même cercle de donataires que l'art. 790 G,
  // sans condition d'âge. L'emploi des fonds dans les 6 mois est présumé.
  const verifier790ABis = (l: Liberalite): boolean => {
    const periode = NATURES_790A_BIS[l.nature || ''];
    const donataire = family.persons.find(p => p.id === l.beneficiaireId);
    const nomDonataire = l.beneficiaireName || (donataire ? `${donataire.prenom} ${donataire.nom}`.trim() : 'donataire');
    const lien = donataire?.horsFamilleDuDefunt ? '' : (donataire?.lienFamilial?.toLowerCase() || '');
    const estDescendant = lien === 'enfant' || lien.includes('petit-enfant');
    const estNeveu = lien.includes('neveu') || lien.includes('nièce');
    const motifs: string[] = [];
    if (!(estDescendant || (estNeveu && !aDesDescendants))) {
      motifs.push('le donataire n\'est ni un descendant ni, à défaut de descendance, un neveu ou une nièce');
    }
    const date = (l.date || '').slice(0, 10);
    if (date < periode.debut || date > periode.fin) {
      motifs.push(`don hors de la période d'application (${periode.debut.split('-').reverse().join('/')} – ${periode.fin.split('-').reverse().join('/')})`);
    }
    if (motifs.length > 0) {
      successionLegaleResult.explicationsTexte.push(
        `Don de sommes d'argent à ${nomDonataire} : exonération de l'art. 790 A bis non retenue (${motifs.join(' ; ')}). ` +
        `Traité comme une donation ordinaire pour le rappel fiscal.`
      );
      return false;
    }
    successionLegaleResult.explicationsTexte.push(
      `Don de sommes d'argent à ${nomDonataire} : exonération de l'art. 790 A bis retenue dans la limite de 100 000 € ` +
      `par donateur, en présumant l'emploi des fonds dans les 6 mois (logement neuf ou rénovation énergétique) ; la ` +
      `fraction exonérée n'est pas rappelée (BOI-ENR-DMTG-20-20-20 § 980).`
    );
    return true;
  };
  if (liberalites.some(l => l.type === 'donation' && l.nature === "Don d'argent exonéré")) {
    successionLegaleResult.explicationsTexte.push(
      `Don « Don d'argent exonéré » : régime d'exonération non précisé, traité comme une donation ordinaire pour ` +
      `le rappel fiscal. Choisissez la nature exacte du don (don familial art. 790 G, ou art. 790 A bis).`
    );
  }

  const dmtgDonations: DmtgDonation[] = liberalites
    .filter(l => l.type === 'donation')
    .map(l => ({
      id: l.id,
      date: l.date,
      donorId: family.decedentId,
      doneeId: l.beneficiaireId,
      valeurDon: l.valeurFiscaleActe ?? l.valeur,
      // Biens ruraux donnés (art. 793 bis) : s'imputent sur le seuil du donataire.
      valeurRuraleAgricole: (l.valeurFiscaleActe ?? l.valeur) * (l.partRuraleAgricole || 0),
      // Don familial de sommes d'argent (art. 790 G CGI) : exonération
      // dédiée de 31 865€ (params.abattements.don_790G), cumulable avec et
      // distincte de l'abattement général en ligne directe — cf. recall.ts,
      // branche `type === 'familiale_790G'`. Valeur de `nature` alignée sur
      // l'option "Dons familiaux de sommes d'argent" de DonationForm.tsx.
      type: l.nature === NATURE_790G && verifier790G(l) ? 'familiale_790G' as const
        : NATURES_790A_BIS[l.nature || ''] && verifier790ABis(l) ? 'exonere_790A_bis' as const
        : undefined
    }));

  // Rappel fiscal des donations reçues par un enfant ou frère/sœur représenté
  // (prédécédé ou renonçant, art. 784 CGI) : elles consomment l'abattement que
  // ses représentants se partagent, au prorata de leur part dans la souche.
  const partParPersonne = new Map<PersonId, number>();
  heirs.forEach(h => partParPersonne.set(h.personId, (partParPersonne.get(h.personId) || 0) + h.partCivile));
  const representantsParSouche = new Map<PersonId, PersonId[]>();
  beneficiaries.forEach(b => {
    if (!b.representedOf) return;
    const ids = representantsParSouche.get(b.representedOf) || [];
    if (!ids.includes(b.id)) ids.push(b.id);
    representantsParSouche.set(b.representedOf, ids);
  });
  representantsParSouche.forEach((ids, representeId) => {
    const totalSouche = ids.reduce((sum, id) => sum + (partParPersonne.get(id) || 0), 0);
    dmtgDonations
      .filter(d => d.doneeId === representeId)
      .forEach(d => ids.forEach(id => {
        const ratio = totalSouche > 0 ? (partParPersonne.get(id) || 0) / totalSouche : 1 / ids.length;
        dmtgDonations.push({
          ...d, id: `${d.id}-rappel-${id}`, doneeId: id, valeurDon: d.valeurDon * ratio,
          valeurRuraleAgricole: (d.valeurRuraleAgricole || 0) * ratio
        });
      }));
  });

  const dmtgResult = computeDMTG({
    deathDate: referenceDate,
    params: DEFAULT_DMTG_PARAMS,
    regimeMatrimonial: undefined,
    assets: dmtgAssets,
    civilShares,
    beneficiaries,
    donations: dmtgDonations,
    avContracts,
    inventaireNotarieProduit: params.inventaireNotarieProduit,
    passif: patrimony.passifs
  });

  // 9. Frais de notaire : émoluments (barème dégressif déclaration de
  // succession + attestation immobilière si biens immobiliers, forfait
  // notoriété, TVA — cf. fiscal.ts::computeNotaryFees, non paramétrable) +
  // débours (forfait illustratif paramétrable, cf. computeDebours), sur
  // l'actif brut successoral.
  const valeurImmobiliere = dmtgAssets
    .filter(a => a.nature === 'immobilier')
    .reduce((sum, a) => sum + a.valeurVenale, 0);
  const notaryFeesResult = computeNotaryFees(patrimony.biensExistants, valeurImmobiliere);
  const deboursMontant = params.debours ? computeDebours(patrimony.biensExistants, params.debours) : 0;
  const fraisNotaireTotal = notaryFeesResult.frais + deboursMontant;

  // 10. Transmission nette = Patrimoine net - droits DMTG réels - frais de
  // notaire (émoluments + débours) + capital AV net hors succession. L'AV
  // n'est plus à soustraire séparément depuis que buildPatrimonySnapshot
  // exclut déjà les contrats AV de `biensExistants` en amont (cf. décision
  // du 2026-07-18) : la resoustraire ici la compterait deux fois — mais son
  // capital net (capitalBrut - prélèvement 990I, cf. dmtg/assurance-vie.ts)
  // doit bien être rajouté, sans quoi la transmission nette globale ignore
  // entièrement l'assurance-vie (cf. décision du 2026-07-17, revue depuis).
  const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
  const capitalAVNetTotal = Object.values(dmtgResult.perBeneficiary)
    .reduce((sum, b) => sum + (b.capitalAVNet || 0), 0);
  // + indemnités de réduction versées par les donataires réduits, qui entrent
  // dans ce que reçoivent les héritiers (phase 3, R10).
  // − frais funéraires (forfait réparti entre bénéficiaires, dmtg/index.ts) : déduits aussi
  // par héritier dans netBreakdown.ts, pour que le total égale la somme des parts nettes.
  const fraisFunerairesTotal = Object.values(dmtgResult.perBeneficiary)
    .reduce((sum, b) => sum + (b.fraisFunerairesImputes || 0), 0);
  const transmissionNette = patrimoineNet + partage.totalIndemnitesReduction + capitalAVNetTotal
    - dmtgResult.totals.droitsTotaux - fraisNotaireTotal - fraisFunerairesTotal;

  // 11. Répartition nette par héritier (droits DMTG + frais de notaire +
  // droit de partage, prorata part civile) : source unique de vérité pour
  // tous les écrans (Synthese.tsx, ProcessusCalcul.tsx), cf. netBreakdown.ts.
  const legatairesResult = legsNonHeritiers.map(l => {
    const person = family.persons.find(p => p.id === l.personId);
    return {
      personId: l.personId,
      nom: person ? `${person.prenom || ''} ${person.nom || ''}`.trim() || l.nom : l.nom,
      lien: person?.lienFamilial || (l.personId === family.survivingSpouseId ? 'conjoint' : 'légataire'),
      montant: Math.round(l.montant)
    };
  });

  // Une entrée par personne (un conjoint peut porter une ligne PP et une ligne
  // usufruit) : valeur civile reçue (cashReparti, après DUH) et soulte cumulées.
  const heirsNet = Array.from(heirs.reduce((m, h, i) => {
    const e = m.get(h.personId);
    if (e) {
      e.valeurRecue += cashReparti[i];
      e.soulte += h.soulte || 0;
      if (e.typeQuotePart !== h.typeQuotePart) e.typeQuotePart = 'usufruit';
    } else {
      m.set(h.personId, { h, valeurRecue: cashReparti[i], soulte: h.soulte || 0, typeQuotePart: h.typeQuotePart });
    }
    return m;
  }, new Map<PersonId, { h: typeof heirs[number]; valeurRecue: number; soulte: number; typeQuotePart?: typeof heirs[number]['typeQuotePart'] }>()).values());

  const netBreakdown = computeNetPerHeir(
    [...heirsNet.map(({ h, valeurRecue, soulte, typeQuotePart }) => ({
      personId: h.personId,
      nom: h.nom,
      lien: h.lien,
      baseApresFrais: dmtgResult.perBeneficiary[h.personId]?.baseApresFrais || 0,
      valeurRecue,
      soulte,
      fraisFuneraires: dmtgResult.perBeneficiary[h.personId]?.fraisFunerairesImputes || 0,
      // droitsHorsAV (PAS droitsTotaux) : le 990I porte sur le capital AV,
      // déjà déduit une fois dans capitalAVNet ci-dessous — cf. netBreakdown.ts.
      // Les droits dus sur les primes 757 B y figurent, le capital restant
      // entier dans capitalAVNet et absent de valeurRecue (pas de double compte).
      droitsTotaux: dmtgResult.perBeneficiary[h.personId]?.droitsHorsAV || 0,
      typeQuotePart,
      capitalAVNet: dmtgResult.perBeneficiary[h.personId]?.capitalAVNet || 0
    })),
    ...legatairesResult.map(l => ({
      personId: l.personId,
      nom: l.nom,
      lien: l.lien,
      baseApresFrais: dmtgResult.perBeneficiary[l.personId]?.baseApresFrais || 0,
      valeurRecue: l.montant,
      fraisFuneraires: dmtgResult.perBeneficiary[l.personId]?.fraisFunerairesImputes || 0,
      droitsTotaux: dmtgResult.perBeneficiary[l.personId]?.droitsHorsAV || 0,
      typeQuotePart: 'pleine_propriete' as const,
      capitalAVNet: dmtgResult.perBeneficiary[l.personId]?.capitalAVNet || 0,
      horsIndivision: true,
      montantHorsIndivision: l.montant
    }))],
    {
      actifBrut: patrimony.biensExistants,
      passif: patrimony.passifs,
      fraisNotaireTotal,
      partageEnvisage
    }
  );

  return {
    masseCalcul: reserveResult.masseCalcul,
    reintegrationsCiviles: deltaCivilTotal,
    reserve: reserveResult.reserveGlobale,
    quotiteDisponible: reserveResult.quotiteDisponible,
    transmissionNette,
    heirs,
    dmtg: dmtgResult,
    netBreakdown,
    fraisNotaire: fraisNotaireTotal,
    family,
    nbSouchesEnfants: successionLegaleResult.nbSouchesEnfants,
    details: {
      reductions: reductionResult.reductions,
      rapports: rapportResult.rapports
    },
    explicationsTexte: successionLegaleResult.explicationsTexte,
    legataires: legatairesResult,
    optionConjoint: successionLegaleResult.optionConjoint
  };
}

// ─── Chaînage 2nd décès (réunion d'usufruit, art. 1133 CGI) ─────────

export interface ChainedTransmissionInput {
  // Contexte complet du 1er décès (défunt + patrimoine qui entre dans SA
  // succession). Symétrique au 2nd décès ci-dessous : rien ici ne présuppose
  // qui du couple meurt en premier — l'appelant choisit l'ordre en
  // construisant firstDeath/secondDeath en conséquence (un seul chemin de
  // code pour les deux ordres, cf. décision actée).
  firstDeath: TransmissionContext;
  // Contexte complet du 2nd décès : patrimony doit être le patrimoine PROPRE
  // du conjoint survivant (cf. transmissionHelpers.ts::buildSurvivingSpousePatrimony),
  // SANS l'usufruit qu'il détenait sur la part du 1er défunt — cet usufruit
  // est traité à part ci-dessous, jamais dans l'assiette taxable de ce
  // second computeTransmission (cf. diagnostic chiffré sur le cas Imeris :
  // l'inclure y produirait une masse fiscale et des droits trop élevés).
  secondDeath: TransmissionContext;
}

export interface ReunionUsufruitShare {
  personId: PersonId;
  montant: number;
}

export interface ChainedTransmissionResult {
  firstDeath: TransmissionResult;
  secondDeath: TransmissionResult;
  // Valeur de l'usufruit détenu par le conjoint sur la part du 1er défunt,
  // réunie à la nue-propriété à son propre décès (art. 1133 CGI, sans
  // taxation) — valorisée au barème 669 CGI figé au 1er décès (pas de
  // réévaluation), répartie entre les nu-propriétaires identifiés à l'issue
  // du 1er décès au prorata de leur part en nue-propriété respective.
  reunionUsufruit: {
    total: number;
    parNuProprietaire: ReunionUsufruitShare[];
  };
  // Transmission nette de chaque personne, 2nd décès + réunion d'usufruit
  // combinés : un nu-propriétaire du 1er décès qui n'est pas lui-même
  // héritier du conjoint au 2nd décès (ex. enfant non commun du 1er défunt)
  // n'apparaît que via sa part de réunion, jamais via secondDeath.netBreakdown.
  transmissionNetteCombinee: { personId: PersonId; montant: number }[];
}

/**
 * Chaîne deux décès successifs (couple marié) : calcule normalement la
 * succession du 1er défunt, calcule normalement la succession propre du
 * conjoint survivant (sans l'usufruit qu'il détenait), puis ajoute la
 * réunion de cet usufruit hors taxation directement sur la transmission
 * nette des nu-propriétaires du 1er décès — jamais dans l'assiette du 2nd
 * décès (cf. ChainedTransmissionInput.secondDeath). Mécanisme validé sur le
 * cas-test Imeris Patrimoine (pages 6 et 25 : masse fiscale du conjoint =
 * son patrimoine propre seul ; réunion ajoutée à part, après droits).
 */
export function computeChainedTransmission(input: ChainedTransmissionInput): ChainedTransmissionResult {
  const firstDeath = computeTransmission(input.firstDeath);
  const secondDeath = computeTransmission(input.secondDeath);

  const survivingSpouseId = input.firstDeath.family.survivingSpouseId;

  // Usufruit détenu par le conjoint sur la part du 1er défunt (une seule
  // ligne en pratique, mais on somme par sécurité — un même héritier peut
  // porter plusieurs lignes de parts, cf. quart_pp_3quarts_us).
  // Seule la valeur de l'usufruit (jamais les libéralités du conjoint, que
  // partFinale inclut sur sa première ligne) est réunie aux nus-propriétaires.
  // Usufruit légal, issu d'une DDV ou d'un legs en usufruit (art. 1094-1).
  const reunionTotalBrut = survivingSpouseId
    ? firstDeath.heirs
        .filter(h => h.personId === survivingSpouseId)
        .reduce((sum, h) => sum + (h.valeurUsufruit ?? (h.typeQuotePart === 'usufruit' ? h.partFinale : 0)), 0)
    : 0;
  const reunionTotal = Math.round(reunionTotalBrut);

  // Nus-propriétaires : lignes en nue-propriété ; à défaut (usufruit reçu par
  // legs, héritiers en pleine propriété du reste), les autres héritiers au
  // prorata de ce qu'ils reçoivent de la succession.
  const lignesNP = firstDeath.heirs.filter(h => h.typeQuotePart === 'nue_propriete');
  const nuProprietaires = lignesNP.length > 0
    ? lignesNP
    : firstDeath.heirs.filter(h => h.personId !== survivingSpouseId && (h.recuSuccession || 0) > 0);
  const poids = (h: typeof firstDeath.heirs[number]) => lignesNP.length > 0 ? h.partFinale : (h.recuSuccession || 0);
  const totalNP = nuProprietaires.reduce((sum, h) => sum + poids(h), 0);

  const parNuProprietaire: ReunionUsufruitShare[] = reunionTotalBrut > 0 ? nuProprietaires.map(h => ({
    personId: h.personId,
    montant: totalNP > 0 ? Math.round(reunionTotalBrut * (poids(h) / totalNP)) : 0
  })) : [];

  const netMap = new Map<PersonId, number>();
  secondDeath.netBreakdown.heirs.forEach(h => netMap.set(h.personId, h.netARecevoir));
  parNuProprietaire.forEach(r => {
    netMap.set(r.personId, (netMap.get(r.personId) || 0) + r.montant);
  });

  const transmissionNetteCombinee = Array.from(netMap.entries()).map(([personId, montant]) => ({
    personId,
    montant
  }));

  return {
    firstDeath,
    secondDeath,
    reunionUsufruit: { total: reunionTotal, parNuProprietaire },
    transmissionNetteCombinee
  };
}

// Export des fonctions utilitaires
export * from './types';
export * from './successionLegale';
export * from './reserve';
export * from './fiscal';
export * from './netBreakdown';
