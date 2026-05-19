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
      agenda_events: {
        Row: {
          created_at: string
          datetime: string
          event_date: string
          event_time: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          datetime: string
          event_date: string
          event_time: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          datetime?: string
          event_date?: string
          event_time?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      asset_indivisaires: {
        Row: {
          asset_id: string
          created_at: string
          family_link_id: string | null
          id: string
          nom_libre: string | null
          pourcentage: number
          type_indivisaire: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          family_link_id?: string | null
          id?: string
          nom_libre?: string | null
          pourcentage?: number
          type_indivisaire?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          family_link_id?: string | null
          id?: string
          nom_libre?: string | null
          pourcentage?: number
          type_indivisaire?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_indivisaires_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_indivisaires_family_link_id_fkey"
            columns: ["family_link_id"]
            isOneToOne: false
            referencedRelation: "family_links"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_revenus: {
        Row: {
          asset_id: string
          commentaire: string | null
          created_at: string
          date_debut: string
          date_fin: string | null
          id: string
          impact_budget: boolean | null
          montant: number
          nature: string
          periodicite: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          commentaire?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          id?: string
          impact_budget?: boolean | null
          montant: number
          nature: string
          periodicite: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          commentaire?: string | null
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          id?: string
          impact_budget?: boolean | null
          montant?: number
          nature?: string
          periodicite?: string
          updated_at?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          attachement_emotionnel: number | null
          bien_etranger: boolean | null
          created_at: string
          date_acquisition: string | null
          date_estimation: string | null
          denomination: string | null
          detenteur: string | null
          etablissement: string | null
          financement_actif: boolean | null
          financement_apport: number | null
          financement_duree_mois: number | null
          financement_taux_assurance: number | null
          financement_taux_credit: number | null
          frais_acquisition: number | null
          frais_agence: number | null
          frais_bancaires: number | null
          frais_hypotheque: number | null
          frais_notaire: number | null
          id: string
          meubles: number | null
          mode_detention: string | null
          montant_immeuble: number | null
          nature: string
          origine_actif: string[] | null
          pourcentage_conjoint: number | null
          pourcentage_terrain_force: number | null
          pourcentage_utilisateur: number | null
          qualification_auto: boolean | null
          qualification_bien: string | null
          regime_location: string | null
          revalorisation_annuelle: number | null
          situation_particuliere: string[] | null
          societe_id: string | null
          statut_bien: string | null
          surface_m2: number | null
          transfert_immobilier: boolean | null
          transfert_societe: boolean | null
          travaux_construction: number | null
          travaux_renovation: number | null
          type_location: string | null
          type_location_lmnp: string | null
          typologie_bien: string | null
          updated_at: string
          user_id: string
          valeur_acquisition: number | null
          valeur_estimee: number | null
          zone_bien: string | null
        }
        Insert: {
          attachement_emotionnel?: number | null
          bien_etranger?: boolean | null
          created_at?: string
          date_acquisition?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          etablissement?: string | null
          financement_actif?: boolean | null
          financement_apport?: number | null
          financement_duree_mois?: number | null
          financement_taux_assurance?: number | null
          financement_taux_credit?: number | null
          frais_acquisition?: number | null
          frais_agence?: number | null
          frais_bancaires?: number | null
          frais_hypotheque?: number | null
          frais_notaire?: number | null
          id?: string
          meubles?: number | null
          mode_detention?: string | null
          montant_immeuble?: number | null
          nature: string
          origine_actif?: string[] | null
          pourcentage_conjoint?: number | null
          pourcentage_terrain_force?: number | null
          pourcentage_utilisateur?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          regime_location?: string | null
          revalorisation_annuelle?: number | null
          situation_particuliere?: string[] | null
          societe_id?: string | null
          statut_bien?: string | null
          surface_m2?: number | null
          transfert_immobilier?: boolean | null
          transfert_societe?: boolean | null
          travaux_construction?: number | null
          travaux_renovation?: number | null
          type_location?: string | null
          type_location_lmnp?: string | null
          typologie_bien?: string | null
          updated_at?: string
          user_id: string
          valeur_acquisition?: number | null
          valeur_estimee?: number | null
          zone_bien?: string | null
        }
        Update: {
          attachement_emotionnel?: number | null
          bien_etranger?: boolean | null
          created_at?: string
          date_acquisition?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          etablissement?: string | null
          financement_actif?: boolean | null
          financement_apport?: number | null
          financement_duree_mois?: number | null
          financement_taux_assurance?: number | null
          financement_taux_credit?: number | null
          frais_acquisition?: number | null
          frais_agence?: number | null
          frais_bancaires?: number | null
          frais_hypotheque?: number | null
          frais_notaire?: number | null
          id?: string
          meubles?: number | null
          mode_detention?: string | null
          montant_immeuble?: number | null
          nature?: string
          origine_actif?: string[] | null
          pourcentage_conjoint?: number | null
          pourcentage_terrain_force?: number | null
          pourcentage_utilisateur?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          regime_location?: string | null
          revalorisation_annuelle?: number | null
          situation_particuliere?: string[] | null
          societe_id?: string | null
          statut_bien?: string | null
          surface_m2?: number | null
          transfert_immobilier?: boolean | null
          transfert_societe?: boolean | null
          travaux_construction?: number | null
          travaux_renovation?: number | null
          type_location?: string | null
          type_location_lmnp?: string | null
          typologie_bien?: string | null
          updated_at?: string
          user_id?: string
          valeur_acquisition?: number | null
          valeur_estimee?: number | null
          zone_bien?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
      }
      av_contract_details: {
        Row: {
          asset_id: string
          clause_beneficiaire: string | null
          clause_beneficiaire_structuree: Json | null
          created_at: string
          frais_arbitrage: number | null
          frais_gestion_euros: number | null
          frais_gestion_uc: number | null
          frais_versement: number | null
          id: string
          objectif: string | null
          part_fonds_euros: number | null
          part_unites_compte: number | null
          rachats_programmes: boolean | null
          rachats_programmes_montant: number | null
          rachats_programmes_periodicite: string | null
          updated_at: string
          user_id: string
          versements_programmes: boolean | null
          versements_programmes_montant: number | null
          versements_programmes_periodicite: string | null
        }
        Insert: {
          asset_id: string
          clause_beneficiaire?: string | null
          clause_beneficiaire_structuree?: Json | null
          created_at?: string
          frais_arbitrage?: number | null
          frais_gestion_euros?: number | null
          frais_gestion_uc?: number | null
          frais_versement?: number | null
          id?: string
          objectif?: string | null
          part_fonds_euros?: number | null
          part_unites_compte?: number | null
          rachats_programmes?: boolean | null
          rachats_programmes_montant?: number | null
          rachats_programmes_periodicite?: string | null
          updated_at?: string
          user_id: string
          versements_programmes?: boolean | null
          versements_programmes_montant?: number | null
          versements_programmes_periodicite?: string | null
        }
        Update: {
          asset_id?: string
          clause_beneficiaire?: string | null
          clause_beneficiaire_structuree?: Json | null
          created_at?: string
          frais_arbitrage?: number | null
          frais_gestion_euros?: number | null
          frais_gestion_uc?: number | null
          frais_versement?: number | null
          id?: string
          objectif?: string | null
          part_fonds_euros?: number | null
          part_unites_compte?: number | null
          rachats_programmes?: boolean | null
          rachats_programmes_montant?: number | null
          rachats_programmes_periodicite?: string | null
          updated_at?: string
          user_id?: string
          versements_programmes?: boolean | null
          versements_programmes_montant?: number | null
          versements_programmes_periodicite?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "av_contract_details_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: true
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      av_operations: {
        Row: {
          asset_id: string
          commentaire: string | null
          created_at: string
          date_operation: string
          id: string
          montant: number
          type_operation: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          commentaire?: string | null
          created_at?: string
          date_operation: string
          id?: string
          montant: number
          type_operation: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          commentaire?: string | null
          created_at?: string
          date_operation?: string
          id?: string
          montant?: number
          type_operation?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "av_operations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_articles: {
        Row: {
          author_id: string | null
          category: string | null
          content: string
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          published: boolean | null
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          published?: boolean | null
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      charges: {
        Row: {
          commentaire: string | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          debiteur: string | null
          id: string
          jour_fixe: number | null
          libelle: string
          montant: number | null
          nature: string
          periodicite: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          debiteur?: string | null
          id?: string
          jour_fixe?: number | null
          libelle: string
          montant?: number | null
          nature: string
          periodicite?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          debiteur?: string | null
          id?: string
          jour_fixe?: number | null
          libelle?: string
          montant?: number | null
          nature?: string
          periodicite?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emprunts: {
        Row: {
          capital_restant_du: number | null
          created_at: string
          detenteur: string | null
          duree_restante: number | null
          id: string
          libelle: string
          mensualite: number | null
          nature: string
          pourcentage_conjoint: number | null
          pourcentage_utilisateur: number | null
          reporter_budget: boolean | null
          societe_id: string | null
          taux_interet: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capital_restant_du?: number | null
          created_at?: string
          detenteur?: string | null
          duree_restante?: number | null
          id?: string
          libelle: string
          mensualite?: number | null
          nature: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          reporter_budget?: boolean | null
          societe_id?: string | null
          taux_interet?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capital_restant_du?: number | null
          created_at?: string
          detenteur?: string | null
          duree_restante?: number | null
          id?: string
          libelle?: string
          mensualite?: number | null
          nature?: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          reporter_budget?: boolean | null
          societe_id?: string | null
          taux_interet?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emprunts_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
          nom_jeune_fille: string | null
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
          nom_jeune_fille?: string | null
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
          nom_jeune_fille?: string | null
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
          adresse_conjoint: string | null
          adresse_notaire: string | null
          civilite_conjoint: string | null
          clauses_contrat: Json | null
          code_postal_conjoint: string | null
          contrat_mariage: string | null
          convention_pacs: string | null
          created_at: string | null
          date_donation_conjoint: string | null
          date_donation_personne: string | null
          date_mariage: string | null
          date_naissance_conjoint: string | null
          date_pacs: string | null
          donation_dernier_vivant_conjoint: boolean | null
          donation_dernier_vivant_personne: boolean | null
          duree_mariage_precedent_conjoint_annees: number | null
          duree_mariage_precedent_conjoint_mois: number | null
          duree_mariage_precedent_personne_annees: number | null
          duree_mariage_precedent_personne_mois: number | null
          email_conjoint: string | null
          id: string
          imposition_distincte: boolean | null
          lieu_mariage: string | null
          lieu_naissance_conjoint: string | null
          lieu_pacs: string | null
          mariage_precedent_conjoint: boolean | null
          mariage_precedent_personne: boolean | null
          nationalite_conjoint: string | null
          nom_conjoint: string | null
          nom_jeune_fille_conjoint: string | null
          nom_notaire: string | null
          nombre_enfants_charges: number | null
          option_conjoint: string | null
          parent_isole: boolean | null
          pays_conjoint: string | null
          pays_naissance_conjoint: string | null
          personne_handicapee_conjoint: boolean | null
          prenom_conjoint: string | null
          profession_conjoint: string | null
          profession_csp_conjoint: string | null
          regime_matrimonial: string | null
          statut_couple: string | null
          telephone_conjoint: string | null
          updated_at: string | null
          user_id: string
          ville_conjoint: string | null
        }
        Insert: {
          adresse_conjoint?: string | null
          adresse_notaire?: string | null
          civilite_conjoint?: string | null
          clauses_contrat?: Json | null
          code_postal_conjoint?: string | null
          contrat_mariage?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_donation_conjoint?: string | null
          date_donation_personne?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          donation_dernier_vivant_conjoint?: boolean | null
          donation_dernier_vivant_personne?: boolean | null
          duree_mariage_precedent_conjoint_annees?: number | null
          duree_mariage_precedent_conjoint_mois?: number | null
          duree_mariage_precedent_personne_annees?: number | null
          duree_mariage_precedent_personne_mois?: number | null
          email_conjoint?: string | null
          id?: string
          imposition_distincte?: boolean | null
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_jeune_fille_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          option_conjoint?: string | null
          parent_isole?: boolean | null
          pays_conjoint?: string | null
          pays_naissance_conjoint?: string | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          statut_couple?: string | null
          telephone_conjoint?: string | null
          updated_at?: string | null
          user_id: string
          ville_conjoint?: string | null
        }
        Update: {
          adresse_conjoint?: string | null
          adresse_notaire?: string | null
          civilite_conjoint?: string | null
          clauses_contrat?: Json | null
          code_postal_conjoint?: string | null
          contrat_mariage?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_donation_conjoint?: string | null
          date_donation_personne?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          donation_dernier_vivant_conjoint?: boolean | null
          donation_dernier_vivant_personne?: boolean | null
          duree_mariage_precedent_conjoint_annees?: number | null
          duree_mariage_precedent_conjoint_mois?: number | null
          duree_mariage_precedent_personne_annees?: number | null
          duree_mariage_precedent_personne_mois?: number | null
          email_conjoint?: string | null
          id?: string
          imposition_distincte?: boolean | null
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_jeune_fille_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          option_conjoint?: string | null
          parent_isole?: boolean | null
          pays_conjoint?: string | null
          pays_naissance_conjoint?: string | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          statut_couple?: string | null
          telephone_conjoint?: string | null
          updated_at?: string | null
          user_id?: string
          ville_conjoint?: string | null
        }
        Relationships: []
      }
      passifs: {
        Row: {
          created_at: string
          detenteur: string | null
          id: string
          montant_du: number
          nature: string
          pourcentage_conjoint: number | null
          pourcentage_utilisateur: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detenteur?: string | null
          id?: string
          montant_du: number
          nature: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detenteur?: string | null
          id?: string
          montant_du?: number
          nature?: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
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
      retraite_data: {
        Row: {
          autres_epargnes: number | null
          created_at: string
          epargne_assurance_vie: number | null
          epargne_per: number | null
          id: string
          salaire_annuel_moyen: number | null
          trimestres_requis: number | null
          trimestres_valides: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          autres_epargnes?: number | null
          created_at?: string
          epargne_assurance_vie?: number | null
          epargne_per?: number | null
          id?: string
          salaire_annuel_moyen?: number | null
          trimestres_requis?: number | null
          trimestres_valides?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          autres_epargnes?: number | null
          created_at?: string
          epargne_assurance_vie?: number | null
          epargne_per?: number | null
          id?: string
          salaire_annuel_moyen?: number | null
          trimestres_requis?: number | null
          trimestres_valides?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenus: {
        Row: {
          beneficiaire: string | null
          commentaire: string | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          id: string
          jour_fixe: number | null
          libelle: string
          montant: number | null
          nature: string
          periodicite: string | null
          revenu_disponible: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaire?: string | null
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          jour_fixe?: number | null
          libelle: string
          montant?: number | null
          nature: string
          periodicite?: string | null
          revenu_disponible?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiaire?: string | null
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          jour_fixe?: number | null
          libelle?: string
          montant?: number | null
          nature?: string
          periodicite?: string | null
          revenu_disponible?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          resource: string | null
          severity: string | null
          success: boolean
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource?: string | null
          severity?: string | null
          success: boolean
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          resource?: string | null
          severity?: string | null
          success?: boolean
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      societe_associes: {
        Row: {
          created_at: string
          detention_directe: boolean
          family_link_id: string | null
          id: string
          nature_detention: string
          nom_libre: string | null
          nombre_titres: number | null
          pourcentage: number | null
          societe_associee_id: string | null
          societe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detention_directe?: boolean
          family_link_id?: string | null
          id?: string
          nature_detention?: string
          nom_libre?: string | null
          nombre_titres?: number | null
          pourcentage?: number | null
          societe_associee_id?: string | null
          societe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detention_directe?: boolean
          family_link_id?: string | null
          id?: string
          nature_detention?: string
          nom_libre?: string | null
          nombre_titres?: number | null
          pourcentage?: number | null
          societe_associee_id?: string | null
          societe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      societe_bilans: {
        Row: {
          capitaux_propres: number | null
          chiffre_affaires: number | null
          commentaire: string | null
          created_at: string
          date_cloture: string | null
          dettes_financieres: number | null
          exercice_annee: number
          id: string
          resultat_net: number | null
          societe_id: string
          tresorerie: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          capitaux_propres?: number | null
          chiffre_affaires?: number | null
          commentaire?: string | null
          created_at?: string
          date_cloture?: string | null
          dettes_financieres?: number | null
          exercice_annee: number
          id?: string
          resultat_net?: number | null
          societe_id: string
          tresorerie?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          capitaux_propres?: number | null
          chiffre_affaires?: number | null
          commentaire?: string | null
          created_at?: string
          date_cloture?: string | null
          dettes_financieres?: number | null
          exercice_annee?: number
          id?: string
          resultat_net?: number | null
          societe_id?: string
          tresorerie?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      societe_comptes_courants: {
        Row: {
          associe_id: string | null
          associe_libelle: string | null
          commentaire: string | null
          created_at: string
          date_remboursement: string | null
          id: string
          societe_id: string
          solde: number
          taux: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          associe_id?: string | null
          associe_libelle?: string | null
          commentaire?: string | null
          created_at?: string
          date_remboursement?: string | null
          id?: string
          societe_id: string
          solde?: number
          taux?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          associe_id?: string | null
          associe_libelle?: string | null
          commentaire?: string | null
          created_at?: string
          date_remboursement?: string | null
          id?: string
          societe_id?: string
          solde?: number
          taux?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      societe_dividendes: {
        Row: {
          beneficiaire: string | null
          created_at: string
          date_distribution: string | null
          exercice_annee: number
          id: string
          montant_brut: number
          montant_net: number | null
          societe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaire?: string | null
          created_at?: string
          date_distribution?: string | null
          exercice_annee: number
          id?: string
          montant_brut: number
          montant_net?: number | null
          societe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiaire?: string | null
          created_at?: string
          date_distribution?: string | null
          exercice_annee?: number
          id?: string
          montant_brut?: number
          montant_net?: number | null
          societe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "societe_dividendes_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
      }
      societe_dutreil: {
        Row: {
          commentaire: string | null
          created_at: string
          dirigeant_family_link_id: string | null
          eligibilite_validee: boolean | null
          engagement_collectif_date: string | null
          engagement_individuel_date: string | null
          fonction_direction: string | null
          id: string
          societe_id: string
          updated_at: string
          user_id: string
          valeur_parts_transmises: number | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          dirigeant_family_link_id?: string | null
          eligibilite_validee?: boolean | null
          engagement_collectif_date?: string | null
          engagement_individuel_date?: string | null
          fonction_direction?: string | null
          id?: string
          societe_id: string
          updated_at?: string
          user_id: string
          valeur_parts_transmises?: number | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          dirigeant_family_link_id?: string | null
          eligibilite_validee?: boolean | null
          engagement_collectif_date?: string | null
          engagement_individuel_date?: string | null
          fonction_direction?: string | null
          id?: string
          societe_id?: string
          updated_at?: string
          user_id?: string
          valeur_parts_transmises?: number | null
        }
        Relationships: []
      }
      societe_pactes: {
        Row: {
          clause_agrement: boolean | null
          clause_drag_along: boolean | null
          clause_preemption: boolean | null
          clause_sortie_conjointe: boolean | null
          commentaire: string | null
          created_at: string
          date_signature: string | null
          duree_annees: number | null
          existe: boolean
          id: string
          societe_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clause_agrement?: boolean | null
          clause_drag_along?: boolean | null
          clause_preemption?: boolean | null
          clause_sortie_conjointe?: boolean | null
          commentaire?: string | null
          created_at?: string
          date_signature?: string | null
          duree_annees?: number | null
          existe?: boolean
          id?: string
          societe_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clause_agrement?: boolean | null
          clause_drag_along?: boolean | null
          clause_preemption?: boolean | null
          clause_sortie_conjointe?: boolean | null
          commentaire?: string | null
          created_at?: string
          date_signature?: string | null
          duree_annees?: number | null
          existe?: boolean
          id?: string
          societe_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      societe_valorisations: {
        Row: {
          commentaire: string | null
          created_at: string
          date_valorisation: string
          id: string
          methode_valorisation: string | null
          societe_id: string
          updated_at: string
          user_id: string
          valeur: number
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_valorisation: string
          id?: string
          methode_valorisation?: string | null
          societe_id: string
          updated_at?: string
          user_id: string
          valeur: number
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_valorisation?: string
          id?: string
          methode_valorisation?: string | null
          societe_id?: string
          updated_at?: string
          user_id?: string
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "societe_valorisations_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
      }
      societes: {
        Row: {
          activite: string | null
          capital_social: number | null
          chiffre_affaires: number | null
          code_postal: string | null
          commune: string | null
          compte_courant_associes: number | null
          created_at: string
          date_creation: string | null
          date_dernier_bilan: string | null
          denomination: string
          forme_societe_civile: string | null
          holding: string | null
          id: string
          jour_cloture: string | null
          mois_cloture: string | null
          nombre_salaries: number | null
          nombre_titres: number | null
          pays: string | null
          pourcentage_conjoint: number | null
          pourcentage_ifi: number | null
          pourcentage_utilisateur: number | null
          regime_fiscal: string | null
          reserves: number | null
          resultat_net: number | null
          rue_adresse: string | null
          siret: string | null
          tresorerie_disponible: number | null
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
          chiffre_affaires?: number | null
          code_postal?: string | null
          commune?: string | null
          compte_courant_associes?: number | null
          created_at?: string
          date_creation?: string | null
          date_dernier_bilan?: string | null
          denomination: string
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          pays?: string | null
          pourcentage_conjoint?: number | null
          pourcentage_ifi?: number | null
          pourcentage_utilisateur?: number | null
          regime_fiscal?: string | null
          reserves?: number | null
          resultat_net?: number | null
          rue_adresse?: string | null
          siret?: string | null
          tresorerie_disponible?: number | null
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
          chiffre_affaires?: number | null
          code_postal?: string | null
          commune?: string | null
          compte_courant_associes?: number | null
          created_at?: string
          date_creation?: string | null
          date_dernier_bilan?: string | null
          denomination?: string
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          pays?: string | null
          pourcentage_conjoint?: number | null
          pourcentage_ifi?: number | null
          pourcentage_utilisateur?: number | null
          regime_fiscal?: string | null
          reserves?: number | null
          resultat_net?: number | null
          rue_adresse?: string | null
          siret?: string | null
          tresorerie_disponible?: number | null
          type_activite?: string | null
          type_societe?: string
          updated_at?: string
          user_id?: string
          valeur_estimee?: number | null
          valeur_ifi?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: never; Returns: boolean }
      log_security_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource?: string
          p_severity?: string
          p_success?: boolean
          p_user_id?: string
        }
        Returns: undefined
      }
      validate_email: { Args: { email: string }; Returns: boolean }
      validate_financial_amount: { Args: { amount: number }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
