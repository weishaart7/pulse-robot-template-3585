export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
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
          frais_acquisition: number | null
          id: string
          mode_detention: string | null
          nature: string
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
          frais_acquisition?: number | null
          id?: string
          mode_detention?: string | null
          nature: string
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
          frais_acquisition?: number | null
          id?: string
          mode_detention?: string | null
          nature?: string
          revalorisation_annuelle?: number | null
          updated_at?: string
          user_id?: string
          valeur_acquisition?: number | null
          valeur_estimee?: number | null
        }
        Relationships: []
      }
      family_links: {
        Row: {
          a_charge: boolean | null
          created_at: string | null
          date_naissance: string | null
          enfant_mineur: boolean | null
          handicap: boolean | null
          id: string
          lien_familial: string
          nationalite: string | null
          niveau_scolaire: string | null
          nom: string
          prenom: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          a_charge?: boolean | null
          created_at?: string | null
          date_naissance?: string | null
          enfant_mineur?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial: string
          nationalite?: string | null
          niveau_scolaire?: string | null
          nom: string
          prenom?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          a_charge?: boolean | null
          created_at?: string | null
          date_naissance?: string | null
          enfant_mineur?: boolean | null
          handicap?: boolean | null
          id?: string
          lien_familial?: string
          nationalite?: string | null
          niveau_scolaire?: string | null
          nom?: string
          prenom?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      family_profiles: {
        Row: {
          adresse_postale: string | null
          civility: string | null
          commune_naissance: string | null
          created_at: string | null
          date_naissance: string | null
          email: string | null
          id: string
          nationalite: string | null
          nom: string | null
          pays_naissance: string | null
          personne_handicapee: boolean | null
          prenom: string | null
          profession: string | null
          telephone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adresse_postale?: string | null
          civility?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adresse_postale?: string | null
          civility?: string | null
          commune_naissance?: string | null
          created_at?: string | null
          date_naissance?: string | null
          email?: string | null
          id?: string
          nationalite?: string | null
          nom?: string | null
          pays_naissance?: string | null
          personne_handicapee?: boolean | null
          prenom?: string | null
          profession?: string | null
          telephone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      marital_status: {
        Row: {
          adresse_notaire: string | null
          contrat_mariage: string | null
          created_at: string | null
          date_mariage: string | null
          date_naissance_conjoint: string | null
          date_pacs: string | null
          id: string
          lieu_mariage: string | null
          lieu_pacs: string | null
          mariage_precedent_conjoint: boolean | null
          mariage_precedent_personne: boolean | null
          nationalite_conjoint: string | null
          nom_conjoint: string | null
          nom_notaire: string | null
          nombre_enfants_charges: number | null
          parent_isole: boolean | null
          prenom_conjoint: string | null
          profession_conjoint: string | null
          statut_couple: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          adresse_notaire?: string | null
          contrat_mariage?: string | null
          created_at?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          parent_isole?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          statut_couple?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          adresse_notaire?: string | null
          contrat_mariage?: string | null
          created_at?: string | null
          date_mariage?: string | null
          date_naissance_conjoint?: string | null
          date_pacs?: string | null
          id?: string
          lieu_mariage?: string | null
          lieu_pacs?: string | null
          mariage_precedent_conjoint?: boolean | null
          mariage_precedent_personne?: boolean | null
          nationalite_conjoint?: string | null
          nom_conjoint?: string | null
          nom_notaire?: string | null
          nombre_enfants_charges?: number | null
          parent_isole?: boolean | null
          prenom_conjoint?: string | null
          profession_conjoint?: string | null
          statut_couple?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      Profils: {
        Row: {
          created_at: string
          id: number
        }
        Insert: {
          created_at?: string
          id?: number
        }
        Update: {
          created_at?: string
          id?: number
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
