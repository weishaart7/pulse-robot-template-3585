import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { computeQuotePart } from '@/lib/immobilier/rentabilite';
import { partFoyerEmprunt } from '@/lib/budget/emprunts';
import { capitalRestantDuAu, construireTableau, contratDepuisEmprunt } from '@/lib/credit/contrat';
import { NATURE_GROUPEMENT_FONCIER, TYPES_GROUPEMENT_FONCIER } from '@/constants/assetTypes';
import type { BienIFIInput, CategorieBienIFI, DetteIFIInput } from './calculerDeclarationIFI';

// Préremplissage de la 2042-IFI au 1.1.N depuis Patrimoine (actifs immobiliers) et Passifs
// (emprunts reliés). Les montants sont ramenés à la part du foyer ; l'utilisateur les surcharge
// ensuite dans la déclaration. Chaque ligne porte ses points à vérifier, affichés sous la grille.

const NATURES_BATIES_AUTRES = [
  'Résidences secondaires',
  'Immeubles locatifs (loués nus)',
  'Immeubles locatifs (meublés)',
  'Immeubles professionnels (hors LMP)',
  'Maison mobile (péniche, etc.)',
  'Parking / Garage / Box',
];

const NATURES_INDIRECTES = ['Parts de SCI', 'Parts de SCPI', "Parts de sociétés d'épargne forestière"];

export interface LigneActifIFI {
  assetId?: string;
  denomination: string;
  /** Bien détenu directement (annexe 2) ; absent pour une part de société (9CA). */
  categorie?: CategorieBienIFI;
  valeur: number;
  aVerifier: string[];
}

/** Ligne de l'IFI d'un actif, ou null s'il n'entre pas dans l'assiette (non immobilier, détenu par une société). */
export function ligneActifIFI(asset: Asset): LigneActifIFI | null {
  if (asset.societe_proprietaire_id) return null; // compté dans la valeur des parts de la société
  const nature = asset.nature;
  const aVerifier: string[] = [];
  let categorie: CategorieBienIFI | undefined;

  if (nature === 'Résidence principale') categorie = 'residencePrincipale';
  else if (NATURES_BATIES_AUTRES.includes(nature)) {
    categorie = 'autreBati';
    if (nature === 'Immeubles locatifs (meublés)') aVerifier.push('Exonéré comme bien professionnel si le foyer est loueur en meublé professionnel (LMP).');
    if (nature === 'Immeubles professionnels (hors LMP)') aVerifier.push("Exonéré s'il est affecté à votre propre activité professionnelle.");
  } else if (nature === 'Terrains') categorie = 'autreNonBati';
  else if (nature === 'Bois & forêts') {
    categorie = asset.conditions_exoneration_rural ? 'boisForets' : 'autreNonBati';
    if (!asset.conditions_exoneration_rural) aVerifier.push("Exonération de 75 % non retenue : engagement de gestion durable non coché sur l'actif.");
  } else if (nature === 'Terrains agricoles') {
    const exonere = asset.regime_exoneration_rural === 'agricole' && asset.conditions_exoneration_rural;
    categorie = exonere ? 'biensRurauxBailLongTerme' : 'autreNonBati';
    if (!exonere) aVerifier.push('Exonération partielle non retenue : bail rural à long terme non renseigné sur l\'actif.');
  } else if (nature === NATURE_GROUPEMENT_FONCIER) {
    const regime = asset.regime_exoneration_rural
      ?? TYPES_GROUPEMENT_FONCIER.find((t) => t.value === asset.type_groupement)?.regime;
    if (asset.conditions_exoneration_rural && regime === 'forestier') categorie = 'boisForets';
    else if (asset.conditions_exoneration_rural && regime === 'agricole') categorie = 'partsGfaGaf';
    else aVerifier.push("Exonération partielle non retenue (conditions non cochées sur l'actif) : parts déclarées en 9CA.");
  } else if (!NATURES_INDIRECTES.includes(nature)) {
    return null;
  }

  // Parts en 9CA : la limite « fraction représentative d'immeubles » est rappelée une fois, sur la case.
  if (asset.mode_detention === 'Nue-propriété') {
    // Art. 968 : l'usufruitier déclare la pleine propriété, sauf usufruit légal ou réserve
    // d'usufruit sur une vente à un héritier (répartition selon l'art. 669).
    aVerifier.push("Nue-propriété : déclarée par l'usufruitier, sauf usufruit légal du conjoint ou vente avec réserve d'usufruit.");
  }
  if (asset.mode_detention === 'Usufruit') aVerifier.push("Usufruit : la pleine propriété est déclarée (art. 968).");
  if (!asset.valeur_estimee) aVerifier.push('Valeur estimée absente sur l\'actif.');

  const valeur = asset.mode_detention === 'Nue-propriété'
    ? 0
    : (asset.valeur_estimee || 0) * (computeQuotePart(asset) / 100);
  return { assetId: asset.id, denomination: asset.denomination || nature, categorie, valeur, aVerifier };
}

export interface LigneDetteIFI extends DetteIFIInput {
  empruntId?: string;
  denomination: string;
  aVerifier: string[];
}

/** 1er janvier N, minuit : l'échéance de janvier n'est pas encore payée. */
const veilleDuPremierJanvier = (annee: number) => new Date(annee - 1, 11, 31);

/**
 * Dette d'un emprunt relié à un bien retenu, au 1.1.N et à la part du foyer, ou null si l'emprunt
 * ne finance aucun bien de l'assiette. Capital restant dû tiré du tableau d'amortissement quand le
 * contrat est complet, sinon le capital restant dû saisi (approximation signalée).
 */
export function ligneDetteIFI(emprunt: Emprunt, actifs: LigneActifIFI[], annee: number): LigneDetteIFI | null {
  const actif = actifs.find((a) => a.assetId && a.assetId === emprunt.asset_id);
  if (!actif || actif.valeur <= 0) return null;
  const aVerifier: string[] = [];
  const part = partFoyerEmprunt(emprunt) ?? 1;
  const contrat = contratDepuisEmprunt(emprunt);
  const ligne: DetteIFIInput['ligne'] = /travaux/i.test(emprunt.nature || '') ? '9GF' : '9GH';
  const base = {
    empruntId: emprunt.id,
    denomination: emprunt.nature || 'Emprunt',
    ligne,
    categorieBien: actif.categorie,
    aVerifier,
  };

  if (contrat?.inFine) {
    const debut = contrat.datePremiereEcheance;
    const moisEcoules = (annee - debut.getFullYear()) * 12 - debut.getMonth() + 1;
    return {
      ...base,
      montant: contrat.capitalInitial * part,
      inFine: {
        montantEmprunte: contrat.capitalInitial * part,
        anneesEcoulees: Math.max(0, Math.floor(moisEcoules / 12)),
        dureeAnnees: contrat.dureeTotaleMois / 12,
      },
    };
  }
  let crd: number;
  if (contrat) {
    crd = capitalRestantDuAu(construireTableau(contrat), contrat.capitalInitial, veilleDuPremierJanvier(annee));
  } else {
    crd = emprunt.capital_restant_du || 0;
    aVerifier.push('Contrat incomplet : capital restant dû saisi, pas celui au 1er janvier.');
    if (emprunt.mode_amortissement === 'In fine') aVerifier.push('Prêt in fine : déduction dégressive non appliquée faute de contrat complet.');
  }
  return { ...base, montant: crd * part };
}

/** Lignes d'actif et de passif préremplies ; `biens` et `biensIndirects` alimentent directement le moteur. */
export function preremplirIFI(assets: Asset[], emprunts: Emprunt[], annee: number) {
  const actifs = assets.map(ligneActifIFI).filter((l): l is LigneActifIFI => l !== null);
  const dettes = emprunts
    .map((e) => ligneDetteIFI(e, actifs, annee))
    .filter((l): l is LigneDetteIFI => l !== null);
  const biens: BienIFIInput[] = actifs
    .filter((a) => a.categorie)
    .map((a) => ({ categorie: a.categorie as CategorieBienIFI, valeur: a.valeur }));
  const biensIndirects = actifs.filter((a) => !a.categorie).map((a) => a.valeur);
  return { actifs, dettes, biens, biensIndirects };
}
