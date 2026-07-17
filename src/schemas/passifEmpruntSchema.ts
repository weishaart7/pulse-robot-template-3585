import * as z from 'zod';

// Schema unifié pour le formulaire fusionné emprunt/passif (point 1). Comme
// assetSchema.ts, les champs conditionnels restent optionnels côté Zod : le
// caractère requis est porté par l'UI (attribut required / bouton disabled),
// pas par une validation stricte ici.
export const passifEmpruntSchema = z.object({
  nature: z.string().min(1, 'La nature est requise'),
  libelle: z.string().optional(),
  montant_du: z.number().optional(),
  capital_restant_du: z.number().optional(),
  taux_interet: z.number().optional(),
  mensualite: z.number().optional(),
  duree_restante: z.number().optional(),
  reporter_budget: z.boolean().optional(),
  detenteur: z.string().optional(),
  pourcentage_utilisateur: z.number().optional(),
  pourcentage_conjoint: z.number().optional(),
  qualification_bien: z.string().optional(),
  qualification_auto: z.boolean().optional(),
  asset_id: z.string().optional(),
  type_garantie: z.enum(['Hypothèque', 'Caution', 'Nantissement', 'Aucune']).optional(),
  assure: z.boolean().optional(),
  quotite_assuree_utilisateur: z.number().optional(),
  quotite_assuree_conjoint: z.number().optional(),
  capital_garanti_deces: z.number().optional(),
});

export type PassifEmpruntFormValues = z.infer<typeof passifEmpruntSchema>;

export const getDefaultPassifEmpruntValues = (): PassifEmpruntFormValues => ({
  nature: '',
  libelle: '',
  detenteur: '',
  pourcentage_utilisateur: 50,
  pourcentage_conjoint: 50,
  qualification_auto: true,
  reporter_budget: false,
  type_garantie: 'Aucune',
  assure: false,
});
