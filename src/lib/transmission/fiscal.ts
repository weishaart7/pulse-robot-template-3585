import { TransmissionParams } from './types';

export interface NotaryFeesResult {
  actifSuccessoral: number;
  valeurImmobiliere: number;
  emolumentsDeclarationHT: number;
  emolumentsAttestationHT: number;
  forfaitNotorieteHT: number;
  emolumentsTotalHT: number;
  tva: number;
  // Émoluments TTC (déclaration + attestation immobilière + forfait notoriété + TVA).
  // Les débours (cf. computeDebours) ne sont pas TVA-ables et se calculent séparément.
  frais: number;
}

// Barème des émoluments de notaire — déclaration de succession (art. A444-63
// Code de commerce), assiette = actif brut successoral total. Dégressif par
// tranches (même logique que calculateTaxFromBareme : chaque taux ne
// s'applique qu'à la portion de l'assiette dans sa tranche).
const EMOLUMENTS_DECLARATION_SUCCESSION: { seuil: number; taux: number }[] = [
  { seuil: 0, taux: 1.548 },
  { seuil: 6500, taux: 0.851 },
  { seuil: 17000, taux: 0.580 },
  { seuil: 30000, taux: 0.426 }
];

// Barème des émoluments de notaire — attestation immobilière/notoriété
// (art. A444-121), assiette = valeur des seuls biens immobiliers réellement
// transmis (pas le mobilier/valeurs mobilières).
const EMOLUMENTS_ATTESTATION_IMMOBILIERE: { seuil: number; taux: number }[] = [
  { seuil: 0, taux: 1.935 },
  { seuil: 6500, taux: 1.064 },
  { seuil: 17000, taux: 0.726 },
  { seuil: 30000, taux: 0.532 }
];

// Forfait fixe de l'acte de notoriété (HT), et taux de TVA applicable aux
// émoluments (pas aux débours, cf. computeDebours).
const FORFAIT_NOTORIETE_HT = 56.60;
const TVA_NOTAIRE = 0.20;

/**
 * Calcule les droits selon un barème progressif par tranches
 */
function calculateTaxFromBareme(
  baseNette: number,
  tranches: { seuil: number; taux: number }[]
): number {
  let droits = 0;
  let baseRestante = baseNette;
  
  // Trier les tranches par seuil croissant
  const tranchesSorted = [...tranches].sort((a, b) => a.seuil - b.seuil);
  
  for (let i = 0; i < tranchesSorted.length; i++) {
    const tranche = tranchesSorted[i];
    const seuilSuivant = i < tranchesSorted.length - 1 ? tranchesSorted[i + 1].seuil : Infinity;
    
    if (baseRestante <= 0) break;
    
    // Montant imposable dans cette tranche
    const montantTranche = Math.min(baseRestante, seuilSuivant - tranche.seuil);
    
    if (montantTranche > 0) {
      droits += montantTranche * (tranche.taux / 100);
      baseRestante -= montantTranche;
    }
  }
  
  return Math.round(droits);
}

/**
 * Calcule les émoluments de notaire (déclaration de succession + attestation
 * immobilière le cas échéant + forfait notoriété, TVA incluse). Barème légal,
 * non paramétrable (contrairement aux débours, cf. computeDebours).
 */
export function computeNotaryFees(
  actifSuccessoral: number,
  valeurImmobiliere: number = 0
): NotaryFeesResult {
  const emolumentsDeclarationHT = calculateTaxFromBareme(actifSuccessoral, EMOLUMENTS_DECLARATION_SUCCESSION);
  const emolumentsAttestationHT = valeurImmobiliere > 0
    ? calculateTaxFromBareme(valeurImmobiliere, EMOLUMENTS_ATTESTATION_IMMOBILIERE)
    : 0;
  const emolumentsTotalHT = emolumentsDeclarationHT + emolumentsAttestationHT + FORFAIT_NOTORIETE_HT;
  const tva = Math.round(emolumentsTotalHT * TVA_NOTAIRE);
  const frais = Math.round(emolumentsTotalHT) + tva;

  return {
    actifSuccessoral,
    valeurImmobiliere,
    emolumentsDeclarationHT,
    emolumentsAttestationHT,
    forfaitNotorieteHT: FORFAIT_NOTORIETE_HT,
    emolumentsTotalHT: Math.round(emolumentsTotalHT),
    tva,
    frais
  };
}

/**
 * Débours de notaire (frais réels avancés pour le compte du client : copies
 * d'actes, formalités, géomètre, etc.) — à distinguer des émoluments (barème
 * officiel, cf. computeNotaryFees). Contrairement aux émoluments, il n'existe
 * pas de barème légal pour les débours : la valeur par défaut est purement
 * illustrative et doit être ajustée par l'utilisateur selon ses factures
 * réelles. Calculé sur la même assiette que la déclaration de succession
 * (actif brut, avant déduction du passif).
 */
export function computeDebours(
  actifBrut: number,
  debours: NonNullable<TransmissionParams['debours']>
): number {
  if (debours.mode === "pourcentage") {
    return Math.round(actifBrut * (debours.valeur / 100));
  }
  return Math.round(debours.valeur);
}