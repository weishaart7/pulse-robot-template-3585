import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateInput } from '@/components/ui/date-input';
import { AssetCharge } from '@/services/assetService';
import { CHARGE_TYPES, DEBITEUR_OPTIONS, PERIODICITE_OPTIONS, UNITE_OPTIONS } from '@/constants/assetTypes';

const chargeSchema = z.object({
  type_charge: z.enum(['Charges courantes', 'Charges fiscales']),
  denomination: z.string().min(1, 'La dénomination est requise'),
  debiteur: z.enum(['Époux 1', 'Époux 2', 'Couple']),
  montant: z.number().min(0, 'Le montant doit être positif'),
  unite: z.enum(['€', '%']),
  periodicite: z.enum(['ponctuelle', 'annuelle', 'trimestrielle', 'mensuelle']),
  date_debut: z.date({ required_error: 'La date est requise' }),
  duree_type: z.enum(['Indéterminée', 'Jusqu\'à date', 'Pendant années']),
  duree_fin_date: z.date().optional(),
  duree_annees: z.number().optional(),
  impact_budget: z.boolean().default(false),
});

type ChargeFormValues = z.infer<typeof chargeSchema>;

interface ChargeFormProps {
  charge?: AssetCharge;
  onSubmit: (values: ChargeFormValues) => void;
  onCancel: () => void;
}

export const ChargeForm: React.FC<ChargeFormProps> = ({ charge, onSubmit, onCancel }) => {
  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: charge ? {
      type_charge: charge.type_charge,
      denomination: charge.denomination,
      debiteur: charge.debiteur,
      montant: charge.montant,
      unite: charge.unite,
      periodicite: charge.periodicite,
      date_debut: new Date(charge.date_debut),
      duree_type: charge.duree_type,
      duree_fin_date: charge.duree_fin_date ? new Date(charge.duree_fin_date) : undefined,
      duree_annees: charge.duree_annees || undefined,
      impact_budget: charge.impact_budget || false,
    } : {
      type_charge: 'Charges courantes',
      denomination: '',
      debiteur: 'Époux 1',
      montant: 0,
      unite: '€',
      periodicite: 'mensuelle',
      date_debut: new Date(),
      duree_type: 'Indéterminée',
      impact_budget: false,
    }
  });

  const dureeType = form.watch('duree_type');
  const periodicite = form.watch('periodicite');
  const isPonctuelle = periodicite === 'ponctuelle';
  const montant = form.watch('montant');
  const unite = form.watch('unite');

  const impactMensuel = (() => {
    if (!montant || montant <= 0 || unite !== '€') return null;
    switch (periodicite) {
      case 'mensuelle': return montant;
      case 'trimestrielle': return montant / 3;
      case 'annuelle': return montant / 12;
      default: return null;
    }
  })();

  const handleSubmit = (values: ChargeFormValues) => {
    const formattedValues = {
      ...values,
      date_debut: format(values.date_debut, 'yyyy-MM-dd'),
      duree_fin_date: values.duree_fin_date ? format(values.duree_fin_date, 'yyyy-MM-dd') : undefined,
    };
    onSubmit(formattedValues as any);
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{charge ? 'Modifier la charge' : 'Ajouter une charge'}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type_charge"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de charge</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHARGE_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="denomination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dénomination</FormLabel>
                    <FormControl>
                      <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DEBITEUR_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="montant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Montant</FormLabel>
                      <FormControl>
                        <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unite"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unité</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITE_OPTIONS.map((unite) => (
                            <SelectItem key={unite} value={unite}>
                              {unite}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="periodicite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Périodicité</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PERIODICITE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
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
                name="date_debut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isPonctuelle ? 'Date' : 'Date de début'}</FormLabel>
                    <FormControl>
                      <DateInput
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="jj/mm/aaaa"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {!isPonctuelle && (
            <div className="space-y-4">
              <FormItem>
                <FormLabel>Durée</FormLabel>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name="duree_fin_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground font-normal">Date de fin</FormLabel>
                          <FormControl>
                            <DateInput
                              value={field.value}
                              onChange={(date) => {
                                field.onChange(date);
                                if (date) form.setValue('duree_type', 'Jusqu\'à date');
                              }}
                              placeholder="jj/mm/aaaa"
                              disabled={dureeType === 'Indéterminée'}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant={dureeType === 'Indéterminée' ? 'default' : 'outline'}
                    onClick={() => {
                      form.setValue('duree_type', 'Indéterminée');
                      form.setValue('duree_fin_date', undefined);
                    }}
                  >
                    Durée indéterminée
                  </Button>
                </div>
              </FormItem>
            </div>
            )}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="impact_budget"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Impact sur le budget
                      </FormLabel>
                      {field.value && impactMensuel !== null && (
                        <p className="text-xs text-muted-foreground">
                          +{Math.round(impactMensuel).toLocaleString('fr-FR')} €/mois dans votre budget
                        </p>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit">
                {charge ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};