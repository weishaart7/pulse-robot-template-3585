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
  computeRapport
} from './reserve';
import { computeNotaryFees, computeDebours } from './fiscal';
import { computeNetPerHeir } from './netBreakdown';
import { getPartSuccessorale } from '../patrimoine/succession';
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
import {
  getFractionAjustee,
  resolvePreciputMode,
  AvantageMatrimonialContext,
} from '../patrimoine/avantagesMatrimoniaux';
import { ClausesData } from '../../types/matrimonial';
import { getAssetCategory } from '../../constants/assetTypes';
import {
  computeDMTG,
  DEFAULT_DMTG_PARAMS,
  Asset as DmtgAsset,
  Beneficiary as DmtgBeneficiary,
  CivilShare,
  Donation as DmtgDonation,
  AVContract as DmtgAVContract
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
  // Clauses d'avantage matrimonial (préciput, attribution intégrale, partage
  // inégal — art. 1515 à 1524 C. civ., cf. src/types/matrimonial.ts et
  // lib/patrimoine/avantagesMatrimoniaux.ts). Ajuste la fraction successorale
  // par bien commun concerné, en remplacement du 50% par défaut de
  // getPartSuccessorale — même mécanisme A que les récompenses/créances
  // ci-dessus.
  clausesData?: ClausesData;
  // Créance de participation (art. 1569-1581 C. civ.), décès uniquement pour
  // cette v1. Volontairement PAS dérivé de clausesData ici (contrairement à
  // preciput/attribution_integrale/partage_inegal ci-dessus) : ce champ ne
  // porte qu'un booléen scalaire résolu par l'appelant depuis
  // clausesData['exclusion_biens_professionnels'], jamais l'objet ClausesData
  // en entier — passer clausesData tel quel activerait aussi
  // avantageMatrimonialCtx/getFractionAjustee (pondération PAR ACTIF) pour un
  // contexte "conjoint décède en premier" construit avec buildSpouseRawAssets
  // (valeurs déjà pré-pondérées, qualification_bien neutralisée), ce qui
  // fausserait la masse successorale. Le calcul lui-même n'opère jamais sur
  // rawAssets/qualification_bien (patrimoines originaire/final indépendants
  // des assets), donc reste symétrique dans les deux sens de décès sans ce
  // risque — cf. diagnostic chantier participation aux acquêts.
  participationAcquets?: {
    patrimoineOriginaire: PatrimoineLigneCalcInput[];
    patrimoineFinal: PatrimoineLigneCalcInput[];
    exclusionBiensProfessionnels: boolean;
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
  const { family, liberalites, params, conjointOption, rawAssets, partageEnvisage, duhOpte } = ctx;
  const referenceDate = ctx.referenceDate || new Date().toISOString().split('T')[0];

  // 0. Récompenses (art. 1468-1478 C. civ.) et créances entre époux
  // (art. 1479, 1543 C. civ.) — chantier 3A, branché sur le mécanisme A.
  // Le solde net vient ajuster la masse successorale AVANT le
  // calcul par bien (impact civil : réserve/QD/parts des héritiers) ET dans
  // dmtgAssets (impact fiscal, cf. plus bas) — les deux doivent bouger
  // ensemble pour rester alignés, comme le reste du mécanisme A
  // (cf. commentaire de valeurVenale plus bas sur cet alignement).
  const decedentRole = getDecedentRole(family.decedentId);

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
    });
    if (epouxDebiteur === decedentRole) {
      deltaParticipationAcquets = -montantCreance;
    } else if (epouxCreancier === decedentRole) {
      deltaParticipationAcquets = montantCreance;
    }
  }

  // 0bis. Avantages matrimoniaux (préciput, attribution intégrale, partage
  // inégal) : construit le contexte attendu par getFractionAjustee à partir
  // de ClausesData (mapping validé : preciputAssetIds ← selectedAssets,
  // preciputMode ← resolvePreciputMode(options), attributionIntegraleMode ←
  // options.porteSur (défaut 'pleine_propriete' si la clause est active sans
  // porteSur renseigné), partConjointInegal ← partPleineProprietee).
  const preciputClause = ctx.clausesData?.['preciput'];
  const attributionIntegraleClause = ctx.clausesData?.['attribution_integrale'];
  const partageInegalClause = ctx.clausesData?.['partage_inegal'];

  const preciputMode = preciputClause?.enabled ? resolvePreciputMode(preciputClause.options) : null;
  const attributionIntegraleMode = attributionIntegraleClause?.enabled
    ? (attributionIntegraleClause.options?.porteSur || 'pleine_propriete')
    : null;
  const partConjointInegal = partageInegalClause?.enabled
    ? (partageInegalClause.partPleineProprietee ?? null)
    : null;

  // npSurvivant (barème art. 669 CGI) n'est résolu que si une clause en
  // usufruit est réellement active : getConjointAge lève si la date de
  // naissance du conjoint est manquante, à éviter pour les dossiers qui ne
  // se servent d'aucune clause en usufruit.
  const needsNpSurvivant = preciputMode === 'usufruit' || attributionIntegraleMode === 'usufruit';
  const npSurvivant = needsNpSurvivant
    ? getDemembrementPct(getConjointAge(family, referenceDate), 'nue_propriete')
    : 0;

  const avantageMatrimonialCtx: AvantageMatrimonialContext | null =
    preciputMode || attributionIntegraleMode || partConjointInegal !== null
      ? {
          preciputAssetIds: preciputClause?.selectedAssets || [],
          preciputMode,
          attributionIntegraleMode,
          partConjointInegal,
          npSurvivant
        }
      : null;

  // Fraction successorale par bien : avantage matrimonial si une clause
  // concerne ce bien, sinon repli sur getPartSuccessorale (comportement
  // inchangé) — même fonction utilisée côté civil (delta ci-dessous) et
  // côté fiscal (dmtgAssets plus bas), pour rester alignés.
  const getFractionSuccessorale = (asset: RawAssetInput): number => {
    const ajustee = avantageMatrimonialCtx ? getFractionAjustee(asset, avantageMatrimonialCtx) : null;
    return ajustee ?? getPartSuccessorale(asset, asset.denomination || asset.id);
  };

  const deltaAvantageMatrimonial = avantageMatrimonialCtx
    ? (rawAssets || [])
        .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
        .reduce((sum, asset) => {
          const ajustee = getFractionAjustee(asset, avantageMatrimonialCtx);
          if (ajustee === null) return sum;
          const defaut = getPartSuccessorale(asset, asset.denomination || asset.id);
          return sum + (ajustee - defaut) * (Number(asset.valeur_estimee) || 0);
        }, 0)
    : 0;

  // patrimony est ré-ancré ici (plutôt que déstructuré directement depuis ctx
  // avec les autres champs ci-dessus) pour que TOUTES les lectures en aval de
  // patrimony.biensExistants — masse de calcul, rapport pour partage, frais de
  // notaire, transmission nette, netBreakdown — intègrent le même ajustement.
  // Sans ce ré-ancrage local, seule l'assiette fiscale (dmtgAssets ci-dessous)
  // bougerait, désalignant à nouveau le civil et le fiscal (cf. le bug déjà
  // corrigé une fois entre Synthese.tsx et ProcessusCalcul.tsx sur
  // netBreakdown, lib/patrimoine/succession.ts).
  const deltaCivilTotal = deltaRecompensesCreances + deltaParticipationAcquets + deltaAvantageMatrimonial
    + (ctx.avReintegrationCivileMontant || 0);
  const patrimony: PatrimonySnapshot = deltaCivilTotal !== 0
    ? { ...ctx.patrimony, biensExistants: ctx.patrimony.biensExistants + deltaCivilTotal }
    : ctx.patrimony;

  // 1. Dévolution civile (succession légale, source unique de vérité)
  // hasTestament = false : la dévolution légale détermine toujours les réservataires,
  // un testament ne fait que redistribuer la quotité disponible (ne supprime pas la réserve).
  const successionLegaleResult = calculateSuccessionLegale(family, false, conjointOption);
  const heirsShares = successionLegaleResult.heritiers;

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
  const imputationResult = imputeLiberalites(
    liberalites,
    reserveResult,
    successionLegaleResult.souchesEnfantsRootIds
  );

  // 4. Réduction si nécessaire
  const reductionResult = applyReductions(
    liberalites,
    imputationResult,
    reserveResult
  );

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

  // 6. Calcul des parts civiles finales (valeur économique réelle : le
  // démembrement usufruit/nue-propriété est appliqué ici, pas dans
  // successionLegale.ts qui ne fait que qualifier le type de droit).
  const personIdsDejaImputes = new Set<PersonId>();
  // dejaDetenus[i] (aligné avec heirs[i]) = donations RAPPORTABLES déjà
  // détenues par cet héritier (= le rapportTotal soustrait ci-dessous, avant
  // réintégration des libéralités maintenues) — nécessaire en aval (§6bis)
  // pour distinguer, dans partFinale, ce qui est déjà en possession de
  // l'héritier de ce qui reste réellement à recevoir en cash de la
  // succession. Comme rapportTotal/liberalitesMaintenues, n'est renseigné
  // qu'une seule fois par personId (première ligne rencontrée), 0 sinon.
  const dejaDetenus: number[] = [];
  const heirs = heirsShares.map(heir => {
    // Usufruit et nue-propriété portent chacun quotePart = 1.0 sur la MÊME
    // assiette : sans ce facteur, la somme des partFinale double la masse
    // partageable pour tout héritier démembré. Barème art. 669 CGI, fonction
    // de l'âge du conjoint (seul usufruitier possible dans ce module) à la
    // date de référence.
    let demembrementPct = 1;
    if (heir.typeQuotePart === 'usufruit' || heir.typeQuotePart === 'nue_propriete') {
      const ageConjoint = getConjointAge(family, referenceDate);
      demembrementPct = getDemembrementPct(ageConjoint, heir.typeQuotePart);
    }

    // Part civile ajustée selon les réductions et rapports
    let partFinale = heir.quotePart * rapportResult.massePartageable * demembrementPct;

    // Un même héritier peut désormais porter plusieurs parts (ex: conjoint 1/4 PP + usufruit 3/4).
    // Rapport et libéralités ne doivent être imputés qu'une seule fois par personne, pas par ligne.
    const dejaImpute = personIdsDejaImputes.has(heir.personId);
    personIdsDejaImputes.add(heir.personId);

    let dejaDetenu = 0;
    if (!dejaImpute) {
      // Somme de tous les rapports de cet héritier (pas juste le premier
      // trouvé) : un même enfant peut cumuler une donation en avance de
      // part ET un legs sur part successorale, les deux doivent se déduire.
      const rapportTotal = rapportResult.rapports
        .filter(r => r.personId === heir.personId)
        .reduce((sum, r) => sum + r.montantRapport, 0);
      partFinale -= rapportTotal;
      dejaDetenu = rapportTotal;

      // Ajouter les libéralités maintenues. Une donation-partage
      // transgénérationnelle (art. 1078-8) a pour beneficiaireId un
      // petit-enfant (jamais un heir.personId ici) : sa valeur doit être
      // créditée au PARENT désigné par generationIntermediaireId, dont la
      // réserve a été consommée par cette donation (cf. reserve.ts::
      // imputeLiberalites) — sinon la souche du parent reçoit sa part de
      // succession pleine en plus de ce que le petit-enfant détient déjà,
      // sur-créditant le total de la branche du montant de la donation.
      const liberalitesMaintenues = liberalites
        .filter(lib =>
          lib.beneficiaireId === heir.personId ||
          (lib.typeImputation === "partage" && lib.generationIntermediaireId === heir.personId)
        )
        .reduce((sum, lib) => {
          const reduction = reductionResult.reductions.find(r => r.liberaliteId === lib.id);
          return sum + (lib.valeur - (reduction?.montantReduit || 0));
        }, 0);

      partFinale += liberalitesMaintenues;
    }
    dejaDetenus.push(dejaDetenu);

    return {
      personId: heir.personId,
      nom: `${heir.prenom} ${heir.nom}`.trim(),
      lien: heir.lien,
      partCivile: heir.quotePart * masseCalcul,
      partFinale: Math.max(0, partFinale),
      typeQuotePart: heir.typeQuotePart,
      representation: heir.representation,
      representationRootId: heir.representationRootId,
      representationCount: heir.representationCount
    };
  });

  // 5.9bis. Droit d'usage et d'habitation (DUH, C. civ. art. 764-766,
  // référentiel §5.9) — optionnel (1 an pour se manifester, jamais tacite,
  // d'où `duhOpte` explicite plutôt qu'un calcul automatique par défaut),
  // distinct du droit de jouissance temporaire ci-dessous (§6ter, effet
  // direct du mariage, purement informatif). Traité comme une libéralité déjà
  // reçue par le conjoint (même logique que dejaDetenus ci-dessus, §6bis) :
  // réduit le cash réellement dû, sans jamais toucher `partFinale` (part
  // théorique). Assiette : logement de nature exacte 'Résidence principale'
  // (même libellé que l'abattement DMTG -20%, ligne ~660 ci-dessous — même
  // simplification déjà actée : pas de vérification d'occupation effective ni
  // des exclusions légales SCI/logement loué/usufruit seul du défunt,
  // signalées comme caveat dans le texte plutôt que qualifiées ici), pondéré
  // par la même fraction successorale que cette assiette. Valeur = 60% de la
  // valeur d'usufruit (barème art. 669 CGI, `getDemembrementPct` — même
  // fonction que le démembrement conjoint ci-dessus), âge du conjoint pris UN
  // AN APRÈS le décès (art. 764), pas son âge au décès : seule variable
  // propre au DUH, d'où un referenceDate décalé passé à `getConjointAge`.
  //
  // Nuance découverte en testant ce bloc (docs/recapitulatif-2026-07-29.md) :
  // contrairement à une donation rapportable réelle (déjà sortie du
  // patrimoine, donc `patrimony.biensExistants` déjà réduit d'autant), le
  // logement reste ici dans le pot à partager — le crédit sur `dejaDetenus`
  // fait donc mécaniquement chuter `sumCashDu` sous `residuelReel` dès que le
  // DUH s'applique, ce qui active la branche « surplus » du §6bis
  // (répartition proportionnelle aux quoteParts d'origine, cf. commentaire
  // plus bas) : une fraction du DUH revient de fait au conjoint par ce canal
  // distinct, au lieu d'un transfert net intégral vers les autres héritiers.
  // Comportement hérité du moteur §6bis existant (déjà documenté comme
  // approximatif pour ce sous-cas), pas une erreur propre au DUH — non
  // corrigé ici, hors périmètre de ce correctif ponctuel.
  if (duhOpte && family.hasSurvivingSpouse && rawAssets) {
    const valeurLogementDUH = rawAssets
      .filter(asset => asset.nature === 'Résidence principale')
      .reduce((sum, asset) => sum + (Number(asset.valeur_estimee) || 0) * getFractionSuccessorale(asset), 0);

    if (valeurLogementDUH > 0) {
      const referenceDateUnAnApres = new Date(referenceDate);
      referenceDateUnAnApres.setFullYear(referenceDateUnAnApres.getFullYear() + 1);
      const ageConjointDansUnAn = getConjointAge(family, referenceDateUnAnApres.toISOString().slice(0, 10));
      const pctUsufruitDUH = getDemembrementPct(ageConjointDansUnAn, 'usufruit');
      const valeurDUH = valeurLogementDUH * pctUsufruitDUH * 0.60;

      const indexConjointHeir = heirs.findIndex(h => h.personId === family.survivingSpouseId);
      if (indexConjointHeir !== -1) {
        dejaDetenus[indexConjointHeir] += valeurDUH;
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

  // 6bis. Répartition du CASH RÉEL par « rapport en moins prenant » (art. 858
  // C. civ., Annexe 1 Étape 7.2-7.3) — corrige l'absence de masse d'exercice
  // distincte pour le conjoint (art. 758-5). `partFinale` reste la part
  // théorique TOTALE en valeur (donation antérieure comprise) : on n'y touche
  // pas. La fraction utilisée en aval pour répartir le cash réellement
  // disponible (civilShares → assiette fiscale DMTG ET netBreakdown, un seul
  // point de correction pour les deux, cf. docs/audit-transmission-clamp-
  // double-masse-2026-08.md Étape 0) doit en revanche exclure ce qu'un
  // héritier détient déjà via une donation rapportable maintenue (dejaDetenu),
  // sous peine de continuer à faire percevoir au donataire déjà sur-doté une
  // part du résiduel réel qui devrait revenir aux héritiers sous-dotés (dont
  // le conjoint en priorité). Cf. docs/design-rapport-moins-prenant-2026-08.md
  // pour la démonstration et la vérification contre 5 scénarios.
  const residuelReel = Math.max(0, patrimony.biensExistants - patrimony.passifs);
  const cashDus = heirs.map((h, i) => Math.max(0, h.partFinale - dejaDetenus[i]));
  const sumCashDu = cashDus.reduce((sum, c) => sum + c, 0);

  let cashReparti: number[];
  if (sumCashDu <= residuelReel) {
    cashReparti = cashDus.slice();
    const surplus = residuelReel - sumCashDu;
    if (surplus > 0) {
      // Résiduel réel strictement supérieur à la somme des cashDu théoriques :
      // sous-cas non rencontré dans les 5 scénarios de docs/design-rapport-
      // moins-prenant-2026-08.md (§1.1 — ne peut structurellement survenir
      // qu'en l'absence de donation rapportable significative, cas où
      // sumCashDu == résiduelReel par construction). Réparti au prorata des
      // quoteParts d'origine (avant rapport/démembrement), faute de scénario
      // testé validant une autre clé pour ce sous-cas précis.
      const sumQuotePart = heirsShares.reduce((sum, h) => sum + h.quotePart, 0);
      cashReparti = cashReparti.map((c, i) =>
        c + (sumQuotePart > 0 ? surplus * (heirsShares[i].quotePart / sumQuotePart) : 0)
      );
    }
  } else {
    // Résiduel réel insuffisant pour couvrir tous les cashDu simultanément
    // (conjoint exhérédé de fait, art. 758-5, éventuellement en concurrence
    // avec un autre héritier sous-doté) : répartition proportionnelle aux
    // cashDu respectifs — arbitrage rendu le 2026-08 (docs/design-rapport-
    // moins-prenant-2026-08.md §1.2), faute de clé de répartition explicite
    // dans le référentiel entre plusieurs héritiers simultanément sous-dotés.
    // Approximation à confirmer par le notaire, pas un partage légalement figé.
    cashReparti = cashDus.map(c => sumCashDu > 0 ? residuelReel * (c / sumCashDu) : 0);
    successionLegaleResult.explicationsTexte.push(
      `Le résiduel réellement disponible (${Math.round(residuelReel).toLocaleString('fr-FR')} €) ` +
      `est insuffisant pour couvrir les parts dues aux héritiers non intégralement couvertes ` +
      `par leurs libéralités déjà perçues (${Math.round(sumCashDu).toLocaleString('fr-FR')} € au total, art. 758-5, 858 C. civ.). ` +
      `La répartition affichée est une approximation proportionnelle aux montants dus par chacun, ` +
      `pas un partage légalement figé — à confirmer par le notaire.`
    );
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

  // civilShares[].fraction = part de CHAQUE héritier dans le résiduel réel
  // disponible (cashReparti, ci-dessus), PAS dans la masse théorique totale
  // (partFinale) — c'est ce qui distingue « ce qui est dû en valeur » de « ce
  // qui reste réellement à recevoir en cash de la succession ».
  const civilShares: CivilShare[] = heirs.map((heir, i) => ({
    beneficiaryId: heir.personId,
    fraction: residuelReel > 0 ? cashReparti[i] / residuelReel : 0,
    source: 'legal'
  }));

  const beneficiaries: DmtgBeneficiary[] = heirs.map(heir => {
    // Le lien retenu pour la fiscalité DMTG est celui calculé par la
    // dévolution civile (heir.lien), pas la catégorie du formulaire famille
    // (ex: "Petit-enfant") : c'est la seule source qui sait si la personne
    // hérite par représentation, et de qui.
    let dmtgLien: DmtgBeneficiary['lien'] = 'autre';
    if (heir.lien === 'conjoint') dmtgLien = 'conjoint';
    else if (heir.lien === 'enfant' || heir.lien === 'petit_enfant') dmtgLien = 'enfant';
    else if (heir.lien === 'parent') dmtgLien = 'ascendant';
    else if (heir.lien === 'frere_soeur') dmtgLien = 'frere_soeur';
    else if (heir.lien === 'neveu_niece') dmtgLien = 'neveu_niece';

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
      comesFromRepresentationWithPlurality: heir.lien === 'neveu_niece' && !!heir.representation,
      isAdoptionSimple: person?.enfantAdopte === 'Adoption simple',
      adoptionSimpleAbattementPlein: person?.adoptionSimpleAbattementPlein || false,
      exonerationSuccession: person?.exonerationSuccession || false
    };
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
  // valeurVenale est pondérée par getFractionSuccessorale (avantage matrimonial
  // si une clause concerne le bien, sinon lib/patrimoine/succession.ts::
  // getPartSuccessorale — régime matrimonial / indivision) : mêmes fonctions
  // que le chemin civil (deltaAvantageMatrimonial ci-dessus,
  // transmissionHelpers.ts::buildPatrimonySnapshot), pour que le fiscal et le
  // civil restent alignés sur la même assiette successorale.
  // Les contrats d'assurance-vie sont hors succession (art. L132-12 code des
  // assurances) : exclus de l'assiette DMTG, taxés séparément via avContracts
  // (990 I / 757 B, cf. dmtg/assurance-vie.ts) — sans cette exclusion, un même
  // contrat serait taxé deux fois dès qu'avContracts est réellement alimenté.
  const dmtgAssets: DmtgAsset[] = (rawAssets || [])
    .filter(asset => getAssetCategory(asset.nature || '') !== 'épargne et assurance-vie')
    .map(asset => ({
      id: asset.id,
      label: asset.denomination || '',
      valeurVenale: (Number(asset.valeur_estimee) || 0) * getFractionSuccessorale(asset),
      nature: getAssetCategory(asset.nature || '') === 'actifs immobiliers' ? 'immobilier' : 'autre',
      location: 'metropole',
      isResidencePrincipale: asset.nature === 'Résidence principale',
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
  const dmtgDonations: DmtgDonation[] = liberalites
    .filter(l => l.type === 'donation')
    .map(l => ({
      id: l.id,
      date: l.date,
      donorId: family.decedentId,
      doneeId: l.beneficiaireId,
      valeurDon: l.valeur
    }));

  const dmtgResult = computeDMTG({
    deathDate: referenceDate,
    params: DEFAULT_DMTG_PARAMS,
    regimeMatrimonial: undefined,
    assets: dmtgAssets,
    civilShares,
    beneficiaries,
    donations: dmtgDonations,
    avContracts,
    inventaireNotarieProduit: params.inventaireNotarieProduit
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
  // notaire (émoluments + débours). L'AV n'est plus à soustraire séparément
  // depuis que buildPatrimonySnapshot exclut déjà les contrats AV de
  // `biensExistants` en amont (cf. décision du 2026-07-18) : la resoustraire
  // ici la compterait deux fois.
  const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
  const transmissionNette = patrimoineNet - dmtgResult.totals.droitsTotaux - fraisNotaireTotal;

  // 11. Répartition nette par héritier (droits DMTG + frais de notaire +
  // droit de partage, prorata part civile) : source unique de vérité pour
  // tous les écrans (Synthese.tsx, ProcessusCalcul.tsx), cf. netBreakdown.ts.
  const netBreakdown = computeNetPerHeir(
    heirs.map(h => ({
      personId: h.personId,
      nom: h.nom,
      lien: h.lien,
      baseApresFrais: dmtgResult.perBeneficiary[h.personId]?.baseApresFrais || 0,
      droitsTotaux: dmtgResult.perBeneficiary[h.personId]?.droitsTotaux || 0,
      typeQuotePart: h.typeQuotePart
    })),
    {
      actifBrut: patrimony.biensExistants,
      passif: patrimony.passifs,
      fraisNotaireTotal,
      partageEnvisage
    }
  );

  return {
    masseCalcul: reserveResult.masseCalcul,
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
  const reunionTotalBrut = survivingSpouseId
    ? firstDeath.heirs
        .filter(h => h.personId === survivingSpouseId && h.typeQuotePart === 'usufruit')
        .reduce((sum, h) => sum + h.partFinale, 0)
    : 0;
  const reunionTotal = Math.round(reunionTotalBrut);

  const nuProprietaires = firstDeath.heirs.filter(h => h.typeQuotePart === 'nue_propriete');
  const totalNP = nuProprietaires.reduce((sum, h) => sum + h.partFinale, 0);

  const parNuProprietaire: ReunionUsufruitShare[] = nuProprietaires.map(h => ({
    personId: h.personId,
    montant: totalNP > 0 ? Math.round(reunionTotalBrut * (h.partFinale / totalNP)) : 0
  }));

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
