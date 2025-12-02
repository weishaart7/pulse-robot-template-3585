import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

interface PropertyLocationSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  assetNature?: string | null;
}

export const PropertyLocationSection: React.FC<PropertyLocationSectionProps> = ({ 
  form,
  assetNature 
}) => {
  const typeLocation = form.watch('type_location');

  const getRegimeFiscalOptions = () => {
    if (assetNature === 'Immeubles locatifs (loués nus)') {
      return [
        { value: 'Micro-foncier', label: 'Micro-foncier' },
        { value: 'Réel', label: 'Réel' },
      ];
    }
    return [
      { value: 'Micro-BIC', label: 'Micro-BIC' },
      { value: 'BIC', label: 'BIC' },
    ];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Type de location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="type_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de location</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Location nue">Location nue</SelectItem>
                  <SelectItem value="Location meublée non professionnelle (LMNP)">
                    Location meublée non professionnelle (LMNP)
                  </SelectItem>
                  <SelectItem value="Location meublée professionnelle (LMP)">
                    Location meublée professionnelle (LMP)
                  </SelectItem>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un régime" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {getRegimeFiscalOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
};
