import * as z from 'zod';

// Constants
// Origines proposées à l'utilisateur. `value` est ce qui est stocké dans
// assets.origine_actif et lu par qualifierBien() (qualification.ts) : il ne
// change pas. `label` est le libellé affiché, en langage courant.
export const ORIGINE_ACTIF_OPTIONS = [
  { value: 'Acquisition à titre onéreux', label: 'Achat' },
  { value: 'Donation', label: 'Donation reçue' },
  { value: 'Héritage', label: 'Héritage ou legs' },
  { value: 'Présent d\'usage', label: 'Cadeau courant (anniversaire, Noël…)' },
  { value: 'Acquisition à titre gratuit', label: 'Autre bien reçu gratuitement' },
  { value: 'Échange', label: 'Échange contre un autre bien' },
  { value: 'Création', label: 'Création (œuvre, brevet, entreprise…)' },
] as const;

// Valeurs retirées de la liste proposée mais encore comprises par le moteur de
// qualification : un actif qui les porterait continue de s'afficher.
const ORIGINE_ACTIF_LEGACY_LABELS: Record<string, string> = {
  'Découverte': 'Découverte (trésor)',
  'Acquisition par occupation': 'Occupation (chasse, pêche…)',
};

export const getOrigineActifLabel = (value: string): string =>
  ORIGINE_ACTIF_OPTIONS.find((option) => option.value === value)?.label
  ?? ORIGINE_ACTIF_LEGACY_LABELS[value]
  ?? value;

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
  valeur_estimee: z.number().finite().nonnegative().optional(),
  date_estimation: z.date().optional(),
  detenteur: z.string().optional(),
  pourcentage_utilisateur: z.number().optional(),
  pourcentage_conjoint: z.number().optional(),
  valeur_acquisition: z.number().finite().nonnegative().optional(),
  frais_acquisition: z.number().finite().nonnegative().optional(),
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
  est_propre_par_nature: z.boolean().optional(),
  financement_mixte_apport_propre: z.number().min(0).optional(),
  part_licitation_personnelle: z.number().min(0).max(100).optional(),
  licitation_acquereur: z.enum(['utilisateur', 'conjoint']).optional(),
  // Parts foncières/forestières non éligibles au module Sociétés (SCPI, groupements fonciers,
  // GFA/GAF/GFV/GFR, sociétés d'épargne forestière) — cf. PARTS_FONCIERES_NATURES.
  revenus_distribues_12m: z.number().finite().nonnegative().optional(),
  regime_fiscal_parts: z.string().optional(),
  // Champs additionnels "actifs corporels" — cf. CORPS_NATURES_CHAMPS.
  certificat_expertise: z.boolean().optional(),
  certificat_expertise_reference: z.string().optional(),
  numero_serie: z.string().optional(),
  quantite_millesime: z.string().optional(),
  // Champs additionnels "épargne retraite et prévoyance" — cf. RETRAITE_PREVOYANCE_NATURES_CHAMPS.
  capital_garanti: z.number().finite().nonnegative().optional(),
  beneficiaire_designe: z.string().optional(),
  mode_sortie: z.string().optional(),
  // Champs additionnels "épargne salariale" (PEE/PEI) — cf. NATURES_EPARGNE_SALARIALE.
  abondement_employeur: z.number().finite().nonnegative().optional(),
  date_disponibilite: z.date().optional(),
  motif_deblocage_anticipe: z.string().optional(),
  support_investissement: z.string().optional(),
  // Champs additionnels "épargne bancaire / liquidités" — cf. LIQUIDITES_NATURES_CHAMPS.
  taux_remuneration: z.number().finite().optional(),
  date_echeance: z.date().optional(),
  // Champs additionnels "valeurs mobilières et placements financiers" — cf.
  // VALEURS_MOBILIERES_NATURES_CHAMPS.
  plafond_verse: z.number().finite().nonnegative().optional(),
  duree_blocage: z.string().optional(),
  reduction_ir_entree: z.number().finite().optional(),
  date_attribution: z.date().optional(),
  prix_exercice: z.number().finite().nonnegative().optional(),
  montant_engage: z.number().finite().nonnegative().optional(),
  montant_appele: z.number().finite().nonnegative().optional(),
  sous_jacent: z.string().optional(),
  lieu_stockage: z.string().optional(),
  quantite: z.string().optional(),
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
