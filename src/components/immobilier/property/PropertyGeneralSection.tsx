import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';

interface PropertyGeneralSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  showStatutField?: boolean;
}

export const PropertyGeneralSection: React.FC<PropertyGeneralSectionProps> = ({
  form,
  showStatutField = false,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Données générales du bien</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="typologie_bien"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Typologie du bien</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger>
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
            <FormItem className="flex flex-col">
              <FormLabel>Date d'achat</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? format(field.value, 'PPP', { locale: fr }) : <span>Sélectionner une date</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
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
                    <SelectTrigger>
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
      </CardContent>
    </Card>
  );
};
