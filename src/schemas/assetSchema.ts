import * as z from 'zod';

// Constants
export const ORIGINE_ACTIF_OPTIONS = [
  'Acquisition à titre gratuite',
  'Acquisition à titre onéreuse',
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
export const assetSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  denomination: z.string().optional(),
  etablissement: z.string().optional(),
  mode_detention: z.string().optional(),
  beneficiaire_autre_partie: z.string().optional(),
  valeur_estimee: z.number().optional(),
  date_estimation: z.date().optional(),
  revalorisation_annuelle: z.number().optional(),
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
  origine_actif: ['Acquisition à titre onéreuse'],
  situation_particuliere: ['Non'],
  attachement_emotionnel: 0,
  transfert_immobilier: true,
  transfert_societe: true,
  bien_etranger: false,
  qualification_auto: true,
});
