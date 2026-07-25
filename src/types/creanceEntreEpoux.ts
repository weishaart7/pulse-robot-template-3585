// Créance entre époux (art. 1479, 1543 C. civ.) : mouvement de valeur entre
// deux patrimoines propres, seul mécanisme correcteur en régime séparatiste
// (séparation de biens, participation aux acquêts), applicable aussi dans
// les régimes communautaires pour les mouvements hors communauté.

// 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
export type EpouxConcerne = 'user' | 'spouse';
export type NatureDepense = 'acquisition' | 'conservation' | 'amelioration' | 'autre';
export type ModeEvaluationConventionnel = 'nominal' | 'profit_subsistant';

export interface CreanceEntreEpoux {
  id: string;
  user_id?: string;
  epoux_creancier: EpouxConcerne;
  epoux_debiteur: EpouxConcerne;
  bien_concerne_id?: string | null;
  depense_faite: number;
  valeur_bien_avant?: number | null;
  valeur_bien_apres?: number | null;
  nature_depense: NatureDepense;
  /** Défaut applicatif 'profit_subsistant' (art. 1479 al. 2, renvoi art. 1469 al. 3) si non renseigné — même défaut que Recompense, pas 'nominal'. */
  mode_evaluation_conventionnel?: ModeEvaluationConventionnel | null;
  created_at?: string;
  updated_at?: string;
}
