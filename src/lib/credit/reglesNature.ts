import { getAssetCategory } from '@/constants/assetTypes';

/**
 * Champs du formulaire d'emprunt qui dépendent de la nature (cf. docs/patrimoine.md).
 * Les valeurs imposées sont appliquées au changement de nature et le champ est verrouillé ;
 * les valeurs par défaut sont appliquées au changement de nature et restent modifiables.
 */
export interface ReglesEmprunt {
  /** Taux nul par construction (PTZ) : taux, type de taux et TAEG masqués. */
  tauxZero: boolean;
  /** Pas de tableau d'amortissement (revolving) : offre de prêt et mode d'amortissement masqués. */
  sansTableau: boolean;
  /** Pas de lien vers un actif ni de garantie (revolving). */
  sansActifNiGarantie: boolean;
  modeImpose?: 'In fine';
  modeParDefaut?: 'In fine';
  garantieImposee?: 'Nantissement';
  garantieParDefaut?: 'Nantissement';
  /** Garanties proposées ; toutes si absent. */
  garantiesProposees?: readonly string[];
  /** L'actif peut-il être relié à un emprunt de cette nature ? */
  actifLiable: (natureActif: string) => boolean;
}

const tous = () => true;
const immobilier = (n: string) => getAssetCategory(n) === 'actifs immobiliers';

export const reglesEmprunt = (nature?: string): ReglesEmprunt => {
  const base: ReglesEmprunt = { tauxZero: false, sansTableau: false, sansActifNiGarantie: false, actifLiable: tous };
  switch (nature) {
    case 'Prêt immobilier (résidence principale)':
    case 'Prêt immobilier (résidences secondaires)':
    case 'Prêt immobilier locatif (investissement locatif)':
      return { ...base, actifLiable: immobilier };
    case 'Prêt à taux zéro (PTZ)':
      return { ...base, tauxZero: true, actifLiable: (n) => n === 'Résidence principale' };
    case 'Crédit relais':
      // Intérêts seuls, capital remboursé à la vente du bien.
      return { ...base, modeParDefaut: 'In fine', actifLiable: immobilier };
    case 'Prêt pour acquisition de SCPI':
      return { ...base, actifLiable: (n) => n === 'Parts de SCPI' };
    case 'Crédit in fine (adossé à assurance-vie ou autres actifs)':
      return { ...base, modeImpose: 'In fine', garantieParDefaut: 'Nantissement' };
    case 'Crédit Lombard (prêt gagé sur portefeuille-titres)':
      return { ...base, garantieImposee: 'Nantissement' };
    case 'Crédit renouvelable / revolving':
      return { ...base, sansTableau: true, sansActifNiGarantie: true, actifLiable: () => false };
    case 'Crédit à la consommation':
      return { ...base, garantiesProposees: ['Caution', 'Aucune'] };
    case 'Crédit affecté (auto, travaux, etc.)':
      return { ...base, garantiesProposees: ['Caution', 'Aucune'], actifLiable: (n) => immobilier(n) || getAssetCategory(n) === 'actifs corporels' };
    default:
      return base;
  }
};
