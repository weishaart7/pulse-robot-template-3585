import React, { useState, useMemo } from 'react';
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
}

export const ChargesForm: React.FC<ChargesFormProps> = ({ charge, onSubmit, onCancel, open }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categorie: charge ? Object.keys(CHARGES_CATEGORIES).find(cat => 
        getNaturesByCategory(CHARGES_CATEGORIES, cat).includes(charge.nature)
      ) || "" : "",
      nature: charge?.nature || "",
      libelle: charge?.libelle || "",
      debiteur: charge?.debiteur || "",
      montant: charge?.montant?.toString() || "",
      commentaire: charge?.commentaire || "",
    },
  });

  const selectedCategory = form.watch("categorie");
  
  const availableNatures = useMemo(() => {
    if (!selectedCategory) return [];
    return getNaturesByCategory(CHARGES_CATEGORIES, selectedCategory);
  }, [selectedCategory]);

  // Options pour la recherche - inclut toutes les natures si une recherche est en cours
  const natureOptionsForSearch = useMemo(() => {
    const categoryNatures = availableNatures;
    const allNatures = Object.values(CHARGES_CATEGORIES).flat();
    
    // Si pas de catégorie sélectionnée, retourner toutes les natures
    if (!selectedCategory) {
      return allNatures;
    }
    
    // Si catégorie sélectionnée, commencer par les natures de la catégorie
    // mais permettre la recherche dans toutes les natures
    return categoryNatures.length > 0 ? [...new Set([...categoryNatures, ...allNatures])] : allNatures;
  }, [selectedCategory, availableNatures]);

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

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        nature: data.nature,
        libelle: data.libelle,
        debiteur: data.debiteur,
        montant: parseFloat(data.montant),
        commentaire: data.commentaire,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Préparer les options pour les selects
  const categories = Object.keys(CHARGES_CATEGORIES).map(cat => ({
    value: cat,
    label: cat
  }));

  const natureOptions = useMemo(() => {
    const categoryNatures = availableNatures;
    const allNatures = Object.values(CHARGES_CATEGORIES).flat();
    
    // Si pas de catégorie sélectionnée, retourner toutes les natures
    if (!selectedCategory) {
      return allNatures;
    }
    
    // Si catégorie sélectionnée, commencer par les natures de la catégorie
    // mais permettre la recherche dans toutes les natures
    return categoryNatures.length > 0 ? [...new Set([...categoryNatures, ...allNatures])] : allNatures;
  }, [selectedCategory, availableNatures]);

  return (
    <Dialog open={open} onOpenChange={onCancel}>
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
                    <Input {...field} />
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
                  <FormLabel>Montant (€)</FormLabel>
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