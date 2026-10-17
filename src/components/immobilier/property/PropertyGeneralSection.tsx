import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { PanelSection } from './PanelSection';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

// Date d'achat saisie comme dans Famille (JJ/MM/AAAA ou calendrier, dates passées). Une saisie
// incomplète reste locale : le formulaire ne reçoit qu'une date complète et valide, ou rien.
export const AcquisitionDateInput = ({ value, onChange }: { value?: Date; onChange: (value?: Date) => void }) => {
  const [draft, setDraft] = useState<Date | string>(value ?? '');
  useEffect(() => {
    setDraft(current => (current instanceof Date && value && current.getTime() === value.getTime()) ? current : (value ?? (typeof current === 'string' ? current : '')));
  }, [value]);
  return (
    <SmartDateInput
      value={draft}
      className="bg-background border-border shadow-none"
      onChange={(next) => {
        setDraft(next);
        onChange(next instanceof Date ? next : undefined);
      }}
    />
  );
};

interface PropertyGeneralSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  showStatutField?: boolean;
}

export const PropertyGeneralSection: React.FC<PropertyGeneralSectionProps> = ({
  form,
  showStatutField = false,
}) => {
  return (
    <PanelSection title="Données générales">
        <FormField
          control={form.control}
          name="typologie_bien"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typologie du bien</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                    <SelectValue placeholder="Sélectionner une typologie" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Appartement">Appartement</SelectItem>
                  <SelectItem value="Maison">Maison</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="surface_m2"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Surface (en m²)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Surface"
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
          name="date_acquisition"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date d'achat</FormLabel>
              <AcquisitionDateInput value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="valeur_estimee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valeur estimée actuelle (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Valeur estimée"
                  {...field}
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : '')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {showStatutField && (
          <FormField
            control={form.control}
            name="statut_bien"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                  <FormControl>
                    <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                      <SelectValue placeholder="Sélectionner un statut" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Usage personnel">Usage personnel</SelectItem>
                    <SelectItem value="En rénovation">En rénovation</SelectItem>
                    <SelectItem value="En vente">En vente</SelectItem>
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
