import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getNaturesByCategory } from '@/constants/budgetCategories';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeTextInput, sanitizeNumericInput } from '@/lib/security';

// Logique partagée par RevenusForm.tsx et ChargesForm.tsx : configuration
// React Hook Form + Zod, sanitation, intégration useSecureForm, options de
// catégorie/nature/bénéficiaire-débiteur et logique de soumission/reset.
// Ce qui reste spécifique à chaque formulaire (nom du champ bénéficiaire vs
// débiteur, catégories disponibles, champs additionnels comme
// revenu_disponible) reste dans RevenusForm.tsx/ChargesForm.tsx.

export const PERIODICITE_OPTIONS = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
  { value: 'ponctuel', label: 'Ponctuel' },
];

export const PERIODICITE_LABELS: Record<string, string> = {
  'mensuel': 'mensuel',
  'trimestriel': 'trimestriel',
  'semestriel': 'semestriel',
  'annuel': 'annuel',
  'ponctuel': 'ponctuel',
};

const budgetEntryFormSchema = z.object({
  categorie: z.string().min(1, "La catégorie est requise"),
  nature: z.string().min(1, "La nature est requise"),
  libelle: z.string().min(1, "Le libellé est requis"),
  partie: z.string().optional(),
  montant: z.string().min(1, "Le montant est requis"),
  periodicite: z.string().default('mensuel'),
  date_debut: z.string().optional(),
  date_fin: z.string().optional(),
  jour_fixe: z.string().optional(),
  commentaire: z.string().optional(),
});

export type BudgetEntryFormData = z.infer<typeof budgetEntryFormSchema>;

export type BudgetCategories = Record<string, readonly string[]>;

// Sous-ensemble commun aux entités Revenu/Charge (les champs beneficiaire/
// debiteur sont lus dynamiquement via partieKey, pas déclarés ici).
export interface BudgetEntryLike {
  nature?: string;
  libelle?: string;
  montant?: number;
  periodicite?: string;
  date_debut?: string;
  date_fin?: string;
  jour_fixe?: number;
  commentaire?: string;
  beneficiaire?: string;
  debiteur?: string;
}

// Champs communs, déjà sanitizés, transmis à buildSubmitPayload pour que
// chaque formulaire construise son objet final typé (Revenu ou Charge).
export interface SanitizedBudgetEntryFields {
  nature: string;
  libelle: string;
  partie: string;
  montant: number;
  periodicite: string;
  date_debut: string | null;
  date_fin: string | null;
  jour_fixe: number | null;
  commentaire: string;
}

interface UseBudgetEntryFormOptions<TPayload extends Record<string, unknown>> {
  entity?: BudgetEntryLike;
  open: boolean;
  categories: BudgetCategories;
  partieKey: 'beneficiaire' | 'debiteur';
  formName: string;
  buildSubmitPayload: (fields: SanitizedBudgetEntryFields) => TPayload;
  onSubmit: (data: TPayload) => Promise<void>;
}

const buildDefaultValues = (
  categories: BudgetCategories,
  partieKey: 'beneficiaire' | 'debiteur',
  entity?: BudgetEntryLike
): BudgetEntryFormData => ({
  categorie: entity
    ? Object.keys(categories).find(cat =>
        getNaturesByCategory(categories, cat).includes(entity.nature || '')
      ) || ""
    : "",
  nature: entity?.nature || "",
  libelle: entity?.libelle || "",
  partie: entity?.[partieKey] || "",
  montant: entity?.montant?.toString() || "",
  periodicite: entity?.periodicite || "mensuel",
  date_debut: entity?.date_debut || "",
  date_fin: entity?.date_fin || "",
  jour_fixe: entity?.jour_fixe?.toString() || "",
  commentaire: entity?.commentaire || "",
});

export function useBudgetEntryForm<TPayload extends Record<string, unknown>>({
  entity,
  open,
  categories,
  partieKey,
  formName,
  buildSubmitPayload,
  onSubmit,
}: UseBudgetEntryFormOptions<TPayload>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLibellePrefilled, setIsLibellePrefilled] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { user } = useAuth();
  const { submitSecureForm } = useSecureForm({
    formName,
    enableRateLimit: true,
    maxAttempts: 10,
    windowMs: 60000
  });

  const form = useForm<BudgetEntryFormData>({
    resolver: zodResolver(budgetEntryFormSchema),
    defaultValues: buildDefaultValues(categories, partieKey, entity),
  });

  const selectedCategory = form.watch("categorie");
  const selectedNature = form.watch("nature");
  const selectedPeriodicite = form.watch("periodicite");

  const natureOptions = useMemo(() => {
    if (!selectedCategory) return [];
    return getNaturesByCategory(categories, selectedCategory);
  }, [categories, selectedCategory]);

  // Pré-remplir le libellé avec la nature sélectionnée
  useEffect(() => {
    if (selectedNature && !form.getValues("libelle")) {
      form.setValue("libelle", selectedNature);
      setIsLibellePrefilled(true);
    }
  }, [selectedNature, form]);

  const partieOptions = useMemo(() => {
    const userFullName = familyProfile?.prenom && familyProfile?.nom
      ? `${familyProfile.prenom} ${familyProfile.nom}`
      : "Moi";

    const statut = maritalStatus?.statut_couple || "";
    const hasSpouse = ["Marié(e)", "Pacsé(e)", "Concubinage"].includes(statut);

    if (!hasSpouse) {
      return [userFullName];
    }

    const spouseFullName = maritalStatus?.prenom_conjoint && maritalStatus?.nom_conjoint
      ? `${maritalStatus.prenom_conjoint} ${maritalStatus.nom_conjoint}`
      : "Conjoint";

    return [userFullName, spouseFullName, "Le couple"];
  }, [familyProfile, maritalStatus]);

  // Réinitialiser le formulaire quand le dialogue s'ouvre/ferme
  useEffect(() => {
    if (open && !entity) {
      form.reset(buildDefaultValues(categories, partieKey, undefined));
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
    } else if (open && entity) {
      form.reset(buildDefaultValues(categories, partieKey, entity));
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
    } else if (!open) {
      setIsSubmitting(false);
      setIsLibellePrefilled(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entity, form]);

  const categoryOptions = useMemo(
    () => Object.keys(categories).map(cat => ({ value: cat, label: cat })),
    [categories]
  );

  const handleCategoryChange = (onChange: (value: string) => void) => (value: string) => {
    onChange(value);
    form.setValue("nature", "");
  };

  const handleLibelleChange = (onChange: (e: React.ChangeEvent<HTMLInputElement>) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e);
      setIsLibellePrefilled(false);
    };

  const submit = form.handleSubmit(async (data) => {
    setIsSubmitting(true);
    try {
      // Le montant est stocké tel quel, dans sa périodicité native
      const fields: SanitizedBudgetEntryFields = {
        nature: sanitizeTextInput(data.nature),
        libelle: sanitizeTextInput(data.libelle),
        partie: sanitizeTextInput(data.partie),
        montant: sanitizeNumericInput(data.montant) || 0,
        periodicite: data.periodicite || 'mensuel',
        date_debut: data.date_debut || null,
        date_fin: data.date_fin || null,
        jour_fixe: data.jour_fixe ? parseInt(data.jour_fixe) : null,
        commentaire: sanitizeTextInput(data.commentaire),
      };

      const formData = buildSubmitPayload(fields);

      const success = await submitSecureForm(
        formData,
        async (sanitizedData) => {
          await onSubmit(sanitizedData);
        },
        user?.id
      );

      if (success) {
        form.reset();
      }
    } finally {
      setIsSubmitting(false);
    }
  });

  return {
    form,
    isSubmitting,
    isLibellePrefilled,
    selectedNature,
    selectedPeriodicite,
    categoryOptions,
    natureOptions,
    partieOptions,
    handleCategoryChange,
    handleLibelleChange,
    submit,
  };
}
