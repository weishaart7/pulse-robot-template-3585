import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { CHARGES_CATEGORIES, DEBITEUR_OPTIONS } from '@/constants/budgetTypes';
import { Charge } from '@/services/budgetService';

const formSchema = z.object({
  nature: z.string().min(1, "La nature est obligatoire"),
  libelle: z.string().min(1, "Le libellé est obligatoire"),
  debiteur: z.string().optional(),
  montant: z.string().optional(),
  commentaire: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

interface ChargesFormProps {
  charge?: Charge;
  onSubmit: (data: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}

export const ChargesForm = ({ charge, onSubmit, onCancel }: ChargesFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nature: charge?.nature || '',
      libelle: charge?.libelle || '',
      debiteur: charge?.debiteur || '',
      montant: charge?.montant?.toString() || '',
      commentaire: charge?.commentaire || ''
    }
  });

  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        nature: data.nature,
        libelle: data.libelle,
        debiteur: data.debiteur || '',
        montant: data.montant ? parseFloat(data.montant) : undefined,
        commentaire: data.commentaire || ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Créer une liste plate de toutes les options de charges
  const charges = Object.entries(CHARGES_CATEGORIES).flatMap(([category, items]) =>
    items.map(item => `${category} - ${item}`)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{charge ? 'Modifier la charge' : 'Ajouter une charge'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="nature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nature de la charge</FormLabel>
                  <FormControl>
                    <SearchableSelect
                      options={charges}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Sélectionnez la nature de la charge..."
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
                  <FormLabel>Débiteur</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le débiteur" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEBITEUR_OPTIONS.map((debiteur) => (
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
                    <Input 
                      {...field} 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00"
                    />
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
      </CardContent>
    </Card>
  );
};