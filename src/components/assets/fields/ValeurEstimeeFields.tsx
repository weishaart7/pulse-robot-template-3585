import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EuroInput } from '@/components/ui/euro-input';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FieldHelp } from '@/components/ui/field-help';
import { NATURE_PREVOYANCE_RACHETABLE, isCreance, isPrevoyanceDeces } from '@/constants/assetTypes';

interface ValeurEstimeeFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

// Valeur actuelle estimée + date d'estimation : bloc partagé entre l'onglet
// "Essentiel" de AssetForm.tsx et le wizard de création, pour pouvoir le
// déplacer d'une étape à l'autre sans dupliquer le balisage.
//
// Contrat de prévoyance : le capital garanti (transmis au décès) est demandé ici, en tête.
// La valeur devient la valeur de rachat pour un contrat vie entière ; elle est fixée à 0,
// non modifiable, pour les autres (aucune valeur de rachat).
export const ValeurEstimeeFields: React.FC<ValeurEstimeeFieldsProps> = ({ form }) => {
  const watchedNature = form.watch('nature');
  const isPrevoyance = isPrevoyanceDeces(watchedNature);
  const sansRachat = isPrevoyance && watchedNature !== NATURE_PREVOYANCE_RACHETABLE;

  useEffect(() => {
    if (sansRachat && form.getValues('valeur_estimee') !== 0) form.setValue('valeur_estimee', 0);
  }, [sansRachat, form]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {isPrevoyance && (
        <FormField control={form.control} name="capital_garanti" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Capital garanti</FormLabel>
            <FieldHelp>
              Capital versé au décès aux bénéficiaires de la clause. La clause et les primes versées
              se renseignent ensuite dans Transmission → Assurance-vie.
            </FieldHelp>
            <FormControl>
              <EuroInput
                className="bg-background border-border shadow-none"
                type="number"
                step="0.01"
                {...field}
                value={field.value ?? ''}
                onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      )}

      <FormField control={form.control} name="valeur_estimee" render={({ field }) => (
        <FormItem>
          <FormLabel>{isPrevoyance && !sansRachat ? 'Valeur de rachat' : isCreance(watchedNature) ? 'Montant restant dû' : 'Valeur actuelle estimée'}</FormLabel>
          <FieldHelp>
            {isCreance(watchedNature)
              ? 'Somme encore due à ce jour, intérêts échus compris. C\'est elle qui est utilisée dans le calcul du patrimoine.'
              : sansRachat
              ? "Ce contrat n'a pas de valeur de rachat : il compte pour 0 dans le patrimoine."
              : isPrevoyance
                ? 'Montant récupérable en cas de rachat, à ce jour. C\'est lui qui est utilisé dans le calcul du patrimoine.'
                : 'Valeur du bien à ce jour. C\'est elle qui est utilisée dans le calcul du patrimoine.'}
          </FieldHelp>
          <FormControl>
            <EuroInput className="bg-background border-border shadow-none" type="number" step="0.01" disabled={sansRachat} {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="date_estimation" render={({ field }) => (
        <FormItem>
          <FormLabel>Date d'estimation</FormLabel>
          <FormControl>
            <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  );
};
