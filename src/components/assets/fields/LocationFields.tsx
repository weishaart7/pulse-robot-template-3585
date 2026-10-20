import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Checkbox } from '@/components/ui/checkbox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { AssetFormValues } from '@/schemas/assetSchema';
import { TypeLocation, hasDetailImmobilier, estEnLocation, estMeuble, toujoursLoueNu, TYPE_LMNP, regimesPour, typesLocationPour } from '@/schemas/immobilierPropertySchema';

interface LocationFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  /** Création : loyer mensuel en plus, enregistré comme revenu du bien. */
  creation?: boolean;
}

// Location d'un bien locatif : type et régime fiscal (mêmes règles que la fiche Immobilier,
// PropertyLocationSection) et, à la création, loyer mensuel.
export const LocationFields: React.FC<LocationFieldsProps> = ({ form, creation = false }) => {
  const nature = form.watch('nature');
  const typeLocation = form.watch('type_location');
  const loyer = form.watch('loyer_mensuel');
  const typeOptions = typesLocationPour(nature);
  // Loués nus et locaux professionnels : toujours en location nue, rien à choisir. Meublés : le choix est le statut LMNP / LMP.
  const sansChoixType = toujoursLoueNu(nature);
  const meuble = estMeuble(nature);
  const regimeOptions = regimesPour(sansChoixType ? 'Location nue' : typeLocation);

  const handleTypeChange = (value: string, onChange: (v: string) => void) => {
    onChange(value);
    const regime = form.getValues('regime_location');
    if (regime && !regimesPour(value as TypeLocation).includes(regime)) {
      form.setValue('regime_location', undefined, { shouldDirty: true });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {!sansChoixType && <FormField control={form.control} name="type_location" render={({ field }) => (
          <FormItem>
            <div className="flex items-center">
              <FormLabel>{meuble ? 'Statut du loueur' : 'Type de location'}</FormLabel>
              {meuble && (
                <FieldHelp>
                  Statut apprécié pour tout le foyer (art. 155 IV CGI) : LMP si les recettes de location meublée
                  du foyer dépassent 23 000 € par an et dépassent ses autres revenus d'activité ; LMNP sinon.
                  Il s'applique à tous les meublés du foyer.
                </FieldHelp>
              )}
            </div>
            <Select onValueChange={(v) => handleTypeChange(v, field.onChange)} value={field.value ?? ''}>
              <FormControl>
                <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {typeOptions.map((t) => <SelectItem key={t} value={t}>{meuble ? (t === TYPE_LMNP ? 'LMNP — non professionnel' : 'LMP — professionnel') : t}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />}

        {(typeLocation || sansChoixType) && (
          <FormField control={form.control} name="regime_location" render={({ field }) => (
            <FormItem>
              <FormLabel>Régime fiscal</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <FormControl>
                  <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                    <SelectValue placeholder="Sélectionner un régime" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {regimeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}

        {creation && (
          <FormField control={form.control} name="loyer_mensuel" render={({ field }) => (
            <FormItem>
              <FormLabel>Loyer mensuel hors charges</FormLabel>
              <FieldHelp>Facultatif. Enregistré comme revenu du bien.</FieldHelp>
              <FormControl>
                <EuroInput className="bg-background border-border shadow-none" step="0.01" min="0" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
      </div>

      {creation && loyer !== undefined && loyer > 0 && (
        <FormField control={form.control} name="loyer_budget" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-3 space-y-0">
            <FormControl>
              <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
            </FormControl>
            <FormLabel className="cursor-pointer">Reporter le loyer dans le budget</FormLabel>
          </FormItem>
        )} />
      )}

      {creation && <RenvoisImmobilier renvois={renvoisImmobilier(form.watch()).filter((r) => !r.startsWith('Le crédit'))} />}
    </div>
  );
};

// Crédit d'une résidence ou d'un bien locatif, demandé à la création seulement : il se saisit
// ensuite dans Passifs, relié au bien, source unique pour le cashflow et les simulateurs.
export const CreditFields: React.FC<{ form: UseFormReturn<AssetFormValues> }> = ({ form }) => (
  <FormField control={form.control} name="finance_par_credit" render={({ field }) => (
    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-[2px] border border-border bg-secondary/40 px-4 py-3">
      <FormControl>
        <Checkbox checked={!!field.value} onCheckedChange={(v) => field.onChange(v === true)} />
      </FormControl>
      <div className="space-y-0.5">
        <FormLabel className="cursor-pointer">Bien financé par un crédit</FormLabel>
        <p className="text-[12px] text-muted-foreground">
          Après la création, le crédit se saisit dans Patrimoine → Passifs, déjà relié à ce bien : il alimente le cashflow et les simulateurs.
        </p>
      </div>
    </FormItem>
  )} />
);

// Ce qui reste à saisir ailleurs pour un bien immobilier, selon sa nature et la saisie en cours :
// renvois affichés dans l'étape Location et en pied du récapitulatif.
export const renvoisImmobilier = (values: Partial<AssetFormValues>): string[] => {
  const renvois: string[] = [];
  if (hasDetailImmobilier(values.nature) && values.finance_par_credit) {
    renvois.push('Le crédit : dans Patrimoine → Passifs, relié à ce bien (proposé juste après la création).');
  }
  if (!estEnLocation(values)) return renvois;
  if (estMeuble(values.nature)) {
    renvois.push('Zone géographique, part du terrain et amortissement : Immobilier → Mes biens → fiche du bien.');
  }
  if (values.type_location === 'Location nue') {
    renvois.push('Déficits fonciers reportés des années passées : Immobilier → Vue d\'ensemble → Synthèse foncière.');
  }
  renvois.push('Autres revenus et charges (taxe foncière, copropriété, assurance…) : Immobilier → Mes biens → menu ⋯ → Revenus et charges.');
  return renvois;
};

export const RenvoisImmobilier: React.FC<{ renvois: string[]; titre?: string }> = ({ renvois, titre = 'À compléter ailleurs' }) => {
  if (renvois.length === 0) return null;
  return (
    <div className="rounded-[2px] border border-border bg-secondary/50 px-4 py-3 text-[13px]">
      <p className="font-medium text-foreground">{titre}</p>
      <ul className="mt-1 space-y-1 text-muted-foreground">
        {renvois.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
};
