import type { Liberalite } from '@/services/liberaliteService';
import type { FamilyLink } from '@/services/familyService';
import type { AVContractRawRow } from '@/utils/transmissionHelpers';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import type { Societe } from '@/services/societeService';
import type { PatrimoineOriginaire } from '@/types/participationAcquets';

export type NiveauAlerte = 'critique' | 'eleve' | 'moyen';

// Vue allégée d'un scenarios_regime pour le moteur d'alertes (camelCase,
// alignée sur le pattern des autres champs de AlerteContext mappés depuis
// les lignes brutes Supabase dans useAlertesConseil.ts).
export interface ScenarioRegime {
  id: string;
  type: 'realise' | 'envisage';
  regimeCible: string;
  date: string;
  motivationCivile?: string;
}

// Contexte volontairement plus léger que TransmissionContext (src/lib/transmission/index.ts) :
// ce dernier est construit pour le calcul fiscal (récompenses, créances, patrimoine
// originaire/final...), bien plus que ce dont les règles de conseil ont besoin.
export interface AlerteContext {
  statutCouple?: string;
  regimeMatrimonial?: string;
  dateMariage?: string;
  datePacs?: string;
  conventionPacs?: string;
  pasDeContratMariage?: boolean;
  clausesContrat?: Record<string, { enabled?: boolean; options?: { residencePrincipale?: boolean; maintienDivorce?: boolean } }>;
  clientResidenceFiscaleEtranger?: boolean;
  conjointResidenceFiscaleEtranger?: boolean;
  // Éléments d'extranéité du régime matrimonial (DIP, §4.4, §12.1) : simple
  // signalement déclaratif (marital_status.loi_applicable_regime /
  // pays_premier_domicile_matrimonial), distinct de la résidence fiscale
  // ci-dessus — cf. alerte extraneite_regime_matrimonial dans regles.ts.
  loiApplicableRegime?: string;
  paysPremierDomicileMatrimonial?: string;
  liberalites: Liberalite[];
  scenariosRegime: ScenarioRegime[];
  avContracts: AVContractRawRow[];
  familyLinks: FamilyLink[];
  hasNonCommonChildren: boolean;
  hasDDV: boolean;
  assets: Asset[];
  emprunts: Emprunt[];
  societes: Societe[];
  patrimoineOriginaire: PatrimoineOriginaire[];
  /** Estimation simple (actifs - passifs - emprunts), pas le calcul fiscal-grade de src/lib/transmission. */
  patrimoineNet?: number;
}

export interface AlerteDefinition {
  id: string;
  niveau: NiveauAlerte;
  condition: (ctx: AlerteContext) => boolean;
  message: string | ((ctx: AlerteContext) => string);
}

export interface AlerteActive {
  id: string;
  niveau: NiveauAlerte;
  message: string;
}
