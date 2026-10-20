import * as z from 'zod';

// Schema unifié pour le formulaire fusionné emprunt/passif (point 1). Comme
// assetSchema.ts, les champs conditionnels restent optionnels côté Zod : le
// caractère requis est porté par l'UI (attribut required / bouton disabled),
// pas par une validation stricte ici. Seules des bornes de cohérence sont
// imposées (montants ≥ 0, taux et quotités entre 0 et 100) : un montant
// négatif augmenterait silencieusement le patrimoine net. Mêmes bornes en base
// (migration 20261007110000_bornes_passifs_emprunts.sql).
// Une colonne facultative vide arrive de la base à null : elle vaut « non renseigné », comme undefined
// (sans quoi la modification d'un emprunt dont un champ facultatif est vide échouait sans message).
const facultatif = <T extends z.ZodTypeAny>(schema: T) => z.preprocess((v) => (v === null ? undefined : v), schema.optional());
const montant = facultatif(z.number().min(0, 'Le montant ne peut pas être négatif'));
const pourcentage = facultatif(z.number().min(0, 'Minimum 0 %').max(100, 'Maximum 100 %'));
export const passifEmpruntSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  libelle: z.string().optional(),
  date_souscription: z.string().optional(),
  montant_du: montant,
  capital_restant_du: montant,
  taux_interet: pourcentage,
  mensualite: montant,
  duree_restante: facultatif(z.number().int('Nombre de mois entier').min(0, 'La durée ne peut pas être négative')),
  reporter_budget: z.boolean().optional(),
  detenteur: z.string().optional(),
  contributeur_remboursement: z.enum(['utilisateur', 'conjoint', 'les_deux']).optional(),
  pourcentage_utilisateur: pourcentage,
  pourcentage_conjoint: pourcentage,
  qualification_bien: z.string().optional(),
  qualification_auto: z.boolean().optional(),
  asset_id: z.string().optional(),
  type_garantie: z.enum(['Hypothèque', 'Caution', 'Nantissement', 'Aucune']).optional(),
  assure: z.boolean().optional(),
  quotite_assuree_utilisateur: pourcentage,
  quotite_assuree_conjoint: pourcentage,
  capital_garanti_deces: montant,
  mode_amortissement: z.enum(['Amortissable', 'In fine']).optional(),
  type_taux: z.enum(['Fixe', 'Variable', 'Mixte']).optional(),
  taeg: pourcentage,
  cout_total_credit: montant,
  // Données d'origine du contrat (tableau d'amortissement, cf. src/lib/credit/contrat.ts).
  capital_initial: montant,
  date_premiere_echeance: z.string().optional(),
  duree_totale_mois: facultatif(z.number().int('Nombre de mois entier').min(1, 'Au moins 1 mois')),
  differe_mois: facultatif(z.number().int('Nombre de mois entier').min(0, 'La durée ne peut pas être négative')),
  differe_type: z.enum(['partiel', 'total']).optional(),
  assurance_mode: z.enum(['taux_capital_initial', 'taux_crd', 'montant']).optional(),
  assurance_valeur: montant,
  frais_dossier: montant,
  frais_garantie: montant,
}).refine(
  (v) => v.differe_mois == null || v.duree_totale_mois == null || v.differe_mois < v.duree_totale_mois,
  { message: 'Le différé doit être plus court que la durée totale', path: ['differe_mois'] },
);

export type PassifEmpruntFormValues = z.infer<typeof passifEmpruntSchema>;

export const getDefaultPassifEmpruntValues = (): PassifEmpruntFormValues => ({
  nature: '',
  libelle: '',
  date_souscription: '',
  detenteur: '',
  contributeur_remboursement: undefined,
  pourcentage_utilisateur: 50,
  pourcentage_conjoint: 50,
  qualification_auto: true,
  reporter_budget: true,
  type_garantie: 'Aucune',
  assure: false,
  mode_amortissement: 'Amortissable',
  type_taux: 'Fixe',
});
