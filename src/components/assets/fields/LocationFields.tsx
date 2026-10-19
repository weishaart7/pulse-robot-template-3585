import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { AssetFormValues } from '@/schemas/assetSchema';
import { TypeLocation, regimesPour, typesLocationPour } from '@/schemas/immobilierPropertySchema';

interface LocationFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  /** Création : loyer mensuel en plus, enregistré comme revenu du bien. */
  creation?: boolean;
}

// Location d'un bien locatif : type et régime fiscal (mêmes règles que la fiche Immobilier,
// PropertyLocationSection) et, à la création, loyer mensuel.
export const LocationFields: React.FC<LocationFieldsProps> = ({ form, creation = false }) => {
  const nature = form.watch('nature');
  const typeLocation = form.watch('type_location');
  const loyer = form.watch('loyer_mensuel');
  const typeOptions = typesLocationPour(nature);
  const regimeOptions = regimesPour(typeLocation);

  const handleTypeChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    const regime = form.getValues('regime_location');
    if (regime && !regimesPour(value as TypeLocation).includes(regime)) {
      form.setValue('regime_location', undefined, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="type_location" render={({ field }) => (
          <FormItem>
            <FormLabel>Type de location</FormLabel>
            <Select onValueChange={(v) => handleTypeChange(v, field.onChange)} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {typeLocation && (
          <FormField control={form.control} name="regime_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Régime fiscal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Sélectionner un régime" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {regimeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {creation && (
          <FormField control={form.control} name="loyer_mensuel" render={({ field }) => (
            <FormItem>
              <FormLabel>Loyer mensuel hors charges</FormLabel>
              <FieldHelp>Facultatif. Enregistré comme revenu du bien ; les autres revenus et charges se gèrent ensuite dans Immobilier → Mes biens → Revenus et charges.</FieldHelp>
              <FormControl>
                <EuroInput className="bg-background border-border shadow-none" step="0.01" min="0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      {creation && loyer !== undefined && loyer > 0 && (
        <FormField control={form.control} name="loyer_budget" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-3 space-y-0">
            <FormControl>
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            </FormControl>
            <FormLabel className="cursor-pointer">Reporter le loyer dans le budget</FormLabel>
          </FormItem>
        )} />
      )}
    </div>
  );
};

// Crédit d'une résidence ou d'un bien locatif, demandé à la création seulement : il se saisit
// ensuite dans Passifs, relié au bien, source unique pour le cashflow et les simulateurs.
export const CreditFields: React.FC<{ form: UseFormReturn<AssetFormValues> }> = ({ form }) => (
  <FormField control={form.control} name="finance_par_credit" render={({ field }) => (
    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-[2px] border border-border bg-secondary/40 px-4 py-3">
      <FormControl>
        <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
      </FormControl>
      <div className="space-y-0.5">
        <FormLabel className="cursor-pointer">Bien financé par un crédit</FormLabel>
        <p className="text-[12px] text-muted-foreground">
          Après la création, le crédit se saisit dans Patrimoine → Passifs, déjà relié à ce bien : il alimente le cashflow et les simulateurs.
        </p>
      </div>
    </FormItem>
  )} />
);
