import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ASSET_NATURE_OPTIONS } from '@/constants/assetTypes';
import { AssetFormValues } from '@/schemas/assetSchema';

interface WizardStep1QuoiProps {
  form: UseFormReturn<AssetFormValues>;
}

// Étape 1 — "Quoi" : identique aux 4 premiers champs de l'onglet "Essentiel"
// de AssetForm.tsx (hors blocs de calcul, affichés aux étapes 2 et 3).
export const WizardStep1Quoi: React.FC<WizardStep1QuoiProps> = ({ form }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField control={form.control} name="nature" render={({ field }) => (
        <FormItem>
          <FormLabel>Nature *</FormLabel>
          <FormControl>
            <SearchableSelect options={ASSET_NATURE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Choisir une nature" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="denomination" render={({ field }) => (
        <FormItem>
          <FormLabel>Dénomination</FormLabel>
          <FormControl>
            <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField control={form.control} name="valeur_estimee" render={({ field }) => (
        <FormItem>
          <FormLabel>Valeur actuelle estimée (€)</FormLabel>
          <FormDescription>Valeur du bien à ce jour. C'est elle qui est utilisée dans le calcul du patrimoine.</FormDescription>
          <FormControl>
            <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
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
  </div>
);
