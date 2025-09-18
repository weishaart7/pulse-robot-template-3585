export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      asset_charges: {
        Row: {
          asset_id: string
          created_at: string
          date_debut: string
          debiteur: string
          denomination: string
          duree_annees: number | null
          duree_fin_date: string | null
          duree_type: string
          id: string
          impact_budget: boolean | null
          montant: number
          periodicite: string
          type_charge: string
          unite: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          date_debut: string
          debiteur: string
          denomination: string
          duree_annees?: number | null
          duree_fin_date?: string | null
          duree_type: string
          id?: string
          impact_budget?: boolean | null
          montant: number
          periodicite: string
          type_charge: string
          unite: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          date_debut?: string
          debiteur?: string
          denomination?: string
          duree_annees?: number | null
          duree_fin_date?: string | null
          duree_type?: string
          id?: string
          impact_budget?: boolean | null
          montant?: number
          periodicite?: string
          type_charge?: string
          unite?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_charges_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          date_acquisition: string | null
          date_estimation: string | null
          denomination: string | null
          detenteur: string | null
          etablissement: string | null
          frais_acquisition: number | null
          id: string
          mode_detention: string | null
          nature: string
          pourcentage_conjoint: number | null
          pourcentage_utilisateur: number | null
          revalorisation_annuelle: number | null
          updated_at: string
          user_id: string
          valeur_acquisition: number | null
          valeur_estimee: number | null
        }
        Insert: {
          created_at?: string
          date_acquisition?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          etablissement?: string | null
          frais_acquisition?: number | null
          id?: string
          mode_detention?: string | null
          nature: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          revalorisation_annuelle?: number | null
          updated_at?: string
          user_id: string
          valeur_acquisition?: number | null
          valeur_estimee?: number | null
        }
        Update: {
          created_at?: string
          date_acquisition?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          etablissement?: string | null
          frais_acquisition?: number | null
          id?: string
          mode_detention?: string | null
          nature?: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          revalorisation_annuelle?: number | null
          updated_at?: string
          user_id?: string
          valeur_acquisition?: number | null
          valeur_estimee?: number | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          commentaire: string | null
          created_at: string
          debiteur: string | null
          id: string
          libelle: string
          montant: number | null
          nature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          debiteur?: string | null
          id?: string
          libelle: string
          montant?: number | null
          nature: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          debiteur?: string | null
          id?: string
          libelle?: string
          montant?: number | null
          nature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emprunts: {
        Row: {
          capital_restant_du: number | null
          created_at: string
          duree_restante: number | null
          id: string
          libelle: string
          mensualite: number | null
          nature: string
          taux_interet: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capital_restant_du?: number | null
          created_at?: string
          duree_restante?: number | null
          id?: string
          libelle: string
          mensualite?: number | null
          nature: string
          taux_interet?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capital_restant_du?: number | null
          created_at?: string
          duree_restante?: number | null
          id?: string
          libelle?: string
          mensualite?: number | null
          nature?: string
          taux_interet?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      family_links: {
        Row: {
          branche_familiale: string | null
          civilite: string | null
          created_at: string | null
          date_deces: string | null
          date_naissance: string | null
          enfant_adopte: string | null
          enfant_de: string | null
          enfant_renoncant: boolean | null
          enfant_renoncant_de: string | null
          est_decede: boolean | null
          exoneration_succession: boolean | null
          handicap: boolean | null
          id: string
          lien_familial: string
          nationalite: string | null
          nom: string
          parent_de: string | null
          prenom: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          branche_familiale?: string | null
          civilite?: string | null
          created_at?: string | null
          date_deces?: string | null
          date_naissance?: string | null
          enfant_adopte?: string | null
          enfant_de?: string | null
          enfant_renoncant?: boolean | null
          enfant_renoncant_de?: string | null
          est_decede?: boolean | null
          exoneration_succession?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial: string
          nationalite?: string | null
          nom: string
          parent_de?: string | null
          prenom?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          branche_familiale?: string | null
          civilite?: string | null
          created_at?: string | null
          date_deces?: string | null
          date_naissance?: string | null
          enfant_adopte?: string | null
          enfant_de?: string | null
          enfant_renoncant?: boolean | null
          enfant_renoncant_de?: string | null
          est_decede?: boolean | null
          exoneration_succession?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial?: string
          nationalite?: string | null
          nom?: string
          parent_de?: string | null
          prenom?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_profiles: {
        Row: {
          adresse_postale: string | null
          capacite_juridique: string | null
          civility: string | null
          code_postal: string | null
          commune_naissance: string | null
          created_at: string | null
          date_naissance: string | null
          email: string | null
          id: string
          nationalite: string | null
          nom: string | null
          pays: string | null
          pays_naissance: string | null
          personne_handicapee: boolean | null
          prenom: string | null
          profession: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse_postale?: string | null
          capacite_juridique?: string | null
          civility?: string | null
          code_postal?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          pays?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse_postale?: string | null
          capacite_juridique?: string | null
          civility?: string | null
          code_postal?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          pays?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      ifi_biens_detenus_indirectement: {
        Row: {
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          bien_en_indivision: boolean | null
          categorie: string
          created_at: string
          denomination_societe: string | null
          designation: string
          id: string
          nature_droits_detenus: string | null
          pourcentage_capital: number | null
          pourcentage_indivision: number | null
          siren: string | null
          updated_at: string
          user_id: string
          valeur_bien: number | null
          valeur_venale_parts: number | null
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          categorie: string
          created_at?: string
          denomination_societe?: string | null
          designation: string
          id?: string
          nature_droits_detenus?: string | null
          pourcentage_capital?: number | null
          pourcentage_indivision?: number | null
          siren?: string | null
          updated_at?: string
          user_id: string
          valeur_bien?: number | null
          valeur_venale_parts?: number | null
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          categorie?: string
          created_at?: string
          denomination_societe?: string | null
          designation?: string
          id?: string
          nature_droits_detenus?: string | null
          pourcentage_capital?: number | null
          pourcentage_indivision?: number | null
          siren?: string | null
          updated_at?: string
          user_id?: string
          valeur_bien?: number | null
          valeur_venale_parts?: number | null
        }
        Relationships: []
      }
      ifi_biens_professionnels_exoneres: {
        Row: {
          activite_entreprise: string | null
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          created_at: string
          denomination_societe: string | null
          designation: string
          detenteur_groupe_familial: boolean | null
          detenteur_redevable: boolean | null
          detention_directe: boolean | null
          detention_societe_interposee: boolean | null
          exercice_entreprise_individuelle: boolean | null
          exercice_gerant_commandite: boolean | null
          exercice_gerant_majoritaire_sarl: boolean | null
          exercice_societe_personne: boolean | null
          exoneration_activite_principale: boolean | null
          exoneration_fonction_droits: boolean | null
          fonction_exercee: string | null
          id: string
          pourcentage_capital_detenu: number | null
          pourcentage_detention: number | null
          siren: string | null
          updated_at: string
          user_id: string
          valeur: number | null
        }
        Insert: {
          activite_entreprise?: string | null
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          created_at?: string
          denomination_societe?: string | null
          designation: string
          detenteur_groupe_familial?: boolean | null
          detenteur_redevable?: boolean | null
          detention_directe?: boolean | null
          detention_societe_interposee?: boolean | null
          exercice_entreprise_individuelle?: boolean | null
          exercice_gerant_commandite?: boolean | null
          exercice_gerant_majoritaire_sarl?: boolean | null
          exercice_societe_personne?: boolean | null
          exoneration_activite_principale?: boolean | null
          exoneration_fonction_droits?: boolean | null
          fonction_exercee?: string | null
          id?: string
          pourcentage_capital_detenu?: number | null
          pourcentage_detention?: number | null
          siren?: string | null
          updated_at?: string
          user_id: string
          valeur?: number | null
        }
        Update: {
          activite_entreprise?: string | null
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          created_at?: string
          denomination_societe?: string | null
          designation?: string
          detenteur_groupe_familial?: boolean | null
          detenteur_redevable?: boolean | null
          detention_directe?: boolean | null
          detention_societe_interposee?: boolean | null
          exercice_entreprise_individuelle?: boolean | null
          exercice_gerant_commandite?: boolean | null
          exercice_gerant_majoritaire_sarl?: boolean | null
          exercice_societe_personne?: boolean | null
          exoneration_activite_principale?: boolean | null
          exoneration_fonction_droits?: boolean | null
          fonction_exercee?: string | null
          id?: string
          pourcentage_capital_detenu?: number | null
          pourcentage_detention?: number | null
          siren?: string | null
          updated_at?: string
          user_id?: string
          valeur?: number | null
        }
        Relationships: []
      }
      ifi_hors_france: {
        Row: {
          convention_fiscale: boolean | null
          created_at: string
          designation: string
          id: string
          impot_acquitte_etranger: number | null
          pays: string
          type_bien: string
          updated_at: string
          user_id: string
          valeur: number | null
        }
        Insert: {
          convention_fiscale?: boolean | null
          created_at?: string
          designation: string
          id?: string
          impot_acquitte_etranger?: number | null
          pays: string
          type_bien: string
          updated_at?: string
          user_id: string
          valeur?: number | null
        }
        Update: {
          convention_fiscale?: boolean | null
          created_at?: string
          designation?: string
          id?: string
          impot_acquitte_etranger?: number | null
          pays?: string
          type_bien?: string
          updated_at?: string
          user_id?: string
          valeur?: number | null
        }
        Relationships: []
      }
      ifi_hypotheses: {
        Row: {
          actif: boolean | null
          created_at: string
          description: string | null
          id: string
          pourcentage: number | null
          type_hypothese: string
          updated_at: string
          user_id: string
          valeur: number | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          pourcentage?: number | null
          type_hypothese: string
          updated_at?: string
          user_id: string
          valeur?: number | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          pourcentage?: number | null
          type_hypothese?: string
          updated_at?: string
          user_id?: string
          valeur?: number | null
        }
        Relationships: []
      }
      ifi_immeubles_batis: {
        Row: {
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          bien_en_indivision: boolean | null
          bien_mixte: boolean | null
          categorie: string
          created_at: string
          date_acquisition: string | null
          date_bail: string | null
          designation: string
          duree_bail: string | null
          fraction_taxable: number | null
          id: string
          nature_droits_detenus: string | null
          pourcentage_indivision: number | null
          prix_acquisition: number | null
          superficie_terrain: number | null
          updated_at: string
          user_id: string
          valeur_totale: number | null
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          bien_mixte?: boolean | null
          categorie: string
          created_at?: string
          date_acquisition?: string | null
          date_bail?: string | null
          designation: string
          duree_bail?: string | null
          fraction_taxable?: number | null
          id?: string
          nature_droits_detenus?: string | null
          pourcentage_indivision?: number | null
          prix_acquisition?: number | null
          superficie_terrain?: number | null
          updated_at?: string
          user_id: string
          valeur_totale?: number | null
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          bien_mixte?: boolean | null
          categorie?: string
          created_at?: string
          date_acquisition?: string | null
          date_bail?: string | null
          designation?: string
          duree_bail?: string | null
          fraction_taxable?: number | null
          id?: string
          nature_droits_detenus?: string | null
          pourcentage_indivision?: number | null
          prix_acquisition?: number | null
          superficie_terrain?: number | null
          updated_at?: string
          user_id?: string
          valeur_totale?: number | null
        }
        Relationships: []
      }
      ifi_immeubles_non_batis: {
        Row: {
          adresse_code_postal: string | null
          adresse_pays: string | null
          adresse_rue: string | null
          adresse_ville: string | null
          bien_en_indivision: boolean | null
          bien_mixte: boolean | null
          categorie: string
          created_at: string
          date_acquisition: string | null
          date_bail: string | null
          designation: string
          duree_bail: string | null
          fraction_taxable: number | null
          id: string
          nature: string | null
          nature_droits_detenus: string | null
          pourcentage_indivision: number | null
          prix_acquisition: number | null
          superficie_terrain: number | null
          updated_at: string
          user_id: string
          valeur_totale: number | null
        }
        Insert: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          bien_mixte?: boolean | null
          categorie: string
          created_at?: string
          date_acquisition?: string | null
          date_bail?: string | null
          designation: string
          duree_bail?: string | null
          fraction_taxable?: number | null
          id?: string
          nature?: string | null
          nature_droits_detenus?: string | null
          pourcentage_indivision?: number | null
          prix_acquisition?: number | null
          superficie_terrain?: number | null
          updated_at?: string
          user_id: string
          valeur_totale?: number | null
        }
        Update: {
          adresse_code_postal?: string | null
          adresse_pays?: string | null
          adresse_rue?: string | null
          adresse_ville?: string | null
          bien_en_indivision?: boolean | null
          bien_mixte?: boolean | null
          categorie?: string
          created_at?: string
          date_acquisition?: string | null
          date_bail?: string | null
          designation?: string
          duree_bail?: string | null
          fraction_taxable?: number | null
          id?: string
          nature?: string | null
          nature_droits_detenus?: string | null
          pourcentage_indivision?: number | null
          prix_acquisition?: number | null
          superficie_terrain?: number | null
          updated_at?: string
          user_id?: string
          valeur_totale?: number | null
        }
        Relationships: []
      }
      ifi_passifs_deductions: {
        Row: {
          bien_concerne: string | null
          commentaire: string | null
          created_at: string
          date_creation: string | null
          designation: string
          echeance: string | null
          id: string
          montant: number | null
          taux_interet: number | null
          type_passif: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bien_concerne?: string | null
          commentaire?: string | null
          created_at?: string
          date_creation?: string | null
          designation: string
          echeance?: string | null
          id?: string
          montant?: number | null
          taux_interet?: number | null
          type_passif: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bien_concerne?: string | null
          commentaire?: string | null
          created_at?: string
          date_creation?: string | null
          designation?: string
          echeance?: string | null
          id?: string
          montant?: number | null
          taux_interet?: number | null
          type_passif?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      liberalites: {
        Row: {
          beneficiaire: string
          created_at: string
          date_acte: string | null
          denomination: string
          description: string | null
          id: string
          montant: number | null
          notaire: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaire: string
          created_at?: string
          date_acte?: string | null
          denomination: string
          description?: string | null
          id?: string
          montant?: number | null
          notaire?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiaire?: string
          created_at?: string
          date_acte?: string | null
          denomination?: string
          description?: string | null
          id?: string
          montant?: number | null
          notaire?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      marital_status: {
        Row: {
          adresse_notaire: string | null
          civilite_conjoint: string | null
          contrat_mariage: string | null
          convention_pacs: string | null
          created_at: string | null
          date_mariage: string | null
          date_naissance_conjoint: string | null
          date_pacs: string | null
          id: string
          lieu_mariage: string | null
          lieu_naissance_conjoint: string | null
          lieu_pacs: string | null
          mariage_precedent_conjoint: boolean | null
          mariage_precedent_personne: boolean | null
          nationalite_conjoint: string | null
          nom_conjoint: string | null
          nom_notaire: string | null
          nombre_enfants_charges: number | null
          parent_isole: boolean | null
          personne_handicapee_conjoint: boolean | null
          prenom_conjoint: string | null
          profession_conjoint: string | null
          profession_csp_conjoint: string | null
          regime_matrimonial: string | null
          statut_couple: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adresse_notaire?: string | null
          civilite_conjoint?: string | null
          contrat_mariage?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          parent_isole?: boolean | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          statut_couple?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adresse_notaire?: string | null
          civilite_conjoint?: string | null
          contrat_mariage?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          parent_isole?: boolean | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          statut_couple?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      passifs: {
        Row: {
          created_at: string
          id: string
          montant_du: number
          nature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          montant_du: number
          nature: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          montant_du?: number
          nature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      Profils: {
        Row: {
          created_at: string
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          user_id?: string | null
        }
        Relationships: []
      }
      revenus: {
        Row: {
          beneficiaire: string | null
          commentaire: string | null
          created_at: string
          id: string
          libelle: string
          montant: number | null
          nature: string
          revenu_disponible: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaire?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          libelle: string
          montant?: number | null
          nature: string
          revenu_disponible?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiaire?: string | null
          commentaire?: string | null
          created_at?: string
          id?: string
          libelle?: string
          montant?: number | null
          nature?: string
          revenu_disponible?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      societes: {
        Row: {
          activite: string | null
          capital_social: number | null
          code_postal: string | null
          commune: string | null
          created_at: string
          date_creation: string | null
          denomination: string
          forme_societe_civile: string | null
          holding: string | null
          id: string
          jour_cloture: string | null
          mois_cloture: string | null
          nombre_salaries: number | null
          nombre_titres: number | null
          pays: string | null
          pourcentage_ifi: number | null
          regime_fiscal: string | null
          rue_adresse: string | null
          siret: string | null
          type_activite: string | null
          type_societe: string
          updated_at: string
          user_id: string
          valeur_estimee: number | null
          valeur_ifi: number | null
        }
        Insert: {
          activite?: string | null
          capital_social?: number | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_creation?: string | null
          denomination: string
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          pays?: string | null
          pourcentage_ifi?: number | null
          regime_fiscal?: string | null
          rue_adresse?: string | null
          siret?: string | null
          type_activite?: string | null
          type_societe: string
          updated_at?: string
          user_id: string
          valeur_estimee?: number | null
          valeur_ifi?: number | null
        }
        Update: {
          activite?: string | null
          capital_social?: number | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_creation?: string | null
          denomination?: string
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          pays?: string | null
          pourcentage_ifi?: number | null
          regime_fiscal?: string | null
          rue_adresse?: string | null
          siret?: string | null
          type_activite?: string | null
          type_societe?: string
          updated_at?: string
          user_id?: string
          valeur_estimee?: number | null
          valeur_ifi?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
