import * as z from 'zod';

// Constants
export const ORIGINE_ACTIF_OPTIONS = [
  'Acquisition à titre gratuit',
  'Acquisition à titre onéreux',
  'Acquisition par occupation',
  'Création',
  'Découverte',
  'Donation',
  'Échange',
  'Héritage',
  'Présent d\'usage'
] as const;

export const SITUATION_PARTICULIERE_OPTIONS = [
  'Antichrèse',
  'Gage',
  'Hypothèque',
  'Indivision',
  'Nantissement',
  'Non',
  'Saisie conservatoire'
] as const;

export const MODE_DETENTION_OPTIONS = [
  'Pleine propriété',
  'Usufruit',
  'Nue-propriété'
] as const;

// Liste des natures pour lesquelles la case "Bien à l'étranger" est masquée
// (livrets et comptes français règlementés par nature)
export const NATURES_LIQUIDITES_FR: string[] = [
  'Livret A',
  'Livret Bleu',
  'Livret de développement durable et solidaire (LDDS)',
  "Livret d'épargne populaire (LEP)",
  'Livret Jeune',
  'CEL',
  'PEL',
  'PEA',
  'PEA-PME',
  'PEE',
  'PEI',
  'PER individuel',
  'PER entreprise collectif',
  'PER entreprise obligatoire',
  'PERCO/PERCOI',
  'PERP',
];

// Schema
// Note : ce schéma couvre le socle générique patrimoine du formulaire d'actif.
// Les champs "immobilier étendu" (typologie_bien, surface_m2, financement_*,
// etc.), utilisés uniquement pour les natures immobilières et consommés par
// le module Immobilier, ne sont pas saisis ici : ils vivent dans le type
// `Asset` (src/services/assetService.ts, section "Champs immobilier étendu")
// et sont gérés par les formulaires du module Immobilier.
export const assetSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  denomination: z.string().optional(),
  etablissement: z.string().optional(),
  mode_detention: z.string().optional(),
  valeur_estimee: z.number().optional(),
  date_estimation: z.date().optional(),
  detenteur: z.string().optional(),
  pourcentage_utilisateur: z.number().optional(),
  pourcentage_conjoint: z.number().optional(),
  valeur_acquisition: z.number().optional(),
  frais_acquisition: z.number().optional(),
  date_acquisition: z.date().optional(),
  origine_actif: z.array(z.string()).optional(),
  situation_particuliere: z.array(z.string()).optional(),
  attachement_emotionnel: z.number().min(0).max(10).optional(),
  transfert_immobilier: z.boolean().optional(),
  transfert_societe: z.boolean().optional(),
  bien_etranger: z.boolean().optional(),
  qualification_bien: z.string().optional(),
  qualification_auto: z.boolean().optional(),
  sous_type_per: z.enum(['Bancaire', 'Assurantiel']).optional(),
  cto_multi_actifs: z.boolean().optional(),
  cto_nature_sous_jacent: z.string().optional(),
  clause_entree_communaute: z.boolean().optional(),
  clause_remploi: z.boolean().optional(),
});

export type AssetFormValues = z.infer<typeof assetSchema>;

// Default values
export const getDefaultAssetValues = (): AssetFormValues => ({
  nature: '',
  denomination: '',
  etablissement: '',
  mode_detention: '',
  detenteur: '',
  pourcentage_utilisateur: 50,
  pourcentage_conjoint: 50,
  origine_actif: ['Acquisition à titre onéreux'],
  situation_particuliere: ['Non'],
  attachement_emotionnel: 0,
  transfert_immobilier: true,
  transfert_societe: true,
  bien_etranger: false,
  qualification_auto: true,
  cto_multi_actifs: false,
});
