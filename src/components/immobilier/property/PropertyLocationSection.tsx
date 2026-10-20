import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PanelSection } from './PanelSection';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImmobilierPropertyFormValues, TypeLocation, regimesPour, typesLocationPour, estMeuble, toujoursLoueNu, TYPE_LMNP } from '@/schemas/immobilierPropertySchema';

interface PropertyLocationSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  assetNature?: string | null;
}

export const PropertyLocationSection: React.FC<PropertyLocationSectionProps> = ({ 
  form,
  assetNature 
}) => {
  const typeLocation = form.watch('type_location');

  const typeOptions = typesLocationPour(assetNature);

  // Loués nus et locaux professionnels : toujours en location nue, rien à choisir. Meublés : le choix est le statut LMNP / LMP.
  const sansChoixType = toujoursLoueNu(assetNature);
  const meuble = estMeuble(assetNature);
  const regimeOptions = regimesPour(sansChoixType ? 'Location nue' : typeLocation);

  const handleTypeChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    const regime = form.getValues('regime_location');
    if (regime && !regimesPour(value as TypeLocation).includes(regime)) {
      form.setValue('regime_location', null, { shouldDirty: true });
    }
  };

  return (
    <PanelSection title="Location">
        {!sansChoixType && <FormField
          control={form.control}
          name="type_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{meuble ? 'Statut du loueur' : 'Type de location'}</FormLabel>
              <Select onValueChange={(v) => handleTypeChange(v, field.onChange)} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t} value={t}>{meuble ? (t === TYPE_LMNP ? 'LMNP — non professionnel' : 'LMP — professionnel') : t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />}

        {(typeLocation || sansChoixType) && (
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
