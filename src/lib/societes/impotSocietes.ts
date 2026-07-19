// Barème IS 2024 : 15% jusqu'à 42 500 €, 25% au-delà (taux réduit PME).
// Référence : formule progressive de SocieteFinancesImpactFiscal.tsx (isEstimate),
// jusqu'ici dupliquée de façon incohérente ailleurs dans le module Sociétés
// (taux plat selon seuil dans un cas, 25% sans seuil dans un autre).
const SEUIL_TAUX_REDUIT = 42500;
const TAUX_REDUIT = 0.15;
const TAUX_NORMAL = 0.25;

export function computeImpotSocietes(resultat: number): number {
  if (resultat <= 0) return 0;
  if (resultat <= SEUIL_TAUX_REDUIT) return resultat * TAUX_REDUIT;
  return SEUIL_TAUX_REDUIT * TAUX_REDUIT + (resultat - SEUIL_TAUX_REDUIT) * TAUX_NORMAL;
}
