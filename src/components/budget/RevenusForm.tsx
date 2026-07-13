import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Revenu } from '@/services/budgetService';
import { REVENUS_CATEGORIES } from '@/constants/budgetCategories';
import { useFamilyData } from '@/hooks/useFamilyData';
import { useBudgetEntryForm, PERIODICITE_OPTIONS, PERIODICITE_LABELS } from '@/hooks/useBudgetEntryForm';

interface RevenusFormProps {
  revenu?: Revenu;
  onSubmit: (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  open: boolean;
}

export const RevenusForm: React.FC<RevenusFormProps> = ({ revenu, onSubmit, onCancel, open }) => {
  const { familyMembers } = useFamilyData();

  const {
    form,
    isSubmitting,
    isLibellePrefilled,
    selectedNature,
    selectedPeriodicite,
    categoryOptions: categories,
    natureOptions,
    partieOptions: beneficiaires,
    handleCategoryChange,
    handleLibelleChange,
    submit,
  } = useBudgetEntryForm<Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    entity: revenu,
    open,
    categories: REVENUS_CATEGORIES,
    partieKey: 'beneficiaire',
    formName: 'budget_revenus',
    buildSubmitPayload: (f) => ({
      nature: f.nature,
      libelle: f.libelle,
      beneficiaire: f.partie,
      montant: f.montant,
      revenu_disponible: false,
      periodicite: f.periodicite,
      date_debut: f.date_debut,
      date_fin: f.date_fin,
      jour_fixe: f.jour_fixe,
      commentaire: f.commentaire,
    }),
    onSubmit,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onCancel();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{revenu ? 'Modifier le revenu' : 'Ajouter un revenu'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="categorie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Catégorie</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={handleCategoryChange(field.onChange)}>
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
                  <FormLabel>Nature du revenu</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner une nature" />
                      </SelectTrigger>
                      <SelectContent>
                        {natureOptions.map((nature) => (
                          <SelectItem key={nature} value={nature}>
                            {nature}
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
              name="libelle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Saisissez le libellé"
                      className={isLibellePrefilled && field.value === selectedNature ? "text-muted-foreground/50" : ""}
                      onChange={handleLibelleChange(field.onChange)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="partie"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Bénéficiaire</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionnez le bénéficiaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beneficiaires.map((beneficiaire) => (
                        <SelectItem key={beneficiaire} value={beneficiaire}>
                          {beneficiaire}
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
              name="periodicite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Périodicité</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger size="lg">
                        <SelectValue placeholder="Sélectionner la périodicité" />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIODICITE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
              name="montant"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Montant {PERIODICITE_LABELS[selectedPeriodicite] || 'mensuel'} (€)
                  </FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_fin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de fin (optionnel)</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="jour_fixe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jour fixe du mois (optionnel)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min="1" max="31" placeholder="ex: 15" />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">Pour les prélèvements à date fixe (1-31)</p>
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
