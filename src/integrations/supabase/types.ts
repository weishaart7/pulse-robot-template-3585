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
      asset_demembrements: {
        Row: {
          asset_id: string
          created_at: string
          date_naissance_tiers: string | null
          family_link_id: string | null
          id: string
          nom_libre: string | null
          role: string
          type_partie: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          date_naissance_tiers?: string | null
          family_link_id?: string | null
          id?: string
          nom_libre?: string | null
          role: string
          type_partie?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          date_naissance_tiers?: string | null
          family_link_id?: string | null
          id?: string
          nom_libre?: string | null
          role?: string
          type_partie?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_demembrements_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_demembrements_family_link_id_fkey"
            columns: ["family_link_id"]
            isOneToOne: false
            referencedRelation: "family_links"
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
        Relationships: [
          {
            foreignKeyName: "asset_revenus_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_valorisations: {
        Row: {
          asset_id: string
          created_at: string
          date_valorisation: string
          id: string
          user_id: string
          valeur: number
        }
        Insert: {
          asset_id: string
          created_at?: string
          date_valorisation: string
          id?: string
          user_id: string
          valeur: number
        }
        Update: {
          asset_id?: string
          created_at?: string
          date_valorisation?: string
          id?: string
          user_id?: string
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_valorisations_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          abondement_employeur: number | null
          attachement_emotionnel: number | null
          beneficiaire_designe: string | null
          bien_etranger: boolean | null
          capital_garanti: number | null
          certificat_expertise: boolean | null
          certificat_expertise_reference: string | null
          clause_entree_communaute: boolean | null
          clause_remploi: boolean | null
          created_at: string
          cto_multi_actifs: boolean | null
          cto_nature_sous_jacent: string | null
          date_acquisition: string | null
          date_attribution: string | null
          date_disponibilite: string | null
          date_echeance: string | null
          date_estimation: string | null
          denomination: string | null
          detenteur: string | null
          duree_blocage: string | null
          est_propre_par_nature: boolean | null
          etablissement: string | null
          financement_actif: boolean | null
          financement_apport: number | null
          financement_duree_mois: number | null
          financement_mixte_apport_propre: number | null
          financement_taux_assurance: number | null
          financement_taux_credit: number | null
          frais_acquisition: number | null
          frais_agence: number | null
          frais_bancaires: number | null
          frais_hypotheque: number | null
          frais_notaire: number | null
          id: string
          licitation_acquereur: string | null
          lieu_stockage: string | null
          meubles: number | null
          mode_detention: string | null
          mode_sortie: string | null
          montant_appele: number | null
          montant_engage: number | null
          montant_immeuble: number | null
          motif_deblocage_anticipe: string | null
          nature: string
          numero_serie: string | null
          origine_actif: string[] | null
          part_licitation_personnelle: number | null
          plafond_verse: number | null
          pourcentage_conjoint: number | null
          pourcentage_terrain_force: number | null
          pourcentage_utilisateur: number | null
          prix_exercice: number | null
          qualification_auto: boolean | null
          qualification_bien: string | null
          quantite: string | null
          quantite_millesime: string | null
          reduction_ir_entree: number | null
          regime_fiscal_parts: string | null
          regime_location: string | null
          revenus_distribues_12m: number | null
          situation_particuliere: string[] | null
          societe_id: string | null
          sous_jacent: string | null
          sous_type_per: string | null
          statut_bien: string | null
          support_investissement: string | null
          surface_m2: number | null
          taux_remuneration: number | null
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
          abondement_employeur?: number | null
          attachement_emotionnel?: number | null
          beneficiaire_designe?: string | null
          bien_etranger?: boolean | null
          capital_garanti?: number | null
          certificat_expertise?: boolean | null
          certificat_expertise_reference?: string | null
          clause_entree_communaute?: boolean | null
          clause_remploi?: boolean | null
          created_at?: string
          cto_multi_actifs?: boolean | null
          cto_nature_sous_jacent?: string | null
          date_acquisition?: string | null
          date_attribution?: string | null
          date_disponibilite?: string | null
          date_echeance?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          duree_blocage?: string | null
          est_propre_par_nature?: boolean | null
          etablissement?: string | null
          financement_actif?: boolean | null
          financement_apport?: number | null
          financement_duree_mois?: number | null
          financement_mixte_apport_propre?: number | null
          financement_taux_assurance?: number | null
          financement_taux_credit?: number | null
          frais_acquisition?: number | null
          frais_agence?: number | null
          frais_bancaires?: number | null
          frais_hypotheque?: number | null
          frais_notaire?: number | null
          id?: string
          licitation_acquereur?: string | null
          lieu_stockage?: string | null
          meubles?: number | null
          mode_detention?: string | null
          mode_sortie?: string | null
          montant_appele?: number | null
          montant_engage?: number | null
          montant_immeuble?: number | null
          motif_deblocage_anticipe?: string | null
          nature: string
          numero_serie?: string | null
          origine_actif?: string[] | null
          part_licitation_personnelle?: number | null
          plafond_verse?: number | null
          pourcentage_conjoint?: number | null
          pourcentage_terrain_force?: number | null
          pourcentage_utilisateur?: number | null
          prix_exercice?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          quantite?: string | null
          quantite_millesime?: string | null
          reduction_ir_entree?: number | null
          regime_fiscal_parts?: string | null
          regime_location?: string | null
          revenus_distribues_12m?: number | null
          situation_particuliere?: string[] | null
          societe_id?: string | null
          sous_jacent?: string | null
          sous_type_per?: string | null
          statut_bien?: string | null
          support_investissement?: string | null
          surface_m2?: number | null
          taux_remuneration?: number | null
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
          abondement_employeur?: number | null
          attachement_emotionnel?: number | null
          beneficiaire_designe?: string | null
          bien_etranger?: boolean | null
          capital_garanti?: number | null
          certificat_expertise?: boolean | null
          certificat_expertise_reference?: string | null
          clause_entree_communaute?: boolean | null
          clause_remploi?: boolean | null
          created_at?: string
          cto_multi_actifs?: boolean | null
          cto_nature_sous_jacent?: string | null
          date_acquisition?: string | null
          date_attribution?: string | null
          date_disponibilite?: string | null
          date_echeance?: string | null
          date_estimation?: string | null
          denomination?: string | null
          detenteur?: string | null
          duree_blocage?: string | null
          est_propre_par_nature?: boolean | null
          etablissement?: string | null
          financement_actif?: boolean | null
          financement_apport?: number | null
          financement_duree_mois?: number | null
          financement_mixte_apport_propre?: number | null
          financement_taux_assurance?: number | null
          financement_taux_credit?: number | null
          frais_acquisition?: number | null
          frais_agence?: number | null
          frais_bancaires?: number | null
          frais_hypotheque?: number | null
          frais_notaire?: number | null
          id?: string
          licitation_acquereur?: string | null
          lieu_stockage?: string | null
          meubles?: number | null
          mode_detention?: string | null
          mode_sortie?: string | null
          montant_appele?: number | null
          montant_engage?: number | null
          montant_immeuble?: number | null
          motif_deblocage_anticipe?: string | null
          nature?: string
          numero_serie?: string | null
          origine_actif?: string[] | null
          part_licitation_personnelle?: number | null
          plafond_verse?: number | null
          pourcentage_conjoint?: number | null
          pourcentage_terrain_force?: number | null
          pourcentage_utilisateur?: number | null
          prix_exercice?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          quantite?: string | null
          quantite_millesime?: string | null
          reduction_ir_entree?: number | null
          regime_fiscal_parts?: string | null
          regime_location?: string | null
          revenus_distribues_12m?: number | null
          situation_particuliere?: string[] | null
          societe_id?: string | null
          sous_jacent?: string | null
          sous_type_per?: string | null
          statut_bien?: string | null
          support_investissement?: string | null
          surface_m2?: number | null
          taux_remuneration?: number | null
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
          origine_fonds: string
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
          origine_fonds?: string
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
          origine_fonds?: string
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
      creances_entre_epoux: {
        Row: {
          bien_concerne_id: string | null
          created_at: string
          depense_faite: number
          epoux_creancier: string
          epoux_debiteur: string
          id: string
          mode_evaluation_conventionnel: string | null
          nature_depense: string
          updated_at: string
          user_id: string
          valeur_bien_apres: number | null
          valeur_bien_avant: number | null
        }
        Insert: {
          bien_concerne_id?: string | null
          created_at?: string
          depense_faite: number
          epoux_creancier: string
          epoux_debiteur: string
          id?: string
          mode_evaluation_conventionnel?: string | null
          nature_depense: string
          updated_at?: string
          user_id: string
          valeur_bien_apres?: number | null
          valeur_bien_avant?: number | null
        }
        Update: {
          bien_concerne_id?: string | null
          created_at?: string
          depense_faite?: number
          epoux_creancier?: string
          epoux_debiteur?: string
          id?: string
          mode_evaluation_conventionnel?: string | null
          nature_depense?: string
          updated_at?: string
          user_id?: string
          valeur_bien_apres?: number | null
          valeur_bien_avant?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creances_entre_epoux_bien_concerne_id_fkey"
            columns: ["bien_concerne_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      emprunts: {
        Row: {
          asset_id: string | null
          assure: boolean | null
          capital_garanti_deces: number | null
          capital_restant_du: number | null
          contributeur_remboursement: string | null
          created_at: string
          detenteur: string | null
          duree_restante: number | null
          id: string
          libelle: string
          mensualite: number | null
          nature: string
          pourcentage_conjoint: number | null
          pourcentage_utilisateur: number | null
          qualification_auto: boolean | null
          qualification_bien: string | null
          quotite_assuree_conjoint: number | null
          quotite_assuree_utilisateur: number | null
          reporter_budget: boolean | null
          societe_id: string | null
          taux_interet: number | null
          type_garantie: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          assure?: boolean | null
          capital_garanti_deces?: number | null
          capital_restant_du?: number | null
          contributeur_remboursement?: string | null
          created_at?: string
          detenteur?: string | null
          duree_restante?: number | null
          id?: string
          libelle: string
          mensualite?: number | null
          nature: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          quotite_assuree_conjoint?: number | null
          quotite_assuree_utilisateur?: number | null
          reporter_budget?: boolean | null
          societe_id?: string | null
          taux_interet?: number | null
          type_garantie?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string | null
          assure?: boolean | null
          capital_garanti_deces?: number | null
          capital_restant_du?: number | null
          contributeur_remboursement?: string | null
          created_at?: string
          detenteur?: string | null
          duree_restante?: number | null
          id?: string
          libelle?: string
          mensualite?: number | null
          nature?: string
          pourcentage_conjoint?: number | null
          pourcentage_utilisateur?: number | null
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          quotite_assuree_conjoint?: number | null
          quotite_assuree_utilisateur?: number | null
          reporter_budget?: boolean | null
          societe_id?: string | null
          taux_interet?: number | null
          type_garantie?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emprunts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
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
          adoption_simple_abattement_plein: boolean
          adoption_simple_motif: string | null
          branche_familiale: string | null
          civilite: string | null
          created_at: string | null
          date_deces: string | null
          date_mandat_protection_future: string | null
          date_naissance: string | null
          enfant_a_charge: boolean | null
          enfant_adopte: string | null
          enfant_de: string | null
          enfant_renoncant: boolean | null
          enfant_renoncant_de: string | null
          est_decede: boolean | null
          est_dirigeant: boolean | null
          exoneration_succession: boolean | null
          fiscalement_a_charge: boolean | null
          handicap: boolean | null
          id: string
          lien_familial: string
          mandat_protection_future: boolean
          mesure_protection_juridique: string
          nationalite: string | null
          nationalite_2: string | null
          nom: string
          parent_de: string | null
          personne_a_charge: boolean
          prenom: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adoption_simple_abattement_plein?: boolean
          adoption_simple_motif?: string | null
          branche_familiale?: string | null
          civilite?: string | null
          created_at?: string | null
          date_deces?: string | null
          date_mandat_protection_future?: string | null
          date_naissance?: string | null
          enfant_a_charge?: boolean | null
          enfant_adopte?: string | null
          enfant_de?: string | null
          enfant_renoncant?: boolean | null
          enfant_renoncant_de?: string | null
          est_decede?: boolean | null
          est_dirigeant?: boolean | null
          exoneration_succession?: boolean | null
          fiscalement_a_charge?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial: string
          mandat_protection_future?: boolean
          mesure_protection_juridique?: string
          nationalite?: string | null
          nationalite_2?: string | null
          nom: string
          parent_de?: string | null
          personne_a_charge?: boolean
          prenom?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adoption_simple_abattement_plein?: boolean
          adoption_simple_motif?: string | null
          branche_familiale?: string | null
          civilite?: string | null
          created_at?: string | null
          date_deces?: string | null
          date_mandat_protection_future?: string | null
          date_naissance?: string | null
          enfant_a_charge?: boolean | null
          enfant_adopte?: string | null
          enfant_de?: string | null
          enfant_renoncant?: boolean | null
          enfant_renoncant_de?: string | null
          est_decede?: boolean | null
          est_dirigeant?: boolean | null
          exoneration_succession?: boolean | null
          fiscalement_a_charge?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial?: string
          mandat_protection_future?: boolean
          mesure_protection_juridique?: string
          nationalite?: string | null
          nationalite_2?: string | null
          nom?: string
          parent_de?: string | null
          personne_a_charge?: boolean
          prenom?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_profiles: {
        Row: {
          adresse_postale: string | null
          ancien_combattant: boolean | null
          capacite_juridique: string | null
          civility: string | null
          code_postal: string | null
          commune_naissance: string | null
          created_at: string | null
          date_mandat_protection_future: string | null
          date_naissance: string | null
          email: string | null
          est_dirigeant: boolean | null
          id: string
          mandat_protection_future: boolean
          nationalite: string | null
          nationalite_2: string | null
          nom: string | null
          nom_jeune_fille: string | null
          pays: string | null
          pays_naissance: string | null
          personne_handicapee: boolean | null
          prenom: string | null
          profession: string | null
          residence_fiscale_etranger: boolean | null
          telephone: string | null
          updated_at: string | null
          user_id: string
          ville: string | null
        }
        Insert: {
          adresse_postale?: string | null
          ancien_combattant?: boolean | null
          capacite_juridique?: string | null
          civility?: string | null
          code_postal?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_mandat_protection_future?: string | null
          date_naissance?: string | null
          email?: string | null
          est_dirigeant?: boolean | null
          id?: string
          mandat_protection_future?: boolean
          nationalite?: string | null
          nationalite_2?: string | null
          nom?: string | null
          nom_jeune_fille?: string | null
          pays?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          residence_fiscale_etranger?: boolean | null
          telephone?: string | null
          updated_at?: string | null
          user_id: string
          ville?: string | null
        }
        Update: {
          adresse_postale?: string | null
          ancien_combattant?: boolean | null
          capacite_juridique?: string | null
          civility?: string | null
          code_postal?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_mandat_protection_future?: string | null
          date_naissance?: string | null
          email?: string | null
          est_dirigeant?: boolean | null
          id?: string
          mandat_protection_future?: boolean
          nationalite?: string | null
          nationalite_2?: string | null
          nom?: string | null
          nom_jeune_fille?: string | null
          pays?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          residence_fiscale_etranger?: boolean | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string
          ville?: string | null
        }
        Relationships: []
      }
      foyer_fiscal: {
        Row: {
          ancien_combattant_declarant1: boolean
          ancien_combattant_declarant2: boolean
          ancien_parent_isole: boolean
          created_at: string
          enfants_charge: Json
          enfants_majeurs_rattaches: number
          id: string
          invalidite_declarant1: boolean
          invalidite_declarant2: boolean
          lieu_residence: string
          parent_isole: boolean
          personnes_invalides_charge: Json
          situation_famille: string
          updated_at: string
          user_id: string
          veuf_ancien_combattant: boolean
          veuve_de_guerre: boolean
        }
        Insert: {
          ancien_combattant_declarant1?: boolean
          ancien_combattant_declarant2?: boolean
          ancien_parent_isole?: boolean
          created_at?: string
          enfants_charge?: Json
          enfants_majeurs_rattaches?: number
          id?: string
          invalidite_declarant1?: boolean
          invalidite_declarant2?: boolean
          lieu_residence: string
          parent_isole?: boolean
          personnes_invalides_charge?: Json
          situation_famille: string
          updated_at?: string
          user_id: string
          veuf_ancien_combattant?: boolean
          veuve_de_guerre?: boolean
        }
        Update: {
          ancien_combattant_declarant1?: boolean
          ancien_combattant_declarant2?: boolean
          ancien_parent_isole?: boolean
          created_at?: string
          enfants_charge?: Json
          enfants_majeurs_rattaches?: number
          id?: string
          invalidite_declarant1?: boolean
          invalidite_declarant2?: boolean
          lieu_residence?: string
          parent_isole?: boolean
          personnes_invalides_charge?: Json
          situation_famille?: string
          updated_at?: string
          user_id?: string
          veuf_ancien_combattant?: boolean
          veuve_de_guerre?: boolean
        }
        Relationships: []
      }
      gains_actionnariat_salarie: {
        Row: {
          case_1nx: number | null
          case_1ny: number | null
          case_1ox: number | null
          case_1oy: number | null
          case_1tp: number | null
          case_1tt: number | null
          case_1tz: number | null
          case_1up: number | null
          case_1ut: number | null
          case_1uz: number | null
          case_1vz: number | null
          case_1wz: number | null
          case_3vd: number | null
          case_3vf: number | null
          case_3vi: number | null
          case_3vj: number | null
          case_3vk: number | null
          case_3vn: number | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_1nx?: number | null
          case_1ny?: number | null
          case_1ox?: number | null
          case_1oy?: number | null
          case_1tp?: number | null
          case_1tt?: number | null
          case_1tz?: number | null
          case_1up?: number | null
          case_1ut?: number | null
          case_1uz?: number | null
          case_1vz?: number | null
          case_1wz?: number | null
          case_3vd?: number | null
          case_3vf?: number | null
          case_3vi?: number | null
          case_3vj?: number | null
          case_3vk?: number | null
          case_3vn?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_1nx?: number | null
          case_1ny?: number | null
          case_1ox?: number | null
          case_1oy?: number | null
          case_1tp?: number | null
          case_1tt?: number | null
          case_1tz?: number | null
          case_1up?: number | null
          case_1ut?: number | null
          case_1uz?: number | null
          case_1vz?: number | null
          case_1wz?: number | null
          case_3vd?: number | null
          case_3vf?: number | null
          case_3vi?: number | null
          case_3vj?: number | null
          case_3vk?: number | null
          case_3vn?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
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
          abattement_bois_forets: boolean | null
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
          abattement_bois_forets?: boolean | null
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
          abattement_bois_forets?: boolean | null
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
          beneficiaire_id: string | null
          beneficiaire_nom: string
          biens: Json | null
          clauses: string[] | null
          created_at: string
          date_acte: string | null
          demembrement: string | null
          denomination: string
          description: string | null
          generation_intermediaire_id: string | null
          groupe_id: string | null
          id: string
          montant: number | null
          montant_rapport_forfaitaire: number | null
          nature: string | null
          pourcentage: number | null
          prise_en_charge_droits: boolean | null
          realise_par: string | null
          statut: string
          testament_realise: string | null
          type: string
          type_imputation: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          beneficiaire_id?: string | null
          beneficiaire_nom: string
          biens?: Json | null
          clauses?: string[] | null
          created_at?: string
          date_acte?: string | null
          demembrement?: string | null
          denomination: string
          description?: string | null
          generation_intermediaire_id?: string | null
          groupe_id?: string | null
          id?: string
          montant?: number | null
          montant_rapport_forfaitaire?: number | null
          nature?: string | null
          pourcentage?: number | null
          prise_en_charge_droits?: boolean | null
          realise_par?: string | null
          statut?: string
          testament_realise?: string | null
          type: string
          type_imputation?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          beneficiaire_id?: string | null
          beneficiaire_nom?: string
          biens?: Json | null
          clauses?: string[] | null
          created_at?: string
          date_acte?: string | null
          demembrement?: string | null
          denomination?: string
          description?: string | null
          generation_intermediaire_id?: string | null
          groupe_id?: string | null
          id?: string
          montant?: number | null
          montant_rapport_forfaitaire?: number | null
          nature?: string | null
          pourcentage?: number | null
          prise_en_charge_droits?: boolean | null
          realise_par?: string | null
          statut?: string
          testament_realise?: string | null
          type?: string
          type_imputation?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "liberalites_beneficiaire_id_fkey"
            columns: ["beneficiaire_id"]
            isOneToOne: false
            referencedRelation: "family_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liberalites_generation_intermediaire_id_fkey"
            columns: ["generation_intermediaire_id"]
            isOneToOne: false
            referencedRelation: "family_links"
            referencedColumns: ["id"]
          },
        ]
      }
      marital_status: {
        Row: {
          adresse_conjoint: string | null
          ancien_combattant_conjoint: boolean | null
          capacite_juridique_conjoint: string
          civilite_conjoint: string | null
          clauses_contrat: Json | null
          clauses_personnalisees: Json
          code_postal_conjoint: string | null
          convention_pacs: string | null
          created_at: string | null
          date_donation_conjoint: string | null
          date_donation_personne: string | null
          date_mandat_protection_future_conjoint: string | null
          date_mariage: string | null
          date_naissance_conjoint: string | null
          date_pacs: string | null
          donation_dernier_vivant_conjoint: boolean | null
          donation_dernier_vivant_personne: boolean | null
          duh_opte: boolean
          duree_mariage_precedent_conjoint_annees: number | null
          duree_mariage_precedent_conjoint_mois: number | null
          duree_mariage_precedent_personne_annees: number | null
          duree_mariage_precedent_personne_mois: number | null
          email_conjoint: string | null
          est_dirigeant_conjoint: boolean | null
          id: string
          imposition_distincte: boolean | null
          lieu_mariage: string | null
          lieu_naissance_conjoint: string | null
          lieu_pacs: string | null
          loi_applicable_regime: string | null
          mandat_protection_future_conjoint: boolean
          mariage_precedent_conjoint: boolean | null
          mariage_precedent_personne: boolean | null
          nationalite_2_conjoint: string | null
          nationalite_conjoint: string | null
          nom_conjoint: string | null
          nom_jeune_fille_conjoint: string | null
          nombre_enfants_charges: number | null
          option_conjoint: string | null
          parent_isole: boolean | null
          partage_envisage: boolean
          pas_de_contrat_mariage: boolean
          pays_conjoint: string | null
          pays_naissance_conjoint: string | null
          pays_premier_domicile_matrimonial: string | null
          personne_handicapee_conjoint: boolean | null
          prenom_conjoint: string | null
          profession_conjoint: string | null
          profession_csp_conjoint: string | null
          regime_matrimonial: string | null
          residence_fiscale_etranger_conjoint: boolean | null
          residence_separee: boolean
          separation_corps_clause_renonciation: boolean
          separation_de_corps: boolean
          statut_couple: string | null
          telephone_conjoint: string | null
          updated_at: string | null
          user_id: string
          ville_conjoint: string | null
        }
        Insert: {
          adresse_conjoint?: string | null
          ancien_combattant_conjoint?: boolean | null
          capacite_juridique_conjoint?: string
          civilite_conjoint?: string | null
          clauses_contrat?: Json | null
          clauses_personnalisees?: Json
          code_postal_conjoint?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_donation_conjoint?: string | null
          date_donation_personne?: string | null
          date_mandat_protection_future_conjoint?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          donation_dernier_vivant_conjoint?: boolean | null
          donation_dernier_vivant_personne?: boolean | null
          duh_opte?: boolean
          duree_mariage_precedent_conjoint_annees?: number | null
          duree_mariage_precedent_conjoint_mois?: number | null
          duree_mariage_precedent_personne_annees?: number | null
          duree_mariage_precedent_personne_mois?: number | null
          email_conjoint?: string | null
          est_dirigeant_conjoint?: boolean | null
          id?: string
          imposition_distincte?: boolean | null
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          loi_applicable_regime?: string | null
          mandat_protection_future_conjoint?: boolean
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_2_conjoint?: string | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_jeune_fille_conjoint?: string | null
          nombre_enfants_charges?: number | null
          option_conjoint?: string | null
          parent_isole?: boolean | null
          partage_envisage?: boolean
          pas_de_contrat_mariage?: boolean
          pays_conjoint?: string | null
          pays_naissance_conjoint?: string | null
          pays_premier_domicile_matrimonial?: string | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          residence_fiscale_etranger_conjoint?: boolean | null
          residence_separee?: boolean
          separation_corps_clause_renonciation?: boolean
          separation_de_corps?: boolean
          statut_couple?: string | null
          telephone_conjoint?: string | null
          updated_at?: string | null
          user_id: string
          ville_conjoint?: string | null
        }
        Update: {
          adresse_conjoint?: string | null
          ancien_combattant_conjoint?: boolean | null
          capacite_juridique_conjoint?: string
          civilite_conjoint?: string | null
          clauses_contrat?: Json | null
          clauses_personnalisees?: Json
          code_postal_conjoint?: string | null
          convention_pacs?: string | null
          created_at?: string | null
          date_donation_conjoint?: string | null
          date_donation_personne?: string | null
          date_mandat_protection_future_conjoint?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          donation_dernier_vivant_conjoint?: boolean | null
          donation_dernier_vivant_personne?: boolean | null
          duh_opte?: boolean
          duree_mariage_precedent_conjoint_annees?: number | null
          duree_mariage_precedent_conjoint_mois?: number | null
          duree_mariage_precedent_personne_annees?: number | null
          duree_mariage_precedent_personne_mois?: number | null
          email_conjoint?: string | null
          est_dirigeant_conjoint?: boolean | null
          id?: string
          imposition_distincte?: boolean | null
          lieu_mariage?: string | null
          lieu_naissance_conjoint?: string | null
          lieu_pacs?: string | null
          loi_applicable_regime?: string | null
          mandat_protection_future_conjoint?: boolean
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_2_conjoint?: string | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_jeune_fille_conjoint?: string | null
          nombre_enfants_charges?: number | null
          option_conjoint?: string | null
          parent_isole?: boolean | null
          partage_envisage?: boolean
          pas_de_contrat_mariage?: boolean
          pays_conjoint?: string | null
          pays_naissance_conjoint?: string | null
          pays_premier_domicile_matrimonial?: string | null
          personne_handicapee_conjoint?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          profession_csp_conjoint?: string | null
          regime_matrimonial?: string | null
          residence_fiscale_etranger_conjoint?: boolean | null
          residence_separee?: boolean
          separation_corps_clause_renonciation?: boolean
          separation_de_corps?: boolean
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
          qualification_auto: boolean | null
          qualification_bien: string | null
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
          qualification_auto?: boolean | null
          qualification_bien?: string | null
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
          qualification_auto?: boolean | null
          qualification_bien?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      patrimoine_final: {
        Row: {
          bien_concerne_id: string | null
          bien_professionnel: boolean
          created_at: string
          epoux: string
          id: string
          nature: string
          updated_at: string
          user_id: string
          valeur: number
        }
        Insert: {
          bien_concerne_id?: string | null
          bien_professionnel?: boolean
          created_at?: string
          epoux: string
          id?: string
          nature: string
          updated_at?: string
          user_id: string
          valeur: number
        }
        Update: {
          bien_concerne_id?: string | null
          bien_professionnel?: boolean
          created_at?: string
          epoux?: string
          id?: string
          nature?: string
          updated_at?: string
          user_id?: string
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "patrimoine_final_bien_concerne_id_fkey"
            columns: ["bien_concerne_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimoine_originaire: {
        Row: {
          bien_concerne_id: string | null
          bien_professionnel: boolean
          created_at: string
          date_signature: string | null
          epoux: string
          id: string
          nature: string
          signe: boolean | null
          updated_at: string
          user_id: string
          valeur: number
        }
        Insert: {
          bien_concerne_id?: string | null
          bien_professionnel?: boolean
          created_at?: string
          date_signature?: string | null
          epoux: string
          id?: string
          nature: string
          signe?: boolean | null
          updated_at?: string
          user_id: string
          valeur: number
        }
        Update: {
          bien_concerne_id?: string | null
          bien_professionnel?: boolean
          created_at?: string
          date_signature?: string | null
          epoux?: string
          id?: string
          nature?: string
          signe?: boolean | null
          updated_at?: string
          user_id?: string
          valeur?: number
        }
        Relationships: [
          {
            foreignKeyName: "patrimoine_originaire_bien_concerne_id_fkey"
            columns: ["bien_concerne_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      pensions_retraites_rentes: {
        Row: {
          case_1ai: number | null
          case_1al: number | null
          case_1am: number | null
          case_1ao: number | null
          case_1as: number | null
          case_1at: number | null
          case_1az: number | null
          case_1bi: number | null
          case_1bl: number | null
          case_1bm: number | null
          case_1bo: number | null
          case_1bs: number | null
          case_1bt: number | null
          case_1bz: number | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_1ai?: number | null
          case_1al?: number | null
          case_1am?: number | null
          case_1ao?: number | null
          case_1as?: number | null
          case_1at?: number | null
          case_1az?: number | null
          case_1bi?: number | null
          case_1bl?: number | null
          case_1bm?: number | null
          case_1bo?: number | null
          case_1bs?: number | null
          case_1bt?: number | null
          case_1bz?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_1ai?: number | null
          case_1al?: number | null
          case_1am?: number | null
          case_1ao?: number | null
          case_1as?: number | null
          case_1at?: number | null
          case_1az?: number | null
          case_1bi?: number | null
          case_1bl?: number | null
          case_1bm?: number | null
          case_1bo?: number | null
          case_1bs?: number | null
          case_1bt?: number | null
          case_1bz?: number | null
          created_at?: string
          id?: string
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
      recompenses: {
        Row: {
          bien_concerne_id: string | null
          created_at: string
          depense_faite: number
          depense_necessaire: boolean
          epoux: string
          id: string
          mode_evaluation_conventionnel: string | null
          nature_depense: string
          sens: string
          updated_at: string
          user_id: string
          valeur_bien_acquisition: number | null
          valeur_bien_liquidation: number | null
        }
        Insert: {
          bien_concerne_id?: string | null
          created_at?: string
          depense_faite: number
          depense_necessaire?: boolean
          epoux: string
          id?: string
          mode_evaluation_conventionnel?: string | null
          nature_depense: string
          sens: string
          updated_at?: string
          user_id: string
          valeur_bien_acquisition?: number | null
          valeur_bien_liquidation?: number | null
        }
        Update: {
          bien_concerne_id?: string | null
          created_at?: string
          depense_faite?: number
          depense_necessaire?: boolean
          epoux?: string
          id?: string
          mode_evaluation_conventionnel?: string | null
          nature_depense?: string
          sens?: string
          updated_at?: string
          user_id?: string
          valeur_bien_acquisition?: number | null
          valeur_bien_liquidation?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recompenses_bien_concerne_id_fkey"
            columns: ["bien_concerne_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      retraite_carriere_detail: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string
          employeur: string | null
          est_chiffre_affaires: boolean
          id: string
          personne: string
          regimes: string[]
          revenu: number | null
          type_activite: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date_debut: string
          date_fin: string
          employeur?: string | null
          est_chiffre_affaires?: boolean
          id?: string
          personne?: string
          regimes?: string[]
          revenu?: number | null
          type_activite: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string
          employeur?: string | null
          est_chiffre_affaires?: boolean
          id?: string
          personne?: string
          regimes?: string[]
          revenu?: number | null
          type_activite?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      retraite_data: {
        Row: {
          age_annulation_decote: number | null
          age_depart_anticipe: number | null
          annee_ouverture_droits: number | null
          au_moins_un_trimestre_majoration_enfant: boolean
          autres_epargnes: number | null
          autres_pensions_mensuelles: number | null
          created_at: string
          depart_anticipe_categorie_active: boolean
          depart_pour_invalidite: boolean
          epargne_assurance_vie: number | null
          epargne_per: number | null
          has_cnavpl: boolean
          has_fonction_publique: boolean
          id: string
          mode_hypothese_revenu_futur: string
          moyenne_annuelle_nbi: number | null
          personne: string
          points_cnavpl: number | null
          points_rafp: number | null
          regime_affiliation_fp: string | null
          regimes_points: Json
          revenu_hypothese_manuel: number | null
          salaire_annuel_moyen: number | null
          traitement_indiciaire_brut: number | null
          trimestres_cnavpl: number | null
          trimestres_cotises_apres_age_legal_cnavpl: number
          trimestres_cotises_apres_age_legal_fp: number
          trimestres_liquidables_fp: number | null
          trimestres_liquidables_nbi: number | null
          trimestres_requis: number | null
          trimestres_valides: number | null
          updated_at: string
          user_id: string
          valeur_point_cnavpl: number | null
        }
        Insert: {
          age_annulation_decote?: number | null
          age_depart_anticipe?: number | null
          annee_ouverture_droits?: number | null
          au_moins_un_trimestre_majoration_enfant?: boolean
          autres_epargnes?: number | null
          autres_pensions_mensuelles?: number | null
          created_at?: string
          depart_anticipe_categorie_active?: boolean
          depart_pour_invalidite?: boolean
          epargne_assurance_vie?: number | null
          epargne_per?: number | null
          has_cnavpl?: boolean
          has_fonction_publique?: boolean
          id?: string
          mode_hypothese_revenu_futur?: string
          moyenne_annuelle_nbi?: number | null
          personne?: string
          points_cnavpl?: number | null
          points_rafp?: number | null
          regime_affiliation_fp?: string | null
          regimes_points?: Json
          revenu_hypothese_manuel?: number | null
          salaire_annuel_moyen?: number | null
          traitement_indiciaire_brut?: number | null
          trimestres_cnavpl?: number | null
          trimestres_cotises_apres_age_legal_cnavpl?: number
          trimestres_cotises_apres_age_legal_fp?: number
          trimestres_liquidables_fp?: number | null
          trimestres_liquidables_nbi?: number | null
          trimestres_requis?: number | null
          trimestres_valides?: number | null
          updated_at?: string
          user_id: string
          valeur_point_cnavpl?: number | null
        }
        Update: {
          age_annulation_decote?: number | null
          age_depart_anticipe?: number | null
          annee_ouverture_droits?: number | null
          au_moins_un_trimestre_majoration_enfant?: boolean
          autres_epargnes?: number | null
          autres_pensions_mensuelles?: number | null
          created_at?: string
          depart_anticipe_categorie_active?: boolean
          depart_pour_invalidite?: boolean
          epargne_assurance_vie?: number | null
          epargne_per?: number | null
          has_cnavpl?: boolean
          has_fonction_publique?: boolean
          id?: string
          mode_hypothese_revenu_futur?: string
          moyenne_annuelle_nbi?: number | null
          personne?: string
          points_cnavpl?: number | null
          points_rafp?: number | null
          regime_affiliation_fp?: string | null
          regimes_points?: Json
          revenu_hypothese_manuel?: number | null
          salaire_annuel_moyen?: number | null
          traitement_indiciaire_brut?: number | null
          trimestres_cnavpl?: number | null
          trimestres_cotises_apres_age_legal_cnavpl?: number
          trimestres_cotises_apres_age_legal_fp?: number
          trimestres_liquidables_fp?: number | null
          trimestres_liquidables_nbi?: number | null
          trimestres_requis?: number | null
          trimestres_valides?: number | null
          updated_at?: string
          user_id?: string
          valeur_point_cnavpl?: number | null
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
      revenus_exoneres_taux_effectif: {
        Row: {
          case_1ac: number | null
          case_1ae: number | null
          case_1ah: number | null
          case_1bc: number | null
          case_1be: number | null
          case_1bh: number | null
          case_1ge: boolean
          case_1he: boolean
          case_rse: string | null
          case_rsf: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_1ac?: number | null
          case_1ae?: number | null
          case_1ah?: number | null
          case_1bc?: number | null
          case_1be?: number | null
          case_1bh?: number | null
          case_1ge?: boolean
          case_1he?: boolean
          case_rse?: string | null
          case_rsf?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_1ac?: number | null
          case_1ae?: number | null
          case_1ah?: number | null
          case_1bc?: number | null
          case_1be?: number | null
          case_1bh?: number | null
          case_1ge?: boolean
          case_1he?: boolean
          case_rse?: string | null
          case_rsf?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenus_salaires: {
        Row: {
          case_1aa: number | null
          case_1ad: number | null
          case_1af: number | null
          case_1ag: number | null
          case_1aj: number | null
          case_1ak: number | null
          case_1ap: number | null
          case_1av: boolean
          case_1ba: number | null
          case_1bd: number | null
          case_1bf: number | null
          case_1bg: number | null
          case_1bj: number | null
          case_1bk: number | null
          case_1bp: number | null
          case_1bv: boolean
          case_1dn: number | null
          case_1dy: number | null
          case_1ey: number | null
          case_1ga: number | null
          case_1gb: number | null
          case_1gf: number | null
          case_1gg: number | null
          case_1gh: number | null
          case_1gk: boolean
          case_1gl: boolean
          case_1ha: number | null
          case_1hb: number | null
          case_1hf: number | null
          case_1hg: number | null
          case_1hh: number | null
          case_1pb: number | null
          case_1pc: number | null
          case_1pm: number | null
          case_1qm: number | null
          case_1sm: number | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_1aa?: number | null
          case_1ad?: number | null
          case_1af?: number | null
          case_1ag?: number | null
          case_1aj?: number | null
          case_1ak?: number | null
          case_1ap?: number | null
          case_1av?: boolean
          case_1ba?: number | null
          case_1bd?: number | null
          case_1bf?: number | null
          case_1bg?: number | null
          case_1bj?: number | null
          case_1bk?: number | null
          case_1bp?: number | null
          case_1bv?: boolean
          case_1dn?: number | null
          case_1dy?: number | null
          case_1ey?: number | null
          case_1ga?: number | null
          case_1gb?: number | null
          case_1gf?: number | null
          case_1gg?: number | null
          case_1gh?: number | null
          case_1gk?: boolean
          case_1gl?: boolean
          case_1ha?: number | null
          case_1hb?: number | null
          case_1hf?: number | null
          case_1hg?: number | null
          case_1hh?: number | null
          case_1pb?: number | null
          case_1pc?: number | null
          case_1pm?: number | null
          case_1qm?: number | null
          case_1sm?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_1aa?: number | null
          case_1ad?: number | null
          case_1af?: number | null
          case_1ag?: number | null
          case_1aj?: number | null
          case_1ak?: number | null
          case_1ap?: number | null
          case_1av?: boolean
          case_1ba?: number | null
          case_1bd?: number | null
          case_1bf?: number | null
          case_1bg?: number | null
          case_1bj?: number | null
          case_1bk?: number | null
          case_1bp?: number | null
          case_1bv?: boolean
          case_1dn?: number | null
          case_1dy?: number | null
          case_1ey?: number | null
          case_1ga?: number | null
          case_1gb?: number | null
          case_1gf?: number | null
          case_1gg?: number | null
          case_1gh?: number | null
          case_1gk?: boolean
          case_1gl?: boolean
          case_1ha?: number | null
          case_1hb?: number | null
          case_1hf?: number | null
          case_1hg?: number | null
          case_1hh?: number | null
          case_1pb?: number | null
          case_1pc?: number | null
          case_1pm?: number | null
          case_1qm?: number | null
          case_1sm?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scenarios_regime: {
        Row: {
          created_at: string
          date: string
          id: string
          motivation_civile: string | null
          regime_cible: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          motivation_civile?: string | null
          regime_cible: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          motivation_civile?: string | null
          regime_cible?: string
          type?: string
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
        Relationships: [
          {
            foreignKeyName: "societe_associes_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "societe_bilans_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "societe_comptes_courants_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "societe_dutreil_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "societe_pactes_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
      }
      societe_participations: {
        Row: {
          commentaire: string | null
          created_at: string
          date_debut: string | null
          id: string
          nombre_titres: number | null
          pourcentage: number
          societe_fille_id: string
          societe_mere_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          id?: string
          nombre_titres?: number | null
          pourcentage: number
          societe_fille_id: string
          societe_mere_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          date_debut?: string | null
          id?: string
          nombre_titres?: number | null
          pourcentage?: number
          societe_fille_id?: string
          societe_mere_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "societe_participations_fille_fk"
            columns: ["societe_fille_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "societe_participations_mere_fk"
            columns: ["societe_mere_id"]
            isOneToOne: false
            referencedRelation: "societes"
            referencedColumns: ["id"]
          },
        ]
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
          date_souscription: string | null
          denomination: string
          detenteur: string
          eligible_taux_reduit_pme: boolean
          forme_societe_civile: string | null
          holding: string | null
          id: string
          jour_cloture: string | null
          mois_cloture: string | null
          nombre_salaries: number | null
          nombre_titres: number | null
          parts_negociables: boolean | null
          pays: string | null
          pourcentage_conjoint: number | null
          pourcentage_ifi: number | null
          pourcentage_utilisateur: number | null
          qualification_bien: string
          regime_fiscal: string | null
          reserves: number | null
          resultat_net: number | null
          rue_adresse: string | null
          siret: string | null
          tresorerie_disponible: number | null
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
          date_souscription?: string | null
          denomination: string
          detenteur: string
          eligible_taux_reduit_pme?: boolean
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          parts_negociables?: boolean | null
          pays?: string | null
          pourcentage_conjoint?: number | null
          pourcentage_ifi?: number | null
          pourcentage_utilisateur?: number | null
          qualification_bien: string
          regime_fiscal?: string | null
          reserves?: number | null
          resultat_net?: number | null
          rue_adresse?: string | null
          siret?: string | null
          tresorerie_disponible?: number | null
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
          date_souscription?: string | null
          denomination?: string
          detenteur?: string
          eligible_taux_reduit_pme?: boolean
          forme_societe_civile?: string | null
          holding?: string | null
          id?: string
          jour_cloture?: string | null
          mois_cloture?: string | null
          nombre_salaries?: number | null
          nombre_titres?: number | null
          parts_negociables?: boolean | null
          pays?: string | null
          pourcentage_conjoint?: number | null
          pourcentage_ifi?: number | null
          pourcentage_utilisateur?: number | null
          qualification_bien?: string
          regime_fiscal?: string | null
          reserves?: number | null
          resultat_net?: number | null
          rue_adresse?: string | null
          siret?: string | null
          tresorerie_disponible?: number | null
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
