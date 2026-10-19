import * as z from 'zod';

// Schema for property form validation
export const immobilierPropertySchema = z.object({
  typologie_bien: z.enum(['Appartement', 'Maison']).nullable().optional(),
  surface_m2: z.number().min(0).optional().or(z.literal('')),
  date_acquisition: z.date().optional(),
  valeur_estimee: z.number().min(0).optional().or(z.literal('')),
  statut_bien: z.enum(['Usage personnel', 'En rénovation', 'En vente']).nullable().optional(),
  montant_immeuble: z.number().min(0).optional().or(z.literal('')),
  frais_agence: z.number().min(0).optional().or(z.literal('')),
  frais_notaire: z.number().min(0).optional().or(z.literal('')),
  frais_bancaires: z.number().min(0).optional().or(z.literal('')),
  frais_hypotheque: z.number().min(0).optional().or(z.literal('')),
  travaux_renovation: z.number().min(0).optional().or(z.literal('')),
  travaux_construction: z.number().min(0).optional().or(z.literal('')),
  meubles: z.number().min(0).optional().or(z.literal('')),
  financement_actif: z.boolean().optional(),
  financement_duree_mois: z.number().min(0).optional().or(z.literal('')),
  financement_apport: z.number().min(0).optional().or(z.literal('')),
  financement_taux_credit: z.number().min(0).optional().or(z.literal('')),
  financement_taux_assurance: z.number().min(0).optional().or(z.literal('')),
  type_location: z.enum(['Location nue', 'Location meublée non professionnelle (LMNP)', 'Location meublée professionnelle (LMP)']).nullable().optional(),
  regime_location: z.enum(['Micro-foncier', 'Réel', 'Micro-BIC', 'BIC']).nullable().optional(),
});

export type ImmobilierPropertyFormValues = z.infer<typeof immobilierPropertySchema>;

// Property type classifications
export const RESIDENCE_TYPES = ['Résidence principale', 'Résidences secondaires'];

export const RENTAL_PROPERTY_TYPES = [
  'Immeubles locatifs (loués nus)',
  'Immeubles locatifs (LMNP)',
  'Immeubles locatifs (LMP)',
  'Immeubles professionnels (hors LMP)',
  'Parking / Garage / Box'
];

export const isResidenceType = (nature: string | null | undefined): boolean => {
  return nature ? RESIDENCE_TYPES.includes(nature) : false;
};

export const isRentalPropertyType = (nature: string | null | undefined): boolean => {
  return nature ? RENTAL_PROPERTY_TYPES.includes(nature) : false;
};

// Charge natures enrichies
export const CHARGE_NATURES = [
  'Taxe foncière',
  'Assurance propriétaire non occupant (PNO)',
  'Assurance GLI',
  'Frais de gestion locative',
  'Frais de comptabilité',
  'Charges de copropriété',
  'CFE (Cotisation Foncière des Entreprises)',
  'Travaux d\'entretien',
  'Travaux de réparation',
  'Travaux d\'amélioration',
  'Honoraires syndic',
  'Frais de procédure',
  'Autres charges'
];

// Revenu natures enrichies
export const REVENU_NATURES = [
  'Loyers charges comprises',
  'Loyers hors charges',
  'Charges locataire',
  'Indemnités d\'assurance',
  'Dépôt de garantie encaissé',
  'Remboursement travaux locataire',
  'Autres revenus'
];

// Periodicité options
export const PERIODICITE_OPTIONS = [
  { value: 'Mensuelle', label: 'Mensuelle' },
  { value: 'Trimestrielle', label: 'Trimestrielle' },
  { value: 'Semestrielle', label: 'Semestrielle' },
  { value: 'Annuelle', label: 'Annuelle' }
];

// Debiteur/Crediteur options
export const DETENTEUR_OPTIONS = [
  { value: 'user', label: 'Utilisateur' },
  { value: 'spouse', label: 'Conjoint' },
  { value: 'common', label: 'Le couple' }
];

// Natures dont la fiche Immobilier porte description et coût de revient détaillé :
// ces champs sont alors saisis dès le formulaire d'actif de Patrimoine.
export const hasDetailImmobilier = (nature: string | null | undefined): boolean =>
  isResidenceType(nature) || isRentalPropertyType(nature);

// Frais du coût de revient détaillé, dans l'ordre de la fiche Immobilier. Leur somme alimente
// `frais_acquisition` (plus-value, qualification) pour éviter une double saisie divergente. Les frais
// du crédit (dossier, garantie) n'y figurent pas : saisis sur l'emprunt relié (fraisCreditBien).
export const FRAIS_DETAILLES = [
  { name: 'frais_notaire', label: 'Frais de notaire' },
  { name: 'frais_agence', label: "Frais d'agence" },
  { name: 'travaux_renovation', label: 'Travaux de rénovation' },
  { name: 'travaux_construction', label: 'Travaux de construction' },
  { name: 'meubles', label: 'Meubles' },
] as const;

export type FraisDetailleName = typeof FRAIS_DETAILLES[number]['name'];

export type TypeLocation = 'Location nue' | 'Location meublée non professionnelle (LMNP)' | 'Location meublée professionnelle (LMP)';
export type RegimeLocation = 'Micro-foncier' | 'Réel' | 'Micro-BIC' | 'BIC';

export const TYPE_LOCATION_OPTIONS: TypeLocation[] = [
  'Location nue',
  'Location meublée non professionnelle (LMNP)',
  'Location meublée professionnelle (LMP)',
];

// Régimes fiscaux selon le type de location (et non la nature du bien) : revenus fonciers pour la
// location nue, BIC pour le meublé.
export const regimesPour = (type: TypeLocation | null | undefined): RegimeLocation[] =>
  type === 'Location nue' ? ['Micro-foncier', 'Réel'] : ['Micro-BIC', 'BIC'];

// Types de location possibles selon la nature : un bien de nature « loués nus » ne peut être qu'en
// location nue ; les autres natures locatives peuvent être louées nues ou meublées.
export const typesLocationPour = (nature: string | null | undefined): TypeLocation[] =>
  nature === 'Immeubles locatifs (loués nus)' ? ['Location nue'] : TYPE_LOCATION_OPTIONS;

// Type proposé d'office à la création, quand la nature le désigne.
export const typeLocationParDefaut = (nature: string | null | undefined): TypeLocation | undefined => {
  switch (nature) {
    case 'Immeubles locatifs (loués nus)': return 'Location nue';
    case 'Immeubles locatifs (LMNP)': return 'Location meublée non professionnelle (LMNP)';
    case 'Immeubles locatifs (LMP)': return 'Location meublée professionnelle (LMP)';
    default: return undefined;
  }
};
