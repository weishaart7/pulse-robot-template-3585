import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { NaturePicker } from '@/components/assets/NaturePicker';
import { AssetFormValues } from '@/schemas/assetSchema';
import { TypeFondsField, TypeGroupementField } from '@/components/assets/fields/CaracteristiquesFields';
import { DescriptionBienFields } from '@/components/assets/fields/BienImmobilierFields';
import { RequiredMark } from '@/components/ui/required-mark';
import { Link } from 'react-router-dom';
import { isPartsSocieteNature } from '@/lib/patrimoine/societeTransfer';

interface WizardStepQuoiProps {
  form: UseFormReturn<AssetFormValues>;
}

// Étape "Le bien" : nature, dénomination et, pour une résidence ou un bien locatif, sa
// description (typologie, surface, statut). La valeur estimée est demandée à
// l'étape "Valeur", avec la plus-value et la valorisation démembrée.
export const WizardStepQuoi: React.FC<WizardStepQuoiProps> = ({ form }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <FormField control={form.control} name="nature" render={({ field }) => (
        <FormItem>
          <FormLabel>Nature<RequiredMark /></FormLabel>
          <FormControl>
            <NaturePicker value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      <FormField control={form.control} name="denomination" render={({ field }) => (
        <FormItem>
          <FormLabel>Dénomination<RequiredMark /></FormLabel>
          <FormControl>
            <Input className="bg-background border-border shadow-none" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />
      <TypeGroupementField form={form} />
      <TypeFondsField form={form} />
    </div>

    {/* Parts de société : la fiche société porte le régime IR / IS, la valeur et l'entrée du foyer,
        et crée elle-même l'actif « parts » complet (lib/societes/partsFoyer.ts). */}
    {isPartsSocieteNature(form.watch('nature')) && (
      <div className="max-w-2xl border-l-2 border-lagon bg-lagon-soft/60 px-4 py-3 text-[13px] leading-snug">
        <p className="text-foreground">
          Pour des parts de société, créez plutôt la société dans le module Sociétés : elle porte le régime fiscal,
          la valeur et votre entrée au capital, et ajoute ces parts à vos actifs.
        </p>
        <p className="mt-1 text-muted-foreground">
          Société déjà saisie : continuez ici et choisissez-la dans « Société liée ». Sans société liée, la plus-value
          des parts reste non déterminée.
        </p>
        <Link to="/dashboard/societes?nouvelle=1" className="mt-2 inline-block font-medium text-lagon-ink hover:underline">
          Créer la société (abandonne cette saisie) →
        </Link>
      </div>
    )}

    <DescriptionBienFields form={form} />
  </div>
);
