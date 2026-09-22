import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { DateInput } from '@/components/ui/date-input';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FieldHelp } from '@/components/ui/field-help';

interface ValeurEstimeeFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

// Valeur actuelle estimée + date d'estimation : bloc partagé entre l'onglet
// "Essentiel" de AssetForm.tsx et le wizard de création, pour pouvoir le
// déplacer d'une étape à l'autre sans dupliquer le balisage.
export const ValeurEstimeeFields: React.FC<ValeurEstimeeFieldsProps> = ({ form }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <FormField control={form.control} name="valeur_estimee" render={({ field }) => (
      <FormItem>
        <FormLabel>Valeur actuelle estimée (€)</FormLabel>
        <FieldHelp>Valeur du bien à ce jour. C'est elle qui est utilisée dans le calcul du patrimoine.</FieldHelp>
        <FormControl>
          <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" step="0.01" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
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
