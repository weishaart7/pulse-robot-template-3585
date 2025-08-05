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
import { Checkbox } from '@/components/ui/checkbox';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { REVENUS_CATEGORIES } from '@/constants/budgetTypes';
import { useFamilyData } from '@/hooks/useFamilyData';
import { Revenu } from '@/services/budgetService';
const formSchema = z.object({
  nature: z.string().min(1, "La nature est obligatoire"),
  libelle: z.string().min(1, "Le libellé est obligatoire"),
  beneficiaire: z.string().optional(),
  montant: z.string().optional(),
  revenu_disponible: z.boolean().default(false),
  commentaire: z.string().optional()
});
type FormData = z.infer<typeof formSchema>;
interface RevenusFormProps {
  revenu?: Revenu;
  onSubmit: (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
}
export const RevenusForm = ({
  revenu,
  onSubmit,
  onCancel
}: RevenusFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    familyMembers
  } = useFamilyData();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nature: revenu?.nature || '',
      libelle: revenu?.libelle || '',
      beneficiaire: revenu?.beneficiaire || '',
      montant: revenu?.montant?.toString() || '',
      revenu_disponible: revenu?.revenu_disponible || false,
      commentaire: revenu?.commentaire || ''
    }
  });
  const handleSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        nature: data.nature,
        libelle: data.libelle,
        beneficiaire: data.beneficiaire || '',
        montant: data.montant ? parseFloat(data.montant) : undefined,
        revenu_disponible: data.revenu_disponible,
        commentaire: data.commentaire || ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Créer une liste plate de toutes les options de revenus
  const revenus = Object.entries(REVENUS_CATEGORIES).flatMap(([category, items]) => items.map(item => `${category} - ${item}`));
  const beneficiaires = ["Moi", ...familyMembers.map(member => `${member.prenom} ${member.nom}`)];
  return <Card className="mx-[30px]">
      <CardHeader>
        <CardTitle>{revenu ? 'Modifier le revenu' : 'Ajouter un revenu'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField control={form.control} name="nature" render={({
            field
          }) => <FormItem>
                  <FormLabel>Nature du revenu</FormLabel>
                  <FormControl>
                    <SearchableSelect options={revenus} value={field.value} onChange={field.onChange} placeholder="Sélectionnez la nature du revenu..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="libelle" render={({
            field
          }) => <FormItem>
                  <FormLabel>Libellé</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="beneficiaire" render={({
            field
          }) => <FormItem>
                  <FormLabel>Bénéficiaire</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le bénéficiaire" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {beneficiaires.map(beneficiaire => <SelectItem key={beneficiaire} value={beneficiaire}>
                          {beneficiaire}
                        </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="montant" render={({
            field
          }) => <FormItem>
                  <FormLabel>Montant (€)</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" step="0.01" placeholder="0.00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="revenu_disponible" render={({
            field
          }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Revenu disponible</FormLabel>
                  </div>
                </FormItem>} />

            <FormField control={form.control} name="commentaire" render={({
            field
          }) => <FormItem>
                  <FormLabel>Commentaire</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

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
    </Card>;
};