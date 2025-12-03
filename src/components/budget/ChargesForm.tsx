import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Charge } from '@/services/budgetService';
import { CHARGES_CATEGORIES, getNaturesByCategory } from '@/constants/budgetCategories';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { useSecureForm } from '@/hooks/useSecureForm';
import { useAuth } from '@/contexts/AuthContext';
import { sanitizeTextInput, sanitizeNumericInput } from '@/lib/security';

const formSchema = z.object({
  categorie: z.string().min(1, "La catégorie est requise"),
  nature: z.string().min(1, "La nature est requise"),
  libelle: z.string().min(1, "Le libellé est requis"),
  debiteur: z.string().optional(),
  montant: z.string().min(1, "Le montant est requis"),
  commentaire: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ChargesFormProps {
  charge?: Charge;
  onSubmit: (data: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  open: boolean;
  displayMode: 'annuel' | 'mensuel';
}

export const ChargesForm: React.FC<ChargesFormProps> = ({ charge, onSubmit, onCancel, open, displayMode }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLibellePrefilled, setIsLibellePrefilled] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { user } = useAuth();
  const { submitSecureForm } = useSecureForm({ 
    formName: 'budget_charges',
    enableRateLimit: true,
    maxAttempts: 10,
    windowMs: 60000
  });

  // Convertir le montant pour l'affichage selon le mode
  const getDisplayMontant = useCallback((montantAnnuel: number | null | undefined) => {
    if (!montantAnnuel) return "";
    return displayMode === 'mensuel' ? (montantAnnuel / 12).toFixed(2) : montantAnnuel.toString();
  }, [displayMode]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categorie: charge ? Object.keys(CHARGES_CATEGORIES).find(cat => 
        getNaturesByCategory(CHARGES_CATEGORIES, cat).includes(charge.nature)
      ) || "" : "",
      nature: charge?.nature || "",
      libelle: charge?.libelle || "",
      debiteur: charge?.debiteur || "",
      montant: getDisplayMontant(charge?.montant),
      commentaire: charge?.commentaire || "",
    },
  });

  const selectedCategory = form.watch("categorie");
  const selectedNature = form.watch("nature");
  
  const availableNatures = useMemo(() => {
    if (!selectedCategory) return [];
    return getNaturesByCategory(CHARGES_CATEGORIES, selectedCategory);
  }, [selectedCategory]);

  // Pré-remplir le libellé avec la nature sélectionnée
  useEffect(() => {
    if (selectedNature && !form.getValues("libelle")) {
      form.setValue("libelle", selectedNature);
      setIsLibellePrefilled(true);
    }
  }, [selectedNature, form]);

  const debiteurs = useMemo(() => {
    const userFullName = familyProfile?.prenom && familyProfile?.nom 
      ? `${familyProfile.prenom} ${familyProfile.nom}` 
      : "Moi";

    const statut = maritalStatus?.statut_couple || "";
    const hasSpouse = ["Marié(e)", "Pacsé(e)", "Concubinage"].includes(statut);

    if (!hasSpouse) return [userFullName];

    const spouseFullName = maritalStatus?.prenom_conjoint && maritalStatus?.nom_conjoint
      ? `${maritalStatus.prenom_conjoint} ${maritalStatus.nom_conjoint}`
      : "Conjoint";

    return [userFullName, spouseFullName, "Le couple"];
  }, [familyProfile, maritalStatus]);

  // Réinitialiser le formulaire quand le dialogue s'ouvre/ferme
  useEffect(() => {
    if (open && !charge) {
      // Réinitialiser pour une nouvelle charge
      form.reset({
        categorie: "",
        nature: "",
        libelle: "",
        debiteur: "",
        montant: "",
        commentaire: "",
      });
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
    } else if (open && charge) {
      // Charger les données existantes pour modification
      form.reset({
        categorie: Object.keys(CHARGES_CATEGORIES).find(cat => 
          getNaturesByCategory(CHARGES_CATEGORIES, cat).includes(charge.nature)
        ) || "",
        nature: charge.nature || "",
        libelle: charge.libelle || "",
        debiteur: charge.debiteur || "",
        montant: getDisplayMontant(charge.montant),
        commentaire: charge.commentaire || "",
      });
      setIsLibellePrefilled(false);
      setIsSubmitting(false);
    } else if (!open) {
      // Nettoyer complètement quand le Dialog se ferme
      setIsSubmitting(false);
      setIsLibellePrefilled(false);
    }
  }, [open, charge, form, getDisplayMontant]);

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Convertir le montant saisi en montant annuel pour le stockage
      const montantSaisi = sanitizeNumericInput(data.montant) || 0;
      const montantAnnuel = displayMode === 'mensuel' ? montantSaisi * 12 : montantSaisi;
      
      const formData = {
        nature: sanitizeTextInput(data.nature),
        libelle: sanitizeTextInput(data.libelle),
        debiteur: sanitizeTextInput(data.debiteur),
        montant: montantAnnuel,
        commentaire: sanitizeTextInput(data.commentaire),
      };

      const success = await submitSecureForm(
        formData,
        async (sanitizedData) => {
          await onSubmit(sanitizedData);
        },
        user?.id
      );

      if (success) {
        form.reset();
        onCancel(); // Close form on success
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Préparer les options pour les selects
  const categories = Object.keys(CHARGES_CATEGORIES).map(cat => ({
    value: cat,
    label: cat
  }));

  const natureOptions = availableNatures;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()} modal={true}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{charge ? 'Modifier la charge' : 'Ajouter une charge'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="categorie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Catégorie</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={(value) => {
                      field.onChange(value);
                      form.setValue("nature", ""); // Reset nature when category changes
                    }}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nature de la charge</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={natureOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionner une nature"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="libelle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Saisissez le libellé" 
                      className={isLibellePrefilled && field.value === selectedNature ? "text-muted-foreground/50" : ""}
                      onChange={(e) => {
                        field.onChange(e);
                        setIsLibellePrefilled(false);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="debiteur"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Débiteur</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionnez le débiteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {debiteurs.map((debiteur) => (
                        <SelectItem key={debiteur} value={debiteur}>
                          {debiteur}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant {displayMode === 'mensuel' ? 'mensuel' : 'annuel'} (€)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="commentaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};