import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PanelSection } from './PanelSection';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

type TypeLocation = NonNullable<ImmobilierPropertyFormValues['type_location']>;
type RegimeLocation = NonNullable<ImmobilierPropertyFormValues['regime_location']>;

const TYPE_LOCATION_OPTIONS: TypeLocation[] = [
  'Location nue',
  'Location meublée non professionnelle (LMNP)',
  'Location meublée professionnelle (LMP)',
];

const regimesPour = (type: TypeLocation | null | undefined): RegimeLocation[] =>
  type === 'Location nue' ? ['Micro-foncier', 'Réel'] : ['Micro-BIC', 'BIC'];

interface PropertyLocationSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  assetNature?: string | null;
}

export const PropertyLocationSection: React.FC<PropertyLocationSectionProps> = ({ 
  form,
  assetNature 
}) => {
  const typeLocation = form.watch('type_location');

  // Un bien de nature « loués nus » ne peut être qu'en location nue ; les autres natures locatives
  // (immeubles professionnels, de rapport, parkings) peuvent être louées nues ou meublées.
  const typeOptions = assetNature === 'Immeubles locatifs (loués nus)'
    ? TYPE_LOCATION_OPTIONS.filter((t) => t === 'Location nue')
    : TYPE_LOCATION_OPTIONS;

  // Régimes fiscaux selon le type de location choisi (et non la nature du bien) : revenus fonciers
  // pour la location nue, BIC pour le meublé.
  const regimeOptions = regimesPour(typeLocation);

  const handleTypeChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    const regime = form.getValues('regime_location');
    if (regime && !regimesPour(value as TypeLocation).includes(regime)) {
      form.setValue('regime_location', null, { shouldDirty: true });
    }
  };

  return (
    <PanelSection title="Location">
        <FormField
          control={form.control}
          name="type_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de location</FormLabel>
              <Select onValueChange={(v) => handleTypeChange(v, field.onChange)} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {typeLocation && (
          <FormField
            control={form.control}
            name="regime_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Régime fiscal</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                      <SelectValue placeholder="Sélectionner un régime" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {regimeOptions.map((regime) => (
                      <SelectItem key={regime} value={regime}>
                        {regime}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </PanelSection>
  );
};
