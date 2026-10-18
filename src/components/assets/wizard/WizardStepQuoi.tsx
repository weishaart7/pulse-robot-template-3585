import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NaturePicker } from '@/components/assets/NaturePicker';
import { AssetFormValues } from '@/schemas/assetSchema';

interface WizardStepQuoiProps {
  form: UseFormReturn<AssetFormValues>;
}

// Étape "Le bien" : nature et dénomination. La valeur estimée est demandée à
// l'étape "Valeur", avec la plus-value et la valorisation démembrée.
export const WizardStepQuoi: React.FC<WizardStepQuoiProps> = ({ form }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField control={form.control} name="nature" render={({ field }) => (
        <FormItem>
          <FormLabel>Nature *</FormLabel>
          <FormControl>
            <NaturePicker value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="denomination" render={({ field }) => (
        <FormItem>
          <FormLabel>Dénomination</FormLabel>
          <FormControl>
            <Input className="bg-background border-border shadow-none" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>
  </div>
);
