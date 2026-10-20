import * as z from 'zod';

// Schema for property form validation
export const immobilierPropertySchema = z.object({
  typologie_bien: z.enum(['Appartement', 'Maison', 'Parking', 'Garage', 'Box', 'Bureau', 'Commerce', "Local d'activité", 'Entrepôt', 'Cabinet']).nullable().optional(),
  surface_m2: z.number().min(0).optional().or(z.literal('')),
  date_acquisition: z.date().optional(),
  valeur_estimee: z.number().min(0).optional().or(z.literal('')),
  statut_bien: z.enum(['Usage personnel', 'En rénovation', 'En vente']).nullable().optional(),
  montant_immeuble: z.number().min(0).optional().or(z.literal('')),
  frais_agence: z.number().min(0).optional().or(z.literal('')),
  frais_notaire: z.number().min(0).optional().or(z.literal('')),
  travaux_renovation: z.number().min(0).optional().or(z.literal('')),
  travaux_construction: z.number().min(0).optional().or(z.literal('')),
  meubles: z.number().min(0).optional().or(z.literal('')),
  type_location: z.enum(['Location nue', 'Location meublée non professionnelle (LMNP)', 'Location meublée professionnelle (LMP)']).nullable().optional(),
  regime_location: z.enum(['Micro-foncier', 'Réel', 'Micro-BIC', 'BIC']).nullable().optional(),
});

export type ImmobilierPropertyFormValues = z.infer<typeof immobilierPropertySchema>;

// Property type classifications
export const RESIDENCE_TYPES = ['Résidence principale', 'Résidences secondaires'];

export const RENTAL_PROPERTY_TYPES = [
  'Immeubles locatifs (loués nus)',
  'Immeubles locatifs (meublés)',
  'Immeubles professionnels (hors LMP)',
  'Parking / Garage / Box'
];

export const isResidenceType = (nature: string | null | undefined): boolean => {
  return nature ? RESIDENCE_TYPES.includes(nature) : false;
};

export const isRentalPropertyType = (nature: string | null | undefined): boolean => {
  return nature ? RENTAL_PROPERTY_TYPES.includes(nature) : false;
};

export const NATURE_STATIONNEMENT = 'Parking / Garage / Box';
export const NATURE_LOUES_NUS = 'Immeubles locatifs (loués nus)';
/** Bureau, commerce, local d'activité : loué nu (bail commercial ou professionnel, revenus fonciers),
 *  jamais en LMNP / LMP, statut réservé aux locaux d'habitation. */
export const NATURE_LOCAL_PRO = 'Immeubles professionnels (hors LMP)';
/** Natures toujours louées nues : le type de location n'est pas proposé, seul le régime l'est. */
export const toujoursLoueNu = (nature: string | null | undefined): boolean =>
  nature === NATURE_LOUES_NUS || nature === NATURE_LOCAL_PRO;
/** Poste « Meubles » du coût de revient : biens locatifs, hors locaux professionnels. */
export const avecPosteMeubles = (nature: string | null | undefined): boolean =>
  isRentalPropertyType(nature) && nature !== NATURE_LOCAL_PRO;
/** LMNP et LMP ne sont pas des natures mais le statut du loueur (art. 155 IV CGI), porté par
 *  type_location : une seule nature pour les meublés. */
export const NATURE_MEUBLE = 'Immeubles locatifs (meublés)';
export const TYPE_LMNP = 'Location meublée non professionnelle (LMNP)';
export const TYPE_LMP = 'Location meublée professionnelle (LMP)';

export const estMeuble = (nature: string | null | undefined): boolean => nature === NATURE_MEUBLE;
/** Bien meublé sous statut LMP (sinon LMNP, statut par défaut). */
export const estLMP = (asset: { nature?: string | null; type_location?: string | null }): boolean =>
  estMeuble(asset.nature) && asset.type_location === TYPE_LMP;

/** Natures qui demandent l'usage (loué ou non) : un parking peut être personnel, un local
 *  professionnel occupé pour sa propre activité. Usage déduit de type_location (aucune colonne). */
export const avecQuestionUsage = (nature: string | null | undefined): boolean =>
  nature === NATURE_STATIONNEMENT || nature === 'Immeubles professionnels (hors LMP)';

/** Bien saisi en location : nature locative, et pour un parking ou un local professionnel,
 *  usage « Loué » déclaré. */
export const estEnLocation = (values: { nature?: string | null; usage_loue?: boolean }): boolean =>
  isRentalPropertyType(values.nature) && (!avecQuestionUsage(values.nature) || !!values.usage_loue);

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

// Types de location possibles selon la nature : « loués nus » toujours en location nue (choix
// masqué), meublés en LMNP ou LMP (le choix devient le statut), autres natures nues ou meublées.
export const typesLocationPour = (nature: string | null | undefined): TypeLocation[] =>
  toujoursLoueNu(nature) ? ['Location nue']
    : estMeuble(nature) ? [TYPE_LMNP, TYPE_LMP]
    : TYPE_LOCATION_OPTIONS;

// Type proposé d'office à la création, quand la nature le désigne.
export const typeLocationParDefaut = (nature: string | null | undefined): TypeLocation | undefined => {
  switch (nature) {
    case 'Immeubles locatifs (loués nus)': return 'Location nue';
    case NATURE_MEUBLE: return TYPE_LMNP;
    case NATURE_LOCAL_PRO: return 'Location nue';
    default: return undefined;
  }
};

/** Prix au m² arrondi à l'euro, ou null sans valeur ni surface. */
export const prixAuM2 = (valeur: number | string | null | undefined, surface: number | string | null | undefined): number | null => {
  const v = Number(valeur), s = Number(surface);
  return v > 0 && s > 0 ? Math.round(v / s) : null;
};

/** Typologies proposées selon la nature : un stationnement n'est ni un appartement ni une maison. */
export const typologiesPourNature = (nature: string | null | undefined): readonly string[] =>
  nature === 'Parking / Garage / Box' ? ['Parking', 'Garage', 'Box']
    : nature === NATURE_LOCAL_PRO ? ['Bureau', 'Commerce', "Local d'activité", 'Entrepôt', 'Cabinet']
    : ['Appartement', 'Maison'];
