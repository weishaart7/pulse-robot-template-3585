// Règles de report d'un emprunt Patrimoine (`reporter_budget = true`) dans les charges du Budget
// (cf. docs/budget.md) :
// - un prêt de société (`societe_id`) n'est pas une charge du foyer : exclu, comme dans PatrimoineChart ;
// - la mensualité est ramenée à la part du foyer via getRepartitionFoyer (même règle que Patrimoine) ;
//   un emprunt non qualifié est exclu plutôt que compté à 100 % ;
// - `duree_restante` (en mois) n'a pas de date de référence en base : la fin est estimée à partir de la
//   dernière modification de l'emprunt (`updated_at`), seule date disponible.
import { getRepartitionFoyer, BienNonQualifieError, SuccessionAssetInput } from '@/lib/patrimoine/succession';

export interface EmpruntBudgetInput extends SuccessionAssetInput {
  societe_id?: string | null;
  mensualite?: number | null;
  duree_restante?: number | null;
  updated_at?: string | null;
}

// Part (0 à 1) de la mensualité supportée par le foyer, ou null si l'emprunt est exclu du budget.
export const partFoyerEmprunt = (emprunt: EmpruntBudgetInput): number | null => {
  if (emprunt.societe_id) return null;
  try {
    const { user, spouse } = getRepartitionFoyer(emprunt);
    const part = user + spouse;
    return part > 0 ? part : null;
  } catch (error) {
    if (error instanceof BienNonQualifieError) return null;
    throw error;
  }
};

const formatLocalDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Date de fin estimée ('YYYY-MM-DD') : dernière échéance supposée N mois après le mois de la dernière
// modification (dernier jour de ce mois). undefined si la durée ou la date de référence manque.
export const estimateEmpruntFin = (updatedAt?: string | null, dureeRestante?: number | null): string | undefined => {
  if (!updatedAt || !dureeRestante || dureeRestante <= 0) return undefined;
  const ref = new Date(updatedAt);
  if (isNaN(ref.getTime())) return undefined;
  return formatLocalDate(new Date(ref.getFullYear(), ref.getMonth() + Math.round(dureeRestante) + 1, 0));
};
