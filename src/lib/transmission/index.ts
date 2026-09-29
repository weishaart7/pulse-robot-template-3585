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
import { getPartSuccessorale } from '../patrimoine/succession';
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
import { getAssetCategory, isContratHorsSuccession } from '../../constants/assetTypes';
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
  // Sociétés dont le pacte Dutreil est validé (societe_dutreil.eligibilite_validee,
  // art. 787 B CGI) : les titres rattachés (assets.societe_id) sont exonérés à
  // 75 % dans l'assiette des droits. Engagement individuel de conservation des
  // héritiers (4 ans) présumé, signalé dans les explications.
  societesDutreil?: string[];
}

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

/**
 * Orchestrateur principal : calcule la transmission complète (dévolution
 * civile + fiscalité DMTG + net par héritier). Seul point d'entrée appelé
 * par l'UI — computeDMTG n'est plus invoqué directement par les composants.
 */
export function computeTransmission(ctx: TransmissionContext): TransmissionResult {
  const { family, params, conjointOption, rawAssets, partageEnvisage, duhOpte } = ctx;
  // Sentinelle 'conjoint' (liberalites.beneficiaire_conjoint) résolue vers le
  // conjoint du graphe — marié (héritier) ou partenaire de PACS (légataire
  // seulement). Sans conjoint dans le graphe : traité comme un tiers.
  const referenceDate = ctx.referenceDate || new Date().toISOString().split('T')[0];
  // Libéralité en usufruit viager : usufruit du bénéficiaire au barème 669 CGI
  // selon son âge au décès (valeur au jour du décès, art. 922). Jamais deviné :
  // bénéficiaire hors fiche ou sans date de naissance → erreur explicite.
  const liberalites = ctx.liberalites.map(lib => {
    const resolue = lib.beneficiaireId === 'conjoint'
      ? { ...lib, beneficiaireId: family.survivingSpouseId || 'tiers' }
      : lib;
    if (resolue.droitTransmis !== 'usufruit') return resolue;
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
  // sa valeur pleine propriété.
  const getValeurEstimeePonderee = (asset: RawAssetInput): number => {
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

  // Récompenses : n'affectent que la masse commune, donc seulement pertinentes
  // si le régime en a une (cf. regimeHasMasseCommune). Ratio successoral de
  // 50% repris de getPartSuccessorale('Bien commun') — mécanisme A ne gère
  // pas encore les parts inégales/attribution intégrale (trou déjà identifié,
  // chantier séparé) : ce ratio fixe devra être revu en même temps que ce
  // chantier-là plutôt qu'ici.
  const impactRecompenses = regimeHasMasseCommune(ctx.regimeMatrimonial)
    ? soldeRecompenses.ajustementBoniCommun * 0.5
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
  const baseRepartition = residuelReel + partage.totalIndemnitesReduction;
  const civilShares: CivilShare[] = heirs.map((heir, i) => ({
    beneficiaryId: heir.personId,
    fraction: baseRepartition > 0 ? cashReparti[i] / baseRepartition : 0,
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
    const isRepresentation = !!heir.representation && (heir.lien === 'petit_enfant' || heir.lien === 'neveu_niece');
    const representationRootId = isRepresentation ? (heir.representationRootId || heir.personId) : null;

    const person = family.persons.find(p => p.id === heir.personId);

    return {
      id: heir.personId,
      lien: dmtgLien,
      representedOf: representationRootId,
      representationGroup: representationRootId,
      numberOfRepresentants: isRepresentation ? heir.representationCount : undefined,
      partDansSouche: representationRootId ? partSouche(representationRootId, heir.personId) : undefined,
      comesFromRepresentationWithPlurality: heir.lien === 'neveu_niece' && !!heir.representation,
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
    const lien = family.persons.find(p => p.id === personId)?.lienFamilial?.toLowerCase() || '';
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
  const registerAvBeneficiary = (id: string) => {
    if (dmtgBeneficiaryIds.has(id)) return;
    dmtgBeneficiaryIds.add(id);

    let lien: DmtgBeneficiary['lien'] = 'autre';
    if (id === family.survivingSpouseId) {
      lien = 'conjoint';
    } else {
      const person = family.persons.find(p => p.id === id);
      if (person?.lienFamilial === 'Frère/Sœur') lien = 'frere_soeur';
    }

    beneficiaries.push({ id, lien });
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
  // bis CGI, dmtg/assets.ts) appliqué dès la saisie de ce libellé, sans
  // condition d'occupation (hypothèse simplificatrice actée, cohérente avec
  // l'abattement IFI équivalent).
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

  const titresDutreil = (rawAssets || []).filter(a => !!a.societe_id && (ctx.societesDutreil || []).includes(a.societe_id));
  if (titresDutreil.length > 0) {
    successionLegaleResult.explicationsTexte.push(
      `Pacte Dutreil (art. 787 B CGI) : les titres ${titresDutreil.map(a => a.denomination || 'de société').join(', ')} ` +
      `sont exonérés de droits à hauteur de 75 %. Suppose que chaque héritier s'engage à conserver ` +
      `les titres pendant 4 ans et que l'un d'eux exerce une fonction de direction pendant 3 ans — à confirmer.`
    );
  }

  const dmtgAssets: DmtgAsset[] = (rawAssets || [])
    .filter(asset => !isContratHorsSuccession(asset))
    .map(asset => ({
      id: asset.id,
      label: asset.denomination || '',
      valeurVenale: getValeurEstimeePonderee(asset) * getFractionSuccessorale(asset),
      nature: getAssetCategory(asset.nature || '') === 'actifs immobiliers' ? 'immobilier' : 'autre',
      location: 'metropole',
      isResidencePrincipale: asset.nature === 'Résidence principale' && abattementRPApplicable,
      isDutreil: !!asset.societe_id && (ctx.societesDutreil || []).includes(asset.societe_id),
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
  const NATURE_790G = "Dons familiaux de sommes d'argent";
  const donateur = family.persons.find(p => p.id === family.decedentId);
  const aDesDescendants = family.childrenOfDecedent.length > 0;
  const verifier790G = (l: Liberalite): boolean => {
    const donataire = family.persons.find(p => p.id === l.beneficiaireId);
    const nomDonataire = l.beneficiaireName || (donataire ? `${donataire.prenom} ${donataire.nom}`.trim() : 'donataire');
    const lien = donataire?.lienFamilial?.toLowerCase() || '';
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

  const dmtgDonations: DmtgDonation[] = liberalites
    .filter(l => l.type === 'donation')
    .map(l => ({
      id: l.id,
      date: l.date,
      donorId: family.decedentId,
      doneeId: l.beneficiaireId,
      valeurDon: l.valeurFiscaleActe ?? l.valeur,
      // Don familial de sommes d'argent (art. 790 G CGI) : exonération
      // dédiée de 31 865€ (params.abattements.don_790G), cumulable avec et
      // distincte de l'abattement général en ligne directe — cf. recall.ts,
      // branche `type === 'familiale_790G'`. Valeur de `nature` alignée sur
      // l'option "Dons familiaux de sommes d'argent" de DonationForm.tsx.
      type: l.nature === NATURE_790G && verifier790G(l) ? 'familiale_790G' as const : undefined
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
        dmtgDonations.push({ ...d, id: `${d.id}-rappel-${id}`, doneeId: id, valeurDon: d.valeurDon * ratio });
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
  const transmissionNette = patrimoineNet + partage.totalIndemnitesReduction + capitalAVNetTotal
    - dmtgResult.totals.droitsTotaux - fraisNotaireTotal;

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
