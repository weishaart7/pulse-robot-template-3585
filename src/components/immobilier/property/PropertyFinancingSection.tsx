import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

interface PropertyFinancingSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
}

export const PropertyFinancingSection: React.FC<PropertyFinancingSectionProps> = ({ form }) => {
  const isFinancementActif = form.watch('financement_actif');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="financement_actif"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Financement actif</FormLabel>
              </div>
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {isFinancementActif && (
          <>
            <FormField
              control={form.control}
              name="financement_duree_mois"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Durée (mois)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Durée en mois"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financement_apport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apport (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Apport"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financement_taux_credit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux du crédit (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Taux du crédit"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="financement_taux_assurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Taux assurance du crédit (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Taux assurance"
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};
