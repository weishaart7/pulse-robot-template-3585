import { useEffect, useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { SmartDateInput } from '@/components/family/SmartDateInput';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { useBudgetEntryForm, PERIODICITE_OPTIONS } from '@/hooks/useBudgetEntryForm';
import { sanitizeNumericInput } from '@/lib/security';
import { toAnnual, isPonctuel, parseLocalDate } from '@/lib/budget/periodicite';
import { categorieCharge, categorieRevenu, colorForCharge, colorForRevenu } from '@/components/budget/budgetColors';

type EntryForm = ReturnType<typeof useBudgetEntryForm>;

interface BudgetEntryDialogProps {
  kind: 'revenus' | 'charges';
  editing: boolean;
  open: boolean;
  onCancel: () => void;
  entry: EntryForm;
}

const SELECT_CLASS = 'bg-background border-border shadow-none rounded-[2px]';

// Section de la fenêtre : titre à repère, puis champs ; séparées par des filets bord à bord.
const Section = ({ title, mark, children }: { title: string; mark: string; children: ReactNode }) => (
  <section className="-mx-6 border-t border-border px-6 py-5 first:border-t-0 first:pt-1">
    <h3 className="mb-4 flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
      <span aria-hidden className="h-3 w-[3px] rounded-full" style={{ backgroundColor: mark }} />
      {title}
    </h3>
    <div className="space-y-4">{children}</div>
  </section>
);

const DATE_INPUT_CLASS = 'bg-background border-border shadow-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20';

// Date du formulaire (chaîne AAAA-MM-JJ ou vide) saisie comme dans Famille : JJ/MM/AAAA tapé au
// clavier ou choisi au calendrier, dates futures admises. Une saisie incomplète reste locale ; le
// champ du formulaire ne reçoit qu'une date complète et valide, ou vide.
const BudgetDateField = ({ value, onChange }: { value?: string; onChange: (value: string) => void }) => {
  const [draft, setDraft] = useState<Date | string>(value ? parseLocalDate(value) : '');

  // Resynchronise à l'ouverture d'une autre ligne (réinitialisation du formulaire).
  useEffect(() => {
    setDraft(current => {
      const currentIso = current instanceof Date ? format(current, 'yyyy-MM-dd') : '';
      if (currentIso === (value || '')) return current;
      return value ? parseLocalDate(value) : (typeof current === 'string' ? current : '');
    });
  }, [value]);

  return (
    <SmartDateInput
      value={draft}
      maxDate={null}
      className={DATE_INPUT_CLASS}
      onChange={(next) => {
        setDraft(next);
        if (next instanceof Date) onChange(format(next, 'yyyy-MM-dd'));
        else onChange('');
      }}
    />
  );
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// Fenêtre d'ajout / modification d'un revenu ou d'une charge, en « panneau de travail » (comme
// l'ajout d'un membre de la famille) : en-tête fileté, sections Nature / Montant / Calendrier /
// Note, pied fileté. Toute la logique de saisie reste dans useBudgetEntryForm.
export const BudgetEntryDialog = ({ kind, editing, open, onCancel, entry }: BudgetEntryDialogProps) => {
  const {
    form,
    isSubmitting,
    isLibellePrefilled,
    selectedNature,
    selectedPeriodicite,
    categoryOptions,
    natureOptions,
    partieOptions,
    handleCategoryChange,
    handleLibelleChange,
    submit,
  } = entry;

  const isRevenus = kind === 'revenus';
  const noun = isRevenus ? 'revenu' : 'charge';
  const title = editing
    ? `Modifier ${isRevenus ? 'le revenu' : 'la charge'}`
    : `Ajouter ${isRevenus ? 'un revenu' : 'une charge'}`;

  // Repère de la catégorie choisie (même couleur que dans les listes et le Résumé).
  const nature = form.watch('nature');
  const categorie = form.watch('categorie');
  const mark = nature
    ? (isRevenus ? colorForRevenu(categorieRevenu(nature)) : colorForCharge(categorieCharge(nature)))
    : (isRevenus ? colorForRevenu(categorie) : colorForCharge(categorie));

  // Équivalences du montant saisi, pour lire d'un coup d'œil ce que la ligne pèse dans le budget.
  const montant = sanitizeNumericInput(form.watch('montant')) || 0;
  const ponctuel = isPonctuel(selectedPeriodicite);
  const annuel = toAnnual(montant, selectedPeriodicite);
  const equivalence = montant > 0
    ? ponctuel
      ? `Versé une fois, compté sur l'année de début`
      : `Soit ${formatCurrency(annuel / 12)} par mois · ${formatCurrency(annuel)} par an`
    : null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent overlayClassName="bg-black/30 backdrop-blur-[6px]" className="workspace-panel no-scrollbar max-w-2xl max-h-[90vh] overflow-y-auto rounded-[4px] sm:rounded-[4px]">
        <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
          <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">{title}</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Le montant est saisi dans sa périodicité, puis converti pour l'affichage mensuel ou annuel.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="mt-1">
            <Section title="Nature" mark={mark}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="categorie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie</FormLabel>
                      <Select value={field.value} onValueChange={handleCategoryChange(field.onChange)}>
                        <FormControl>
                          <SelectTrigger size="lg" className={SELECT_CLASS}>
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nature</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger size="lg" className={SELECT_CLASS}>
                            <SelectValue placeholder="Sélectionner une nature" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {natureOptions.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="libelle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Libellé</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Saisissez le libellé"
                          className={isLibellePrefilled && field.value === selectedNature ? 'text-muted-foreground/60' : ''}
                          onChange={handleLibelleChange(field.onChange)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="partie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isRevenus ? 'Bénéficiaire' : 'Débiteur'}</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger size="lg" className={SELECT_CLASS}>
                            <SelectValue placeholder={isRevenus ? 'Sélectionner le bénéficiaire' : 'Sélectionner le débiteur'} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {partieOptions.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Section>

            <Section title="Montant" mark={mark}>
              <FormField
                control={form.control}
                name="periodicite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Périodicité</FormLabel>
                    {/* Bascule segmentée : choix court, visible d'un coup d'œil. */}
                    <div role="radiogroup" aria-label="Périodicité" className="grid grid-cols-3 gap-px overflow-hidden rounded-[2px] border border-border bg-border sm:grid-cols-5">
                      {PERIODICITE_OPTIONS.map((option) => {
                        const selected = field.value === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => field.onChange(option.value)}
                            className={`h-9 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                              selected ? 'bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-secondary hover:text-foreground'
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="montant"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Montant {ponctuel ? '' : `par ${{ mensuel: 'mois', trimestriel: 'trimestre', semestriel: 'semestre', annuel: 'an' }[selectedPeriodicite] ?? 'mois'}`}</FormLabel>
                    <div className="relative sm:max-w-[16rem]">
                      <FormControl>
                        <Input {...field} type="number" step="0.01" inputMode="decimal" placeholder="0" className="pr-8 tabular-nums" />
                      </FormControl>
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
                    </div>
                    {equivalence && <p className="text-[12px] tabular-nums text-muted-foreground">{equivalence}</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

            <Section title="Calendrier" mark={mark}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="date_debut"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ponctuel ? 'Date' : 'Début'}</FormLabel>
                      <BudgetDateField value={field.value} onChange={field.onChange} />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {!ponctuel && (
                  <FormField
                    control={form.control}
                    name="date_fin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fin <span className="font-normal text-muted-foreground">(optionnel)</span></FormLabel>
                        <BudgetDateField value={field.value} onChange={field.onChange} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="jour_fixe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jour fixe <span className="font-normal text-muted-foreground">(optionnel)</span></FormLabel>
                      <FormControl>
                        <Input {...field} type="number" min="1" max="31" placeholder="1 à 31" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-[12px] text-muted-foreground">
                Sans date de début, {ponctuel ? `le ${noun} est rattaché à l'année en cours` : `le ${noun} est considéré comme déjà en cours`}.
                Le jour fixe sert aux prélèvements à date fixe.
              </p>
            </Section>

            <Section title="Note" mark={mark}>
              <FormField
                control={form.control}
                name="commentaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Commentaire</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} placeholder="Commentaire (optionnel)" className="rounded-[2px] text-[13px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Section>

            <div className="-mx-6 flex justify-end gap-2 border-t border-border px-6 pt-4">
              <Button type="button" variant="outline" className={panelButtonClass} onClick={onCancel} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting} className={panelPrimaryButtonClass}>
                {isSubmitting ? (
                  <>
                    <LogoSpinner />
                    Enregistrement...
                  </>
                ) : editing ? 'Enregistrer' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
