// Participation aux acquêts (art. 1569-1581 C. civ.) : patrimoine originaire
// (au jour du mariage) et patrimoine final (au jour de la dissolution) de
// chaque époux, base du calcul de la créance de participation.

// 'user'/'spouse' : aligné sur assets.detenteur et FamilyGraph, pas 'personne'/'conjoint'.
export type EpouxConcerne = 'user' | 'spouse';

export interface PatrimoineOriginaire {
  id: string;
  user_id?: string;
  epoux: EpouxConcerne;
  nature: string;
  valeur: number;
  bien_professionnel: boolean;
  bien_concerne_id?: string | null;
  signe?: boolean;
  date_signature?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface PatrimoineFinal {
  id: string;
  user_id?: string;
  epoux: EpouxConcerne;
  nature: string;
  valeur: number;
  bien_professionnel: boolean;
  bien_concerne_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
