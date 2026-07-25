import type { Liberalite } from '@/services/liberaliteService';
import type { FamilyLink } from '@/services/familyService';
import type { AVContractRawRow } from '@/utils/transmissionHelpers';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import type { Societe } from '@/services/societeService';
import type { PatrimoineOriginaire } from '@/types/participationAcquets';

export type NiveauAlerte = 'critique' | 'eleve' | 'moyen';

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
  clientEstDirigeant?: boolean;
  conjointEstDirigeant?: boolean;
  clientResidenceFiscaleEtranger?: boolean;
  conjointResidenceFiscaleEtranger?: boolean;
  liberalites: Liberalite[];
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
