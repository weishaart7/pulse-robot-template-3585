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
  'Autres immeubles de rapport',
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
