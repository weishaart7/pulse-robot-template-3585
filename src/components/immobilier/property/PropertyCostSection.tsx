import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

interface PropertyCostSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  showMeublesField?: boolean;
}

type NumericFieldNames = 'montant_immeuble' | 'frais_agence' | 'frais_notaire' | 'frais_bancaires' | 'frais_hypotheque' | 'travaux_renovation' | 'travaux_construction' | 'meubles';

export const PropertyCostSection: React.FC<PropertyCostSectionProps> = ({
  form,
  showMeublesField = false,
}) => {
  const renderNumberField = (
    name: NumericFieldNames,
    label: string,
    placeholder: string
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              placeholder={placeholder}
              value={field.value || ''}
              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Coût de revient</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderNumberField('montant_immeuble', "Montant de l'immeuble (hors frais d'agence et frais de notaire) (€)", "Montant de l'immeuble")}
        {renderNumberField('frais_agence', "Frais d'agence (€)", "Frais d'agence")}
        {renderNumberField('frais_notaire', 'Frais de notaire (€)', 'Frais de notaire (calculé automatiquement à 7,5%)')}
        {renderNumberField('frais_bancaires', 'Frais bancaires ou de courtier (€)', 'Frais bancaires')}
        {renderNumberField('frais_hypotheque', "Frais d'hypothèque ou de caution (€)", "Frais d'hypothèque")}
        {renderNumberField('travaux_renovation', 'Travaux de rénovation (€)', 'Travaux de rénovation')}
        {renderNumberField('travaux_construction', 'Travaux de construction (€)', 'Travaux de construction')}
        {showMeublesField && renderNumberField('meubles', 'Meubles (€)', 'Meubles')}
      </CardContent>
    </Card>
  );
};
