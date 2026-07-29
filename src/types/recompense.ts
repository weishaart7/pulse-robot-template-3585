// Récompense (art. 1468-1478 C. civ.) : dette entre une masse propre et la
// masse commune, à la liquidation d'un régime communautaire ou de la société
// d'acquêts (separation_societe_acquets). Cf. src/lib/patrimoine/qualification.ts
// pour la notion de masse commune sous-jacente.

export type SensRecompense = 'communaute_vers_epoux' | 'epoux_vers_communaute';
// 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
export type EpouxConcerne = 'user' | 'spouse';
export type NatureDepense = 'acquisition' | 'conservation' | 'amelioration' | 'autre';
export type ModeEvaluationConventionnel = 'nominal' | 'profit_subsistant' | 'plafonne';

export interface Recompense {
  id: string;
  user_id?: string;
  sens: SensRecompense;
  epoux: EpouxConcerne;
  bien_concerne_id?: string | null;
  depense_faite: number;
  valeur_bien_acquisition?: number | null;
  valeur_bien_liquidation?: number | null;
  nature_depense: NatureDepense;
  /** Dépense nécessaire (art. 1469 al. 2), indépendant du caractère qualifiant de nature_depense (al. 3) — les deux planchers se cumulent. */
  depense_necessaire: boolean;
  /** Défaut applicatif 'profit_subsistant' (art. 1469 al. 3) si non renseigné. */
  mode_evaluation_conventionnel?: ModeEvaluationConventionnel | null;
  created_at?: string;
  updated_at?: string;
}
