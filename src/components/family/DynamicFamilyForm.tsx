import React from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DynamicFamilyFormProps {
  linkType: string;
  parentOptions: { value: string; label: string }[];
  parentsForRenunciation: { value: string; label: string }[];
}

const civilites = ['M.', 'Mme', 'Mlle'];
const adoptionTypes = ['Non', 'Adoption simple', 'Adoption plénière'];
const brancheFamiliale = ['Branche paternelle', 'Branche maternelle'];

export function DynamicFamilyForm({ linkType, parentOptions, parentsForRenunciation }: DynamicFamilyFormProps) {
  const form = useFormContext();
  const watchDecede = form.watch('est_decede');
  const watchRenoncant = form.watch('enfant_renoncant');

  const showParentField = ['Enfant', 'Parent', 'Frère/Sœur', 'Oncle/Tante', 'Petit-enfant', 'Arrière petit-enfant', 'Grand-parent', 'Neveu/Nièce', 'Petit neveu/nièce', 'Cousin/Cousine'].includes(linkType);
  const showAdoption = ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'].includes(linkType);
  const showRenunciation = linkType === 'Enfant';
  const showBranche = linkType === 'Oncle/Tante';
  const showExoneration = linkType === 'Frère/Sœur';

  const getParentLabel = () => {
    switch (linkType) {
      case 'Enfant':
      case 'Petit-enfant':
      case 'Arrière petit-enfant':
        return 'Enfant de';
      case 'Parent':
      case 'Grand-parent':
        return 'Parent de';
      case 'Frère/Sœur':
        return 'Frère/sœur de';
      case 'Oncle/Tante':
        return 'Oncle/Tante de';
      case 'Neveu/Nièce':
      case 'Petit neveu/nièce':
      case 'Cousin/Cousine':
        return 'Enfant de';
      default:
        return 'Lié à';
    }
  };

  return (
    <div className="space-y-6">
      {/* Parent/Enfant de field */}
      {showParentField && parentOptions.length > 0 && (
        <FormField
          control={form.control}
          name="enfant_de"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getParentLabel()}</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {parentOptions.map((option) => (
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

      {/* Branche familiale pour Oncle/Tante */}
      {showBranche && (
        <FormField
          control={form.control}
          name="branche_familiale"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branche familiale</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || 'Branche paternelle'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une branche" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {brancheFamiliale.map((branche) => (
                    <SelectItem key={branche} value={branche}>
                      {branche}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Civilité */}
        <FormField
          control={form.control}
          name="civilite"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Civilité</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {civilites.map((civilite) => (
                    <SelectItem key={civilite} value={civilite}>
                      {civilite}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nom */}
        <FormField
          control={form.control}
          name="nom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom *</FormLabel>
              <FormControl>
                <Input placeholder="Nom de famille" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Prénom */}
        <FormField
          control={form.control}
          name="prenom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prénom</FormLabel>
              <FormControl>
                <Input placeholder="Prénom" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date de naissance */}
        <FormField
          control={form.control}
          name="date_naissance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date de naissance</FormLabel>
              <div className="flex gap-2">
                <FormControl className="flex-1">
                  <Input
                    placeholder="JJ/MM/AAAA"
                    value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 10) {
                        if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                          try {
                            const [day, month, year] = value.split('/');
                            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            if (!isNaN(date.getTime()) && date.getFullYear() == parseInt(year)) {
                              field.onChange(date);
                              return;
                            }
                          } catch (error) {
                            // Ignorer l'erreur
                          }
                        }
                        field.onChange(value);
                      }
                    }}
                  />
                </FormControl>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0" type="button">
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value instanceof Date ? field.value : undefined}
                      onSelect={(date) => date && field.onChange(date)}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        {/* Décédé */}
        <FormField
          control={form.control}
          name="est_decede"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Décédé</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Date de décès (si décédé) */}
        {watchDecede && (
          <FormField
            control={form.control}
            name="date_deces"
            render={({ field }) => (
              <FormItem className="ml-6">
                <FormLabel>Date de décès</FormLabel>
                <div className="flex gap-2">
                  <FormControl className="flex-1">
                    <Input
                      placeholder="JJ/MM/AAAA"
                      value={field.value ? format(field.value, 'dd/MM/yyyy') : ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value.length <= 10) {
                          if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                            try {
                              const [day, month, year] = value.split('/');
                              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              if (!isNaN(date.getTime()) && date.getFullYear() == parseInt(year)) {
                                field.onChange(date);
                                return;
                              }
                            } catch (error) {
                              // Ignorer l'erreur
                            }
                          }
                          field.onChange(value);
                        }
                      }}
                    />
                  </FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0" type="button">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value instanceof Date ? field.value : undefined}
                        onSelect={(date) => date && field.onChange(date)}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Personne handicapée */}
        <FormField
          control={form.control}
          name="handicap"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Personne handicapée</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Enfant adopté */}
        {showAdoption && (
          <FormField
            control={form.control}
            name="enfant_adopte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enfant adopté</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value || 'Non'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {adoptionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Enfant renonçant */}
        {showRenunciation && (
          <>
            <FormField
              control={form.control}
              name="enfant_renoncant"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enfant renonçant à la succession</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {watchRenoncant && (
              <FormField
                control={form.control}
                name="enfant_renoncant_de"
                render={({ field }) => (
                  <FormItem className="ml-6">
                    <FormLabel>Renonce à la succession de</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un parent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {parentsForRenunciation.map((parent) => (
                          <SelectItem key={parent.value} value={parent.value}>
                            {parent.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </>
        )}

        {/* Exonération succession pour frère/sœur */}
        {showExoneration && (
          <FormField
            control={form.control}
            name="exoneration_succession"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Vivant sous le même toit et bénéficiant d'une exonération de droits de succession</FormLabel>
                </div>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}