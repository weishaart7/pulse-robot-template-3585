import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { AssetFormValues } from '@/schemas/assetSchema';
import { FRAIS_DETAILLES, hasDetailImmobilier, isRentalPropertyType, isResidenceType } from '@/schemas/immobilierPropertySchema';

interface BienImmobilierFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

const parseNumber = (raw: string) => (raw === '' ? undefined : parseFloat(raw));

// Description d'une résidence ou d'un bien locatif (typologie, surface, statut), saisie dès la
// création plutôt que dans la fiche Immobilier. Rien pour les autres natures.
export const DescriptionBienFields: React.FC<BienImmobilierFieldsProps> = ({ form }) => {
  const nature = form.watch('nature');
  if (!hasDetailImmobilier(nature)) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField control={form.control} name="typologie_bien" render={({ field }) => (
        <FormItem>
          <FormLabel>Typologie du bien</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ''}>
            <FormControl>
              <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                <SelectValue placeholder="Appartement ou maison" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="Appartement">Appartement</SelectItem>
              <SelectItem value="Maison">Maison</SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="surface_m2" render={({ field }) => (
        <FormItem>
          <FormLabel>Surface</FormLabel>
          <FormControl>
            <EuroInput suffix="m²" className="bg-background border-border shadow-none" step="0.01" min="0" value={field.value ?? ''} onChange={(e) => field.onChange(parseNumber(e.target.value))} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {isResidenceType(nature) && (
        <FormField control={form.control} name="statut_bien" render={({ field }) => (
          <FormItem>
            <FormLabel>Statut</FormLabel>
            <Select onValueChange={field.onChange} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
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
        )} />
      )}
    </div>
  );
};

// Frais du coût de revient détaillé, à la place du champ « Frais d'acquisition » global : leur
// somme l'alimente (cf. useAssetForm), affichée ici en total.
export const FraisDetaillesFields: React.FC<BienImmobilierFieldsProps> = ({ form }) => {
  const nature = form.watch('nature');
  const total = form.watch('frais_acquisition');
  const frais = FRAIS_DETAILLES.filter((f) => f.name !== 'meubles' || isRentalPropertyType(nature));

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-medium text-foreground">
          Frais et travaux
          <FieldHelp>
            Détail du coût de revient, repris dans la fiche Immobilier (rentabilité). Leur total sert de frais d'acquisition pour la plus-value. Les frais de notaire sont estimés à partir du prix d'achat ; corrigez-les si besoin.
          </FieldHelp>
        </p>
        <p className="text-[13px] tabular-nums text-muted-foreground">
          Total {(total ?? 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {frais.map(({ name, label }) => (
          <FormField key={name} control={form.control} name={name} render={({ field }) => (
            <FormItem>
              <FormLabel>{label}</FormLabel>
              <FormControl>
                <EuroInput className="bg-background border-border shadow-none" step="0.01" min="0" value={field.value ?? ''} onChange={(e) => field.onChange(parseNumber(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ))}
      </div>
    </div>
  );
};
