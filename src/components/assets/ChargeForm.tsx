import React from 'react';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OptionToggle } from '@/components/ui/option-toggle';
import { cn } from '@/lib/utils';
import { DateInput } from '@/components/ui/date-input';
import { AssetCharge } from '@/services/assetService';
import { CHARGE_TYPES, DEBITEUR_OPTIONS, PERIODICITE_OPTIONS, UNITE_OPTIONS } from '@/constants/assetTypes';

const chargeSchema = z.object({
  type_charge: z.enum(['Charges courantes', 'Charges fiscales']),
  denomination: z.string().min(1, 'La dénomination est requise'),
  debiteur: z.enum(['Époux 1', 'Époux 2', 'Couple']),
  montant: z.number({ required_error: 'Le montant est requis', invalid_type_error: 'Le montant est requis' }).min(0, 'Le montant doit être positif'),
  unite: z.enum(['€', '%']),
  periodicite: z.enum(['ponctuelle', 'annuelle', 'trimestrielle', 'mensuelle']),
  date_debut: z.date({ required_error: 'La date est requise' }),
  duree_type: z.enum(['Indéterminée', 'Jusqu\'à date', 'Pendant années']),
  duree_fin_date: z.date().optional(),
  duree_annees: z.number().optional(),
  impact_budget: z.boolean().default(false),
});

type ChargeFormValues = z.infer<typeof chargeSchema>;

interface ChargeFormProps {
  charge?: AssetCharge;
  onSubmit: (values: ChargeFormValues) => void;
  onCancel: () => void;
  /** Débiteur proposé pour une nouvelle charge, déduit de la détention de l'actif. */
  debiteurParDefaut?: ChargeFormValues['debiteur'];
}

/** Débiteur suggéré : le couple pour un bien commun ou indivis, sinon l'époux détenteur. */
export function debiteurDepuisDetention(
  detenteur: string | undefined,
  qualification: string | undefined,
  familyData: { userFirstName?: string; partnerFirstName?: string } | undefined,
): ChargeFormValues['debiteur'] | undefined {
  if (qualification === 'Bien commun' || qualification === 'Indivision') return 'Couple';
  if (!detenteur) return undefined;
  if (detenteur === 'Le couple' || detenteur === 'Indivision') return 'Couple';
  if (familyData?.partnerFirstName && detenteur === familyData.partnerFirstName) return 'Époux 2';
  if (familyData?.userFirstName && detenteur === familyData.userFirstName) return 'Époux 1';
  return undefined;
}

export const ChargeForm: React.FC<ChargeFormProps> = ({ charge, onSubmit, onCancel, debiteurParDefaut }) => {
  const form = useForm<ChargeFormValues>({
    resolver: zodResolver(chargeSchema),
    defaultValues: charge ? {
      type_charge: charge.type_charge,
      denomination: charge.denomination,
      debiteur: charge.debiteur,
      montant: charge.montant,
      unite: charge.unite,
      periodicite: charge.periodicite,
      date_debut: new Date(charge.date_debut),
      duree_type: charge.duree_type,
      duree_fin_date: charge.duree_fin_date ? new Date(charge.duree_fin_date) : undefined,
      duree_annees: charge.duree_annees || undefined,
      impact_budget: charge.impact_budget || false,
    } : {
      type_charge: 'Charges courantes',
      denomination: '',
      debiteur: debiteurParDefaut ?? 'Époux 1',
      montant: undefined,
      unite: '€',
      periodicite: 'mensuelle',
      date_debut: new Date(),
      duree_type: 'Indéterminée',
      impact_budget: true,
    }
  });

  const dureeType = form.watch('duree_type');
  const periodicite = form.watch('periodicite');
  const isPonctuelle = periodicite === 'ponctuelle';
  const montant = form.watch('montant');
  const unite = form.watch('unite');

  const impactMensuel = (() => {
    if (!montant || montant <= 0 || unite !== '€') return null;
    switch (periodicite) {
      case 'mensuelle': return montant;
      case 'trimestrielle': return montant / 3;
      case 'annuelle': return montant / 12;
      default: return null;
    }
  })();

  const handleSubmit = (values: ChargeFormValues) => {
    const formattedValues = {
      ...values,
      date_debut: format(values.date_debut, 'yyyy-MM-dd'),
      duree_fin_date: values.duree_fin_date ? format(values.duree_fin_date, 'yyyy-MM-dd') : undefined,
    };
    onSubmit(formattedValues as any);
  };

  return (
    <section className="mt-6 rounded-[4px] border border-border bg-card">
      <header className="flex items-center justify-between pl-5 pr-3 pt-4">
        <h3 className="text-[14.5px] font-medium tracking-[-0.01em]">{charge ? 'Modifier la charge' : 'Ajouter une charge'}</h3>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-[2px]" onClick={onCancel} aria-label="Fermer">
          <X className="h-4 w-4" />
        </Button>
      </header>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-5 pb-5 pt-4 [&_input]:rounded-[2px]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <FormField control={form.control} name="denomination" render={({ field }) => (
              <FormItem>
                <FormLabel>Dénomination</FormLabel>
                <FormControl>
                  <Input placeholder="Ex. Taxe foncière" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="type_charge" render={({ field }) => (
              <FormItem>
                <FormLabel>Type de charge</FormLabel>
                <Segmented options={CHARGE_TYPES} value={field.value} onChange={field.onChange} format={(o) => (o === 'Charges fiscales' ? 'Fiscales' : 'Courantes')} />
                <FormMessage />
              </FormItem>
            )} />

            <FormItem>
              <FormLabel>Montant</FormLabel>
              <div className="flex gap-2">
                <FormField control={form.control} name="montant" render={({ field }) => (
                  <div className="flex-1">
                    <FormControl>
                    <EuroInput
                      step="0.01"
                      suffix={unite}
                      {...field}
                      value={field.value ?? ''}
                      // Champ vidé : laissé vide (et non remis à 0) pour pouvoir saisir le montant.
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    />
                  </FormControl>
                  </div>
                )} />
                <FormField control={form.control} name="unite" render={({ field }) => (
                  <Segmented options={UNITE_OPTIONS} value={field.value} onChange={field.onChange} className="w-24 shrink-0" />
                )} />
              </div>
              {form.formState.errors.montant && (
                <p className="text-[0.8rem] font-medium text-destructive">{form.formState.errors.montant.message}</p>
              )}
            </FormItem>

            <FormField control={form.control} name="debiteur" render={({ field }) => (
              <FormItem>
                <FormLabel>Débiteur</FormLabel>
                <Segmented options={DEBITEUR_OPTIONS} value={field.value} onChange={field.onChange} />
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="periodicite" render={({ field }) => (
              <FormItem>
                <FormLabel>Périodicité</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-background border-border shadow-none" size="lg">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PERIODICITE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="date_debut" render={({ field }) => (
              <FormItem>
                <FormLabel>{isPonctuelle ? 'Date' : 'Date de début'}</FormLabel>
                <FormControl>
                  <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {!isPonctuelle && (
              <FormItem>
                <FormLabel>Durée</FormLabel>
                <Segmented
                  options={['Indéterminée', "Jusqu'à date"] as const}
                  value={dureeType === 'Indéterminée' ? 'Indéterminée' : "Jusqu'à date"}
                  format={(o) => (o === 'Indéterminée' ? 'Indéterminée' : 'Date de fin')}
                  onChange={(o) => {
                    form.setValue('duree_type', o);
                    if (o === 'Indéterminée') form.setValue('duree_fin_date', undefined);
                  }}
                />
              </FormItem>
            )}

            {!isPonctuelle && dureeType !== 'Indéterminée' && (
              <FormField control={form.control} name="duree_fin_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de fin</FormLabel>
                  <FormControl>
                    <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
          </div>

          <FormField control={form.control} name="impact_budget" render={({ field }) => (
            <FormItem className="flex items-center gap-3 space-y-0">
              <OptionToggle checked={!!field.value} onChange={field.onChange}>
                Impact sur le budget
              </OptionToggle>
              {field.value && impactMensuel !== null && (
                <span className="text-[12.5px] tabular-nums text-muted-foreground">
                  +{Math.round(impactMensuel).toLocaleString('fr-FR')} €/mois dans le budget
                </span>
              )}
            </FormItem>
          )} />

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onCancel} className={panelButtonClass}>
              Annuler
            </Button>
            <Button type="submit" className={panelPrimaryButtonClass}>
              {charge ? 'Modifier' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
};

/** Choix exclusif en boutons accolés, à la hauteur des champs (36 px). */
function Segmented<T extends string>({ options, value, onChange, format, className }: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (option: T) => string;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn('flex h-9 gap-[3px] rounded-[2px] bg-muted/60 p-[3px]', className)}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'flex-1 truncate rounded-[2px] px-2 text-[12.5px] transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option
              ? 'bg-background font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {format ? format(option) : option}
        </button>
      ))}
    </div>
  );
}
