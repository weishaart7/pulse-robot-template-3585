import React, { useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Info } from 'lucide-react';

import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { CheckboxWithLabel } from '@/components/family/CheckboxWithLabel';

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

  const showParentField = ['Enfant', 'Parent', 'Frère/Sœur', 'Oncle/Tante', 'Petit-enfant', 'Arrière petit-enfant', 'Grand-parent', 'Arrière grand-parent', 'Neveu/Nièce', 'Petit neveu/nièce', 'Cousin/Cousine'].includes(linkType);
  const showAdoption = ['Enfant', 'Petit-enfant', 'Arrière petit-enfant'].includes(linkType);
  const showRenunciation = linkType === 'Enfant';
  const showBranche = ['Oncle/Tante', 'Grand-parent', 'Cousin/Cousine', 'Arrière grand-parent'].includes(linkType);
  const showExoneration = linkType === 'Frère/Sœur';

  const getParentLabel = () => {
    switch (linkType) {
      case 'Enfant':
      case 'Petit-enfant':
      case 'Arrière petit-enfant':
        return 'Enfant de';
      case 'Parent':
      case 'Grand-parent':
      case 'Arrière grand-parent':
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
                  <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
                  <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
                  <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
                <Input placeholder="Nom de famille" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20" {...field} />
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
                <Input placeholder="Prénom" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20" {...field} />
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
              <SmartDateInput value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20" />
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
            <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Décédé" />
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
                <SmartDateInput value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20" />
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
            <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Personne handicapée" />
          )}
        />

        {/* Personne à charge */}
        <FormField
          control={form.control}
          name="personne_a_charge"
          render={({ field }) => (
            <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Personne à charge" />
          )}
        />

        {/* Enfant à charge (civil / fiscal) */}
        {linkType === 'Enfant' && (
          <>
            <FormField
              control={form.control}
              name="enfant_a_charge"
              render={({ field }) => (
                <CheckboxWithLabel
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    enfantAChargeManuellementModifie.current = true;
                    field.onChange(checked);
                  }}
                  label="Enfant à charge (autorité parentale / garde)"
                />
              )}
            />

            <FormField
              control={form.control}
              name="fiscalement_a_charge"
              render={({ field }) => (
                <CheckboxWithLabel
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    fiscalementAChargeManuellementModifie.current = true;
                    field.onChange(checked);
                  }}
                  label="Fiscalement à charge (rattaché au foyer fiscal)"
                />
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
                    <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
                        <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
                <CheckboxWithLabel checked={field.value} onCheckedChange={field.onChange} label="Enfant renonçant à la succession" />
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
                        <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
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
              <CheckboxWithLabel
                checked={field.value}
                onCheckedChange={field.onChange}
                label="Vivant sous le même toit et bénéficiant d'une exonération de droits de succession"
              />
            )}
          />
        )}
      </div>
    </div>
  );
}