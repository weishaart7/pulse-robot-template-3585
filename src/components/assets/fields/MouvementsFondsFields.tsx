import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { AssetFormValues } from '@/schemas/assetSchema';
import { DateInput } from '@/components/ui/date-input';
import { EuroInput } from '@/components/ui/euro-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { formatCurrency } from '@/lib/patrimoine/utils';

type Mouvement = NonNullable<AssetFormValues['mouvements_fonds']>[number];

interface MouvementsFondsFieldsProps {
  form: UseFormReturn<AssetFormValues>;
}

// Appels de fonds et distributions d'un FCPR / FPCI ou d'un fonds de dette privée. La somme des
// appels devient le montant appelé (useAssetForm.ts) ; les distributions sont totalisées, sans
// traitement fiscal.
export const MouvementsFondsFields: React.FC<MouvementsFondsFieldsProps> = ({ form }) => {
  const mouvements: Mouvement[] = form.watch('mouvements_fonds') || [];
  const engage = Number(form.watch('montant_engage')) || 0;

  const maj = (next: Mouvement[]) => form.setValue('mouvements_fonds', next, { shouldDirty: true });
  const modifier = (index: number, patch: Partial<Mouvement>) =>
    maj(mouvements.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  const ajouter = (type_mouvement: Mouvement['type_mouvement']) =>
    maj([...mouvements, { type_mouvement, date_mouvement: undefined, montant: undefined }]);
  const retirer = (index: number) => maj(mouvements.filter((_, i) => i !== index));

  const total = (type: Mouvement['type_mouvement']) =>
    mouvements.filter((m) => m.type_mouvement === type).reduce((sum, m) => sum + (m.montant || 0), 0);
  const appele = total('appel');
  const distribue = total('distribution');

  return (
    <div className="md:col-span-2 space-y-2">
      <p className="text-sm font-medium leading-none">
        Appels de fonds et distributions
        <FieldHelp>
          Dès qu'un appel est saisi, le montant appelé devient la somme des appels. Les distributions sont
          enregistrées pour le suivi, sans calcul fiscal.
        </FieldHelp>
      </p>

      {mouvements.length > 0 && (
        <div className="divide-y divide-border border-y border-border">
          {mouvements.map((m, index) => (
            <div key={index} className="grid grid-cols-[140px_1fr_1fr_32px] items-center gap-3 py-2">
              <Select value={m.type_mouvement} onValueChange={(v) => modifier(index, { type_mouvement: v as Mouvement['type_mouvement'] })}>
                <SelectTrigger className="bg-background border-border shadow-none h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appel">Appel</SelectItem>
                  <SelectItem value="distribution">Distribution</SelectItem>
                </SelectContent>
              </Select>
              <DateInput value={m.date_mouvement} onChange={(d) => modifier(index, { date_mouvement: d })} placeholder="jj/mm/aaaa" />
              <EuroInput
                className="bg-background border-border shadow-none"
                type="number"
                step="0.01"
                value={m.montant ?? ''}
                onChange={(e) => modifier(index, { montant: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => retirer(index)}
                className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label="Retirer ce mouvement"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex gap-4 text-[13px]">
          <button type="button" onClick={() => ajouter('appel')} className="inline-flex items-center gap-1 font-medium text-lagon-ink hover:underline">
            <Plus className="h-3.5 w-3.5" /> Appel
          </button>
          <button type="button" onClick={() => ajouter('distribution')} className="inline-flex items-center gap-1 font-medium text-lagon-ink hover:underline">
            <Plus className="h-3.5 w-3.5" /> Distribution
          </button>
        </div>
        {mouvements.length > 0 && (
          <p className="text-[12.5px] text-muted-foreground tabular-nums">
            Appelé <span className="text-foreground">{formatCurrency(appele)}</span>
            {engage > 0 && <> sur {formatCurrency(engage)}</>}
            {distribue > 0 && <> · distribué <span className="text-foreground">{formatCurrency(distribue)}</span></>}
          </p>
        )}
      </div>
    </div>
  );
};
