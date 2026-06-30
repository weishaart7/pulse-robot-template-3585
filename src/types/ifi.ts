export interface IFIImmeubleBati {
  id?: string;
  user_id?: string;
  categorie: string;
  designation: string;
  date_acquisition?: string;
  prix_acquisition?: number;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  adresse_pays?: string;
  superficie_terrain?: number;
  date_bail?: string;
  duree_bail?: string;
  bien_mixte?: boolean;
  fraction_taxable?: number;
  bien_en_indivision?: boolean;
  pourcentage_indivision?: number;
  nature_droits_detenus?: string;
  valeur_totale?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IFIImmeableNonBati {
  id?: string;
  user_id?: string;
  categorie: string;
  designation: string;
  nature?: string;
  date_acquisition?: string;
  prix_acquisition?: number;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  adresse_pays?: string;
  superficie_terrain?: number;
  date_bail?: string;
  duree_bail?: string;
  bien_mixte?: boolean;
  fraction_taxable?: number;
  bien_en_indivision?: boolean;
  pourcentage_indivision?: number;
  nature_droits_detenus?: string;
  valeur_totale?: number;
  abattement_bois_forets?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IFIBienDetenuIndirectement {
  id?: string;
  user_id?: string;
  categorie: string;
  designation: string;
  denomination_societe?: string;
  siren?: string;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  adresse_pays?: string;
  pourcentage_capital?: number;
  bien_en_indivision?: boolean;
  pourcentage_indivision?: number;
  nature_droits_detenus?: string;
  valeur_venale_parts?: number;
  valeur_bien?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IFIBienProfessionnelExonere {
  id?: string;
  user_id?: string;
  designation: string;
  valeur?: number;
  exoneration_activite_principale?: boolean;
  exoneration_fonction_droits?: boolean;
  denomination_societe?: string;
  siren?: string;
  adresse_rue?: string;
  adresse_code_postal?: string;
  adresse_ville?: string;
  adresse_pays?: string;
  activite_entreprise?: string;
  exercice_entreprise_individuelle?: boolean;
  exercice_societe_personne?: boolean;
  exercice_gerant_majoritaire_sarl?: boolean;
  exercice_gerant_commandite?: boolean;
  fonction_exercee?: string;
  pourcentage_capital_detenu?: number;
  detention_directe?: boolean;
  detention_societe_interposee?: boolean;
  detenteur_redevable?: boolean;
  detenteur_groupe_familial?: boolean;
  pourcentage_detention?: number;
  created_at?: string;
  updated_at?: string;
}

export interface IFIPassifDeduction {
  id?: string;
  user_id?: string;
  type_passif: string;
  designation: string;
  montant?: number;
  bien_concerne?: string;
  date_creation?: string;
  echeance?: string;
  taux_interet?: number;
  commentaire?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IFIHorsFrance {
  id?: string;
  user_id?: string;
  pays: string;
  type_bien: string;
  designation: string;
  valeur?: number;
  impot_acquitte_etranger?: number;
  convention_fiscale?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IFIHypothese {
  id?: string;
  user_id?: string;
  type_hypothese: string;
  description?: string;
  valeur?: number;
  pourcentage?: number;
  actif?: boolean;
  created_at?: string;
  updated_at?: string;
}