import React, { useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { format } from 'date-fns';
import { CalendarIcon, Info } from 'lucide-react';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DynamicFamilyFormProps {
  linkType: string;
  parentOptions: { value: string; label: string }[];
  parentsForRenunciation: { value: string; label: string }[];
}

const civilites = ['M.', 'Mme', 'Mlle'];
const adoptionTypes = ['Non', 'Adoption simple', 'Adoption plénière'];
const adoptionSimpleMotifs = [
  { value: 'enfant_du_conjoint', label: 'Enfant du conjoint adopté simple' },
  { value: 'soins_secours_5ans', label: 'Soins et secours ininterrompus (5 ans min. durant la minorité)' },
];
const brancheFamiliale = ['Branche paternelle', 'Branche maternelle'];
const mesuresProtectionJuridique = [
  'Aucune',
  'Tutelle',
  'Curatelle',
  'Sauvegarde de justice',
  'Habilitation du conjoint',
  'Habilitation familiale',
  "Mesure d'accompagnement",
];

function ageEnAnnees(dateNaissance: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateNaissance.getFullYear();
  const moisEcoules = today.getMonth() - dateNaissance.getMonth();
  if (moisEcoules < 0 || (moisEcoules === 0 && today.getDate() < dateNaissance.getDate())) {
    age--;
  }
  return age;
}

export function DynamicFamilyForm({ linkType, parentOptions, parentsForRenunciation }: DynamicFamilyFormProps) {
  const form = useFormContext();
  const watchDecede = form.watch('est_decede');
  const watchRenoncant = form.watch('enfant_renoncant');
  const watchAdoption = form.watch('enfant_adopte');
  const watchAdoptionAbattementPlein = form.watch('adoption_simple_abattement_plein');
  const watchDateNaissance = form.watch('date_naissance');
  const watchMandatProtectionFuture = form.watch('mandat_protection_future');
  const isFirstRender = useRef(true);
  const enfantAChargeManuellementModifie = useRef(false);
  const fiscalementAChargeManuellementModifie = useRef(false);

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (linkType !== 'Enfant') return;
    if (!(watchDateNaissance instanceof Date)) return;
    if (ageEnAnnees(watchDateNaissance) < 18) {
      if (!enfantAChargeManuellementModifie.current) {
        form.setValue('enfant_a_charge', true, { shouldDirty: true });
      }
      if (!fiscalementAChargeManuellementModifie.current) {
        form.setValue('fiscalement_a_charge', true, { shouldDirty: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchDateNaissance, linkType]);

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
                  <SelectTrigger size="lg">
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
                  <SelectTrigger size="lg">
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
                  <SelectTrigger size="lg">
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
                    value={
                      field.value instanceof Date 
                        ? format(field.value, 'dd/MM/yyyy')
                        : field.value || ''
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      
                      // Permettre seulement chiffres et /
                      const cleanValue = value.replace(/[^\d/]/g, '');
                      
                      // Limiter à 10 caractères
                      if (cleanValue.length > 10) return;
                      
                      // Auto-formatage pendant la saisie
                      let formattedValue = cleanValue;
                      if (cleanValue.length >= 2 && !cleanValue.includes('/')) {
                        formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                      }
                      if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
                        const parts = formattedValue.split('/');
                        formattedValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + cleanValue.slice(4);
                      }
                      
                      // Validation finale si format complet
                      if (formattedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                        try {
                          const [day, month, year] = formattedValue.split('/').map(Number);
                          const date = new Date(year, month - 1, day);
                          
                          // Vérifier que la date est valide
                          if (date.getDate() === day && 
                              date.getMonth() === month - 1 && 
                              date.getFullYear() === year &&
                              year >= 1900 && year <= new Date().getFullYear()) {
                            field.onChange(date);
                            return;
                          }
                        } catch (error) {
                          // Continue avec la valeur string si parsing échoue
                        }
                      }
                      
                      // Stocker la valeur formatée comme string pendant la saisie
                      field.onChange(formattedValue);
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
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                        }
                      }}
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

      {/* Mesure de protection juridique */}
      <FormField
        control={form.control}
        name="mesure_protection_juridique"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mesure de protection juridique actuelle</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value || 'Aucune'}>
              <FormControl>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {mesuresProtectionJuridique.map((mesure) => (
                  <SelectItem key={mesure} value={mesure}>
                    {mesure}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

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
                      value={
                        field.value instanceof Date 
                          ? format(field.value, 'dd/MM/yyyy')
                          : field.value || ''
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        
                        // Permettre seulement chiffres et /
                        const cleanValue = value.replace(/[^\d/]/g, '');
                        
                        // Limiter à 10 caractères
                        if (cleanValue.length > 10) return;
                        
                        // Auto-formatage pendant la saisie
                        let formattedValue = cleanValue;
                        if (cleanValue.length >= 2 && !cleanValue.includes('/')) {
                          formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                        }
                        if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
                          const parts = formattedValue.split('/');
                          formattedValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + cleanValue.slice(4);
                        }
                        
                        // Validation finale si format complet
                        if (formattedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                          try {
                            const [day, month, year] = formattedValue.split('/').map(Number);
                            const date = new Date(year, month - 1, day);
                            
                            // Vérifier que la date est valide
                            if (date.getDate() === day && 
                                date.getMonth() === month - 1 && 
                                date.getFullYear() === year &&
                                year >= 1900 && year <= new Date().getFullYear()) {
                              field.onChange(date);
                              return;
                            }
                          } catch (error) {
                            // Continue avec la valeur string si parsing échoue
                          }
                        }
                        
                        // Stocker la valeur formatée comme string pendant la saisie
                        field.onChange(formattedValue);
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
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                        }}
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

        {/* Personne à charge */}
        <FormField
          control={form.control}
          name="personne_a_charge"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Personne à charge</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Mandat de protection future */}
        <FormField
          control={form.control}
          name="mandat_protection_future"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Mandat de protection future signé</FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Date du mandat de protection future (si signé) */}
        {watchMandatProtectionFuture && (
          <FormField
            control={form.control}
            name="date_mandat_protection_future"
            render={({ field }) => (
              <FormItem className="ml-6">
                <FormLabel>Date du mandat</FormLabel>
                <div className="flex gap-2">
                  <FormControl className="flex-1">
                    <Input
                      placeholder="JJ/MM/AAAA"
                      value={
                        field.value instanceof Date
                          ? format(field.value, 'dd/MM/yyyy')
                          : field.value || ''
                      }
                      onChange={(e) => {
                        const value = e.target.value;

                        // Permettre seulement chiffres et /
                        const cleanValue = value.replace(/[^\d/]/g, '');

                        // Limiter à 10 caractères
                        if (cleanValue.length > 10) return;

                        // Auto-formatage pendant la saisie
                        let formattedValue = cleanValue;
                        if (cleanValue.length >= 2 && !cleanValue.includes('/')) {
                          formattedValue = cleanValue.slice(0, 2) + '/' + cleanValue.slice(2);
                        }
                        if (cleanValue.length >= 5 && cleanValue.split('/').length === 2) {
                          const parts = formattedValue.split('/');
                          formattedValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + cleanValue.slice(4);
                        }

                        // Validation finale si format complet
                        if (formattedValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                          try {
                            const [day, month, year] = formattedValue.split('/').map(Number);
                            const date = new Date(year, month - 1, day);

                            // Vérifier que la date est valide
                            if (date.getDate() === day &&
                                date.getMonth() === month - 1 &&
                                date.getFullYear() === year &&
                                year >= 1900 && year <= new Date().getFullYear()) {
                              field.onChange(date);
                              return;
                            }
                          } catch (error) {
                            // Continue avec la valeur string si parsing échoue
                          }
                        }

                        // Stocker la valeur formatée comme string pendant la saisie
                        field.onChange(formattedValue);
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
                        onSelect={(date) => {
                          if (date) {
                            field.onChange(date);
                          }
                        }}
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

        {/* Enfant à charge (civil / fiscal) */}
        {linkType === 'Enfant' && (
          <>
            <FormField
              control={form.control}
              name="enfant_a_charge"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        enfantAChargeManuellementModifie.current = true;
                        field.onChange(checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Enfant à charge (autorité parentale / garde)</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fiscalement_a_charge"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        fiscalementAChargeManuellementModifie.current = true;
                        field.onChange(checked);
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Fiscalement à charge (rattaché au foyer fiscal)</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </>
        )}

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
                    <SelectTrigger size="lg">
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

        {/* Adoption simple : exception à l'abattement réduit (art. 786 CGI) */}
        {showAdoption && watchAdoption === 'Adoption simple' && (
          <>
            <FormField
              control={form.control}
              name="adoption_simple_abattement_plein"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex items-center gap-1.5">
                    <FormLabel>Bénéficie de l'abattement plein (100 000 €) malgré l'adoption simple</FormLabel>
                    <Tooltip delayDuration={150}>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex p-1 -m-1 rounded hover:bg-muted/50" aria-label="Base légale">
                          <Info className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        Par défaut, un enfant adopté simple ne bénéficie que de l'abattement des tiers (1 594 €, art. 786 CGI).
                        L'abattement plein (100 000 €) ne s'applique que par exception : enfant du conjoint adopté simple,
                        ou soins et secours ininterrompus pendant au moins 5 ans durant la minorité (10 ans si soins durant
                        minorité et majorité). Cette case doit être cochée uniquement si vous avez vérifié qu'une de ces
                        exceptions s'applique — l'application ne le déduit jamais automatiquement.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </FormItem>
              )}
            />

            {watchAdoptionAbattementPlein && (
              <FormField
                control={form.control}
                name="adoption_simple_motif"
                render={({ field }) => (
                  <FormItem className="ml-6">
                    <FormLabel>Motif de l'exception</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger size="lg">
                          <SelectValue placeholder="Sélectionner un motif" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {adoptionSimpleMotifs.map((motif) => (
                          <SelectItem key={motif.value} value={motif.value}>
                            {motif.label}
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
                        <SelectTrigger size="lg">
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