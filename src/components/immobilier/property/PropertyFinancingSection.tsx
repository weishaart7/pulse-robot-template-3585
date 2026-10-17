import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { PanelSection } from './PanelSection';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ImmobilierPropertyFormValues } from '@/schemas/immobilierPropertySchema';
import type { Emprunt } from '@/services/passifService';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface PropertyFinancingSectionProps {
  form: UseFormReturn<ImmobilierPropertyFormValues>;
  /** Emprunts Patrimoine reliés au bien : s'il y en a, ils font foi et les champs ci-dessous sont ignorés. */
  empruntsRelies?: Emprunt[];
}

export const PropertyFinancingSection: React.FC<PropertyFinancingSectionProps> = ({ form, empruntsRelies = [] }) => {
  const isFinancementActif = form.watch('financement_actif');

  // Crédit saisi dans Patrimoine (Passifs) et relié au bien : source unique, reprise par le cashflow,
  // les simulateurs, la synthèse foncière et la projection (lib/immobilier/credit.ts).
  if (empruntsRelies.length > 0) {
    return (
      <PanelSection
        title="Financement"
        grid={false}
        description="Crédit repris de Patrimoine → Passifs, qui fait foi : à modifier là-bas. Les champs de financement de cette fiche sont ignorés."
      >
        <ul className="-mx-2 divide-y divide-border border-y border-border">
          {empruntsRelies.map((e) => (
            <li key={e.id} className="grid grid-cols-1 gap-1 px-2 py-2.5 text-[13px] md:grid-cols-[minmax(0,1fr)_auto]">
              <span className="font-medium text-foreground">{e.libelle || e.nature}</span>
              <span className="tabular-nums text-muted-foreground">
                {e.capital_restant_du != null ? `${formatCurrency(e.capital_restant_du)} restant dû` : 'Capital restant dû non renseigné'}
                {e.taux_interet != null && ` · ${e.taux_interet.toLocaleString('fr-FR')} %`}
                {e.mensualite != null && ` · ${formatCurrency(e.mensualite)} / mois`}
                {e.duree_restante != null && ` · ${e.duree_restante} mois`}
                {e.mode_amortissement === 'In fine' && ' · in fine'}
              </span>
            </li>
          ))}
        </ul>
      </PanelSection>
    );
  }

  return (
    <PanelSection title="Financement">
        <FormField
          control={form.control}
          name="financement_actif"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-[2px] border border-border bg-secondary/40 px-4 py-3 md:col-span-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-0.5">
                <FormLabel className="cursor-pointer">Bien financé par un crédit</FormLabel>
                <p className="text-[12px] text-muted-foreground">Mensualité et assurance entrent dans le cashflow et les simulateurs.</p>
              </div>
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
      </PanelSection>
  );
};
