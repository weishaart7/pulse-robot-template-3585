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
  computeDMTG,
  DEFAULT_DMTG_PARAMS,
  Asset as DmtgAsset,
  Beneficiary as DmtgBeneficiary,
  CivilShare
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
  const naissance = new Date(conjoint.dateNaissance);
  const reference = new Date(referenceDateISO);
  let age = reference.getFullYear() - naissance.getFullYear();
  const moisPasse = reference.getMonth() - naissance.getMonth();
  if (moisPasse < 0 || (moisPasse === 0 && reference.getDate() < naissance.getDate())) {
    age--;
  }
  return age;
}

/**
 * Orchestrateur principal : calcule la transmission complète (dévolution
 * civile + fiscalité DMTG + net par héritier). Seul point d'entrée appelé
 * par l'UI — computeDMTG n'est plus invoqué directement par les composants.
 */
export function computeTransmission(ctx: TransmissionContext): TransmissionResult {
  const { family, patrimony, liberalites, params, conjointOption, rawAssets, partageEnvisage } = ctx;
  const referenceDate = ctx.referenceDate || new Date().toISOString().split('T')[0];

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
    family.hasSurvivingSpouse,
    conjointOption
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

    if (!dejaImpute) {
      // Somme de tous les rapports de cet héritier (pas juste le premier
      // trouvé) : un même enfant peut cumuler une donation en avance de
      // part ET un legs sur part successorale, les deux doivent se déduire.
      const rapportTotal = rapportResult.rapports
        .filter(r => r.personId === heir.personId)
        .reduce((sum, r) => sum + r.montantRapport, 0);
      partFinale -= rapportTotal;

      // Ajouter les libéralités maintenues
      const liberalitesMaintenues = liberalites
        .filter(lib => lib.beneficiaireId === heir.personId)
        .reduce((sum, lib) => {
          const reduction = reductionResult.reductions.find(r => r.liberaliteId === lib.id);
          return sum + (lib.valeur - (reduction?.montantReduit || 0));
        }, 0);

      partFinale += liberalitesMaintenues;
    }

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

  // 7. Construction des entrées DMTG (déplacé depuis Synthese.tsx — Phase 2
  // de la consolidation du moteur : computeTransmission appelle lui-même
  // computeDMTG, l'UI n'a plus à connaître la forme du contexte DMTG).

  // civilShares[].fraction = part de CE bien dans la masse totale, calculée
  // sur la somme réelle des partFinale (pas sur transmissionNette, déjà nette
  // d'impôts — c'était le bug corrigé ici, à sa vraie source).
  const sumPartFinale = heirs.reduce((sum, h) => sum + h.partFinale, 0);
  const civilShares: CivilShare[] = heirs.map(heir => ({
    beneficiaryId: heir.personId,
    fraction: sumPartFinale > 0 ? heir.partFinale / sumPartFinale : 0,
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
      adoptionSimpleAbattementPlein: person?.adoptionSimpleAbattementPlein || false
    };
  });

  // Adaptation des lignes "assets" brutes (forme Supabase) vers les Asset[]
  // attendus par computeDMTG. NB : nature toujours forcée à 'autre' et
  // isResidencePrincipale déduit de nature === 'immobilier' (marque TOUT bien
  // immobilier, pas seulement la résidence principale réelle) — défaut
  // préexistant repris tel quel, hors périmètre de cette consolidation.
  // `nature` en revanche est désormais mappée correctement (elle était
  // forcée à 'autre' auparavant) : nécessaire pour l'assiette de l'attestation
  // immobilière du calcul des frais de notaire (cf. étape 9 ci-dessous). Ce
  // champ n'était lu par aucune règle fiscale DMTG existante avant cet ajout
  // (vérifié), donc ce correctif ne change aucun calcul de droits déjà en place.
  //
  // valeurVenale est pondérée par lib/patrimoine/succession.ts::getPartSuccessorale
  // (régime matrimonial / indivision) : même fonction que le chemin civil
  // (transmissionHelpers.ts::buildPatrimonySnapshot), pour que le fiscal et le
  // civil restent alignés sur la même assiette successorale.
  const dmtgAssets: DmtgAsset[] = (rawAssets || []).map(asset => ({
    id: asset.id,
    label: asset.denomination || '',
    valeurVenale: (Number(asset.valeur_estimee) || 0) * getPartSuccessorale(asset, asset.denomination || asset.id),
    nature: asset.nature === 'immobilier' ? 'immobilier' : 'autre',
    location: 'metropole',
    isResidencePrincipale: asset.nature === 'immobilier',
    exclurePour: {}
  }));

  // Pas de regimeMatrimonial transmis à computeDMTG : la liquidation de
  // communauté (mécanisme B, dmtg/matrimonial.ts::computeMatrimonialLiquidation)
  // est désormais redondante avec la pondération par bien ci-dessus (mécanisme A,
  // seul retenu — cf. diagnostic du 2026-07-17). La laisser alimentée aurait
  // affiché un "demi-boni" basé sur des totaux agrégés à 0€ à côté d'un calcul
  // par bien déjà correct, ce qui aurait été trompeur (dmtg/matrimonial.ts et
  // dmtg/index.ts ne sont volontairement pas modifiés : computeDMTG retombe sur
  // ses défauts internes 'séparation'/0€, qui ne sont lus par aucune règle
  // fiscale — seuls des textes de notes non affichés par l'UI en dépendent).
  //
  // 8. Calcul DMTG (seul moteur fiscal, cf. dmtg/index.ts) — donations et
  // avContracts restent vides : rappel fiscal 15 ans et assurance-vie par
  // bénéficiaire ne sont pas encore modélisés côté saisie (cf. décision du
  // 2026-07-17 : reporté à un chantier dédié, pas un fix de code).
  const dmtgResult = computeDMTG({
    deathDate: referenceDate,
    params: DEFAULT_DMTG_PARAMS,
    regimeMatrimonial: undefined,
    assets: dmtgAssets,
    civilShares,
    beneficiaries,
    donations: [],
    avContracts: []
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

  // 10. Transmission nette = Patrimoine net - droits DMTG réels - AV (hors
  // succession) - frais de notaire (émoluments + débours).
  const patrimoineNet = patrimony.biensExistants - patrimony.passifs;
  const transmissionNette = patrimoineNet - dmtgResult.totals.droitsTotaux -
                           (patrimony.assuranceVieTotal || 0) - fraisNotaireTotal;

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

// Export des fonctions utilitaires
export * from './types';
export * from './successionLegale';
export * from './reserve';
export * from './fiscal';
export * from './netBreakdown';
