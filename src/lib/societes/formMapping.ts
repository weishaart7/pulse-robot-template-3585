// Mapping unique entre la ligne Supabase `societes` et l'état du formulaire
// SocieteForm.tsx, consommé par SocietesSection.tsx et SocieteFormPage.tsx.
// Auparavant dupliqué dans les deux fichiers avec des divergences silencieuses
// (defaults différents, et surtout `null` vs `undefined` dans formDataToSociete —
// ce dernier point causait une perte de données silencieuse sur le parcours
// SocieteFormPage.tsx : vider un champ n'effaçait pas la valeur en base).
import type { Societe } from '@/services/societeService';

export interface SocieteFormData {
  denomination: string;
  typeSociete: string;
  dateCreation: string;
  valeurEstimee: number;
  pourcentageIFI: number;
  capitalSocial: number;
  nombreTitres: number;
  nombreSalaries: number;
  jourCloture: string;
  moisCloture: string;
  siret: string;
  rueAdresse: string;
  codePostal: string;
  commune: string;
  pays: string;
  regimeFiscal: string;
  valeurIFI: number;
  activite?: string;
  holding?: string;
  formeSocieteCivile?: string;
  transfertVersActifs?: boolean;
  natureActif?: string;
  pourcentageUtilisateur?: number;
  pourcentageConjoint?: number;
  qualificationBien: string;
  detenteur: string;
  // Financial fields
  chiffreAffaires?: number;
  resultatNet?: number;
  tresorerieDisponible?: number;
  compteCourantAssocies?: number;
  reserves?: number;
  dateDernierBilan?: string;
}

export const societeToFormData = (societe: Societe): SocieteFormData => ({
  denomination: societe.denomination || '',
  typeSociete: societe.type_societe || '',
  dateCreation: societe.date_creation || '',
  valeurEstimee: societe.valeur_estimee || 0,
  pourcentageIFI: societe.pourcentage_ifi || 0,
  capitalSocial: societe.capital_social || 0,
  nombreTitres: societe.nombre_titres || 0,
  nombreSalaries: societe.nombre_salaries || 0,
  jourCloture: societe.jour_cloture || '31',
  moisCloture: societe.mois_cloture || 'Décembre',
  siret: societe.siret || '',
  rueAdresse: societe.rue_adresse || '',
  codePostal: societe.code_postal || '',
  commune: societe.commune || '',
  pays: societe.pays || 'France',
  regimeFiscal: societe.regime_fiscal || '',
  valeurIFI: societe.valeur_ifi || 0,
  activite: societe.activite || '',
  holding: societe.holding || 'Non',
  formeSocieteCivile: societe.forme_societe_civile || '',
  transfertVersActifs: false,
  pourcentageUtilisateur: societe.pourcentage_utilisateur || 100,
  pourcentageConjoint: societe.pourcentage_conjoint || 0,
  qualificationBien: societe.qualification_bien || '',
  detenteur: societe.detenteur || '',
  chiffreAffaires: societe.chiffre_affaires || undefined,
  resultatNet: societe.resultat_net || undefined,
  tresorerieDisponible: societe.tresorerie_disponible || undefined,
  compteCourantAssocies: societe.compte_courant_associes || undefined,
  reserves: societe.reserves || undefined,
  dateDernierBilan: societe.date_dernier_bilan || undefined,
});

export const formDataToSociete = (
  data: SocieteFormData
): Omit<Societe, 'id' | 'user_id' | 'created_at' | 'updated_at'> => ({
  denomination: data.denomination,
  type_societe: data.typeSociete,
  date_creation: data.dateCreation || null,
  valeur_estimee: data.valeurEstimee || null,
  pourcentage_ifi: data.pourcentageIFI || null,
  capital_social: data.capitalSocial || null,
  nombre_titres: data.nombreTitres || null,
  nombre_salaries: data.nombreSalaries || null,
  jour_cloture: data.jourCloture || null,
  mois_cloture: data.moisCloture || null,
  siret: data.siret || null,
  rue_adresse: data.rueAdresse || null,
  code_postal: data.codePostal || null,
  commune: data.commune || null,
  pays: data.pays || null,
  regime_fiscal: data.regimeFiscal || null,
  valeur_ifi: data.valeurIFI || null,
  activite: data.activite || null,
  holding: data.holding || null,
  forme_societe_civile: data.formeSocieteCivile || null,
  pourcentage_utilisateur: data.pourcentageUtilisateur || null,
  pourcentage_conjoint: data.pourcentageConjoint || null,
  qualification_bien: data.qualificationBien || null,
  detenteur: data.detenteur || null,
  chiffre_affaires: data.chiffreAffaires || null,
  resultat_net: data.resultatNet || null,
  tresorerie_disponible: data.tresorerieDisponible || null,
  compte_courant_associes: data.compteCourantAssocies || null,
  reserves: data.reserves || null,
  date_dernier_bilan: data.dateDernierBilan || null,
});
