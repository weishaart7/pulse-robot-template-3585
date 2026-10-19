import * as z from 'zod';
import { isBienRuralNonQualifie, isBien787CNonQualifie, isRetraiteEtrangereNonQualifiee, isPERNonQualifie, isRetraiteRenteNonQualifie } from '@/constants/assetTypes';

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

// Origines proposées pour une créance : mêmes valeurs stockées (lues telles quelles par
// qualifierBien()), libellés propres. Des fonds propres se signalent par la clause de remploi.
export const ORIGINE_CREANCE_OPTIONS = [
  { value: 'Acquisition à titre onéreux', label: 'Prêt ou vente consenti par le foyer' },
  { value: 'Héritage', label: 'Reçue par héritage ou partage successoral' },
  { value: 'Donation', label: 'Reçue par donation' },
] as const;

export const getOrigineCreanceLabel = (value: string): string =>
  ORIGINE_CREANCE_OPTIONS.find((option) => option.value === value)?.label ?? getOrigineActifLabel(value);

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
// Les champs "immobilier étendu" consommés par le module Immobilier vivent dans
// le type `Asset` (src/services/assetService.ts, section "Champs immobilier
// étendu"). Seuls la description du bien et le détail du coût de revient
// (résidences et biens locatifs, cf. hasDetailImmobilier) sont saisis ici, dès
// la création ; financement et location restent dans le module Immobilier.
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
  // Société du module Sociétés dont l'actif représente les titres (natures « parts », cf. societeTransfer.ts).
  societe_id: z.string().nullable().optional(),
  bien_etranger: z.boolean().optional(),
  qualification_bien: z.string().optional(),
  qualification_auto: z.boolean().optional(),
  sous_type_per: z.enum(['Bancaire', 'Assurantiel']).optional(),
  // Contrats de retraite par rente (cf. NATURES_RETRAITE_RENTE).
  garantie_deces: z.boolean().optional(),
  conditions_exoneration_990i: z.boolean().optional(),
  // Biens ruraux, groupements fonciers, bois et forêts (cf. NATURES_RURALES).
  regime_exoneration_rural: z.enum(['forestier', 'agricole', 'aucun']).optional(),
  type_groupement: z.enum(['GFA', 'GAF', 'GFV', 'GFR', 'GFF', 'GFI']).optional(),
  conditions_exoneration_rural: z.boolean().optional(),
  fraction_eligible_rural: z.number().finite().min(0).max(100).optional(),
  // Caractéristiques fiscales immobilières (plus-values, cf. regimeFiscalPVI.ts).
  terrain_constructible: z.boolean().optional(),
  residence_services: z.boolean().optional(),
  surface_boisee_ha: z.number().finite().nonnegative().optional(),
  fixe_au_sol: z.boolean().optional(),
  // Biens professionnels d'une entreprise individuelle (cf. NATURES_787C).
  conditions_787c: z.boolean().optional(),
  // Bijoux, objets d'art, collections (cf. NATURES_PLANCHER_ASSURANCE).
  valeur_assuree: z.number().finite().nonnegative().optional(),
  // Assurance-vie : assuré distinct du souscripteur.
  assure_tiers: z.boolean().optional(),
  // Régimes de retraite étrangers (cf. NATURE_RETRAITE_ETRANGERE).
  regime_retraite_etrangere: z.enum(['actif_successoral', 'clause_beneficiaire', 'aucune']).optional(),
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
  // Champs additionnels "épargne retraite" et "prévoyance" — cf. RETRAITE_PREVOYANCE_NATURES_CHAMPS.
  capital_garanti: z.number().finite().nonnegative().optional(),
  beneficiaire_designe: z.string().optional(),
  mode_sortie: z.string().optional(),
  versements_deduits_pct: z.number().finite().min(0).max(100).optional(),
  cession_depart_retraite: z.boolean().optional(),
  qualification_nft: z.enum(['actif_numerique', 'titre_financier', 'oeuvre_art', 'bien_meuble']).optional(),
  detention_matieres_premieres: z.enum(['financiere', 'physique']).optional(),
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
  // Description et coût de revient détaillé d'un bien immobilier (cf. hasDetailImmobilier).
  // Le prix d'achat reste `valeur_acquisition`, recopié dans `montant_immeuble` à
  // l'enregistrement ; `frais_acquisition` devient la somme des frais détaillés.
  typologie_bien: z.enum(['Appartement', 'Maison']).optional(),
  surface_m2: z.number().finite().nonnegative().optional(),
  statut_bien: z.enum(['Usage personnel', 'En rénovation', 'En vente']).optional(),
  frais_agence: z.number().finite().nonnegative().optional(),
  frais_notaire: z.number().finite().nonnegative().optional(),
  frais_bancaires: z.number().finite().nonnegative().optional(),
  frais_hypotheque: z.number().finite().nonnegative().optional(),
  travaux_renovation: z.number().finite().nonnegative().optional(),
  travaux_construction: z.number().finite().nonnegative().optional(),
  meubles: z.number().finite().nonnegative().optional(),
  // Location d'un bien locatif (cf. isRentalPropertyType), saisie dès la création.
  type_location: z.enum(['Location nue', 'Location meublée non professionnelle (LMNP)', 'Location meublée professionnelle (LMP)']).optional(),
  regime_location: z.enum(['Micro-foncier', 'Réel', 'Micro-BIC', 'BIC']).optional(),
  // Champs de saisie seulement, jamais écrits dans `assets` (retirés par useAssetForm) : loyer
  // enregistré comme revenu du bien, et crédit à saisir ensuite dans Passifs.
  loyer_mensuel: z.number().finite().nonnegative().optional(),
  loyer_budget: z.boolean().optional(),
  finance_par_credit: z.boolean().optional(),
}).superRefine((values, ctx) => {
  // PER : le sous-type détermine si le contrat sort de la succession (assurantiel)
  // ou y reste (bancaire) — obligatoire, sauf PER obligatoire (toujours assurantiel,
  // cf. constants/assetTypes.ts::isPERAssurantiel).
  if (isPERNonQualifie(values)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sous_type_per'],
      message: 'Précisez si ce PER est assurantiel ou bancaire',
    });
  }
  // Contrat de retraite par rente : la garantie décès détermine si quoi que ce
  // soit est transmis au décès — obligatoire, jamais présumée.
  if (isRetraiteRenteNonQualifie(values)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['garantie_deces'],
      message: 'Précisez si ce contrat comporte une garantie décès',
    });
  }
  // Bien rural, groupement foncier, bois et forêts : le régime et les conditions
  // déterminent l'exonération partielle de droits de succession — jamais présumés.
  if (isBienRuralNonQualifie(values)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [values.regime_exoneration_rural ? 'conditions_exoneration_rural' : 'regime_exoneration_rural'],
      message: values.regime_exoneration_rural
        ? "Précisez si les conditions de l'exonération sont remplies"
        : "Précisez le régime d'exonération de ce bien",
    });
  }
  // Biens professionnels d'une entreprise individuelle : l'exonération de
  // l'art. 787 C dépend d'engagements à confirmer — jamais présumée.
  if (isRetraiteEtrangereNonQualifiee(values)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['regime_retraite_etrangere'],
      message: 'Précisez ce que ce régime transmet au décès',
    });
  }
  if (isBien787CNonQualifie(values)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['conditions_787c'],
      message: "Précisez si les conditions de l'exonération de l'art. 787 C sont remplies",
    });
  }
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
  transfert_societe: false,
  societe_id: null,
  bien_etranger: false,
  qualification_auto: true,
  cto_multi_actifs: false,
});
