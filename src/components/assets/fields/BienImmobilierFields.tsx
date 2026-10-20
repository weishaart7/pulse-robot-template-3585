import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { AssetFormValues } from '@/schemas/assetSchema';
import { cn } from '@/lib/utils';
import { PrixAuM2 } from '@/components/immobilier/property/PrixAuM2';
import { FRAIS_DETAILLES, hasDetailImmobilier, typologiesPourNature, NATURE_STATIONNEMENT, avecQuestionUsage, prixAuM2, avecPosteMeubles, isRentalPropertyType, isResidenceType } from '@/schemas/immobilierPropertySchema';

interface BienImmobilierFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

const parseNumber = (raw: string) => (raw === '' ? undefined : parseFloat(raw));

// Description d'une résidence ou d'un bien locatif (typologie, surface, statut), saisie dès la
// création plutôt que dans la fiche Immobilier. Rien pour les autres natures.
export const DescriptionBienFields: React.FC<BienImmobilierFieldsProps> = ({ form }) => {
  const nature = form.watch('nature');
  if (!hasDetailImmobilier(nature)) return null;
  const typologies = typologiesPourNature(nature);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {nature === NATURE_STATIONNEMENT && (
        <p className="md:col-span-2 border-l-2 border-lagon bg-lagon-soft px-3 py-2 text-[12.5px] leading-relaxed text-foreground">
          À réserver à un stationnement indépendant. Un parking, garage ou box qui dépend de la résidence
          principale (attenant ou tout proche) s'intègre à la valeur de celle-ci : il suit son régime
          (abattement de 20 % en succession, exonération de plus-value).
        </p>
      )}
      {avecQuestionUsage(nature) && (
        <FormField control={form.control} name="usage_loue" render={({ field }) => (
          <FormItem>
            <FormLabel>Usage</FormLabel>
            <div role="radiogroup" className="flex h-9 gap-[3px] rounded-[2px] bg-muted/60 p-[3px]">
              {([false, true] as const).map((loue) => (
                <button
                  key={String(loue)}
                  type="button"
                  role="radio"
                  aria-checked={!!field.value === loue}
                  onClick={() => field.onChange(loue)}
                  className={cn(
                    'flex-1 rounded-[2px] px-2 text-[12.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !!field.value === loue
                      ? 'bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {loue ? (nature === NATURE_STATIONNEMENT ? 'Loué' : 'Loué à un tiers') : (nature === NATURE_STATIONNEMENT ? 'Personnel' : 'Ma propre activité')}
                </button>
              ))}
            </div>
          </FormItem>
        )} />
      )}
      <FormField control={form.control} name="typologie_bien" render={({ field }) => (
        <FormItem>
          <FormLabel>Typologie du bien</FormLabel>
          <Select onValueChange={field.onChange} value={field.value ?? ''}>
            <FormControl>
              <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                <SelectValue placeholder={typologies.join(', ').replace(/, ([^,]*)$/, ' ou $1').toLowerCase().replace(/^./, (c) => c.toUpperCase())} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {typologies.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
          <PrixAuM2 achat={prixAuM2(form.watch('valeur_acquisition'), field.value)} estime={prixAuM2(form.watch('valeur_estimee'), field.value)} />
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
  const frais = FRAIS_DETAILLES.filter((f) => f.name !== 'meubles' || avecPosteMeubles(nature));

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
