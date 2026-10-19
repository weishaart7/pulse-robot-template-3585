import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { EuroInput } from '@/components/ui/euro-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldHelp } from '@/components/ui/field-help';
import { AssetFormValues } from '@/schemas/assetSchema';
import { AssetCharge } from '@/services/assetService';
import { FamilyInfo } from '@/lib/patrimoine/utils';
import { DENOMINATION_PRIME } from '@/constants/assetTypes';


const PERIODICITES: { value: AssetCharge['periodicite']; label: string }[] = [
  { value: 'mensuelle', label: 'Mensuelle' },
  { value: 'trimestrielle', label: 'Trimestrielle' },
  { value: 'annuelle', label: 'Annuelle' },
  { value: 'ponctuelle', label: 'Prime unique' },
];

interface PrimeFieldsProps {
  form: UseFormReturn<AssetFormValues>;
  charges: AssetCharge[];
  setCharges: React.Dispatch<React.SetStateAction<AssetCharge[]>>;
  familyData: FamilyInfo;
  assetId?: string;
}

/**
 * Prime d'un contrat de prévoyance : montant, périodicité et report au budget. Enregistrée
 * comme une charge de l'actif (asset_charges, libellé DENOMINATION_PRIME), que le module
 * Budget lit quand « impact_budget » est coché. Sans effet sur la transmission : les primes
 * qui y comptent (990 I, 757 B) se saisissent dans Transmission → Assurance-vie.
 */
export const PrimeFields: React.FC<PrimeFieldsProps> = ({ form, charges, setCharges, familyData, assetId }) => {
  const prime = charges.find((c) => c.denomination === DENOMINATION_PRIME);
  const detenteur = form.watch('detenteur');
  const debiteur: AssetCharge['debiteur'] =
    detenteur === familyData.partnerFirstName || detenteur === 'Conjoint' ? 'Époux 2' : 'Époux 1';

  const majPrime = (patch: Partial<AssetCharge>) => {
    setCharges((prev) => {
      const existante = prev.find((c) => c.denomination === DENOMINATION_PRIME);
      if (existante) return prev.map((c) => (c === existante ? { ...c, debiteur, ...patch } : c));
      const dateSouscription = form.getValues('date_acquisition');
      const nouvelle: AssetCharge = {
        id: `temp-${Date.now()}`,
        asset_id: assetId || '',
        type_charge: 'Charges courantes',
        denomination: DENOMINATION_PRIME,
        debiteur,
        montant: 0,
        unite: '€',
        periodicite: 'mensuelle',
        date_debut: format(dateSouscription ? new Date(dateSouscription) : new Date(), 'yyyy-MM-dd'),
        duree_type: 'Indéterminée',
        impact_budget: true,
        ...patch,
      };
      return [...prev, nouvelle];
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-2">
        <Label>Montant de la prime</Label>
        <EuroInput
          className="bg-background border-border shadow-none"
          type="number"
          step="0.01"
          value={prime?.montant ?? ''}
          onChange={(e) => majPrime({ montant: e.target.value ? parseFloat(e.target.value) : 0 })}
        />
      </div>
      <div className="space-y-2">
        <Label>Périodicité</Label>
        <Select value={prime?.periodicite ?? 'mensuelle'} onValueChange={(v) => majPrime({ periodicite: v as AssetCharge['periodicite'] })}>
          <SelectTrigger className="bg-background border-border shadow-none" size="lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODICITES.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-full flex items-center gap-3">
        <Checkbox
          id="prime-impact-budget"
          checked={prime?.impact_budget ?? true}
          onCheckedChange={(checked) => majPrime({ impact_budget: checked === true })}
        />
        <Label htmlFor="prime-impact-budget">Reporter la prime dans le budget</Label>
        <FieldHelp>
          Ajoute la prime aux dépenses du budget. Pour le calcul de la transmission, les primes versées se
          renseignent dans Transmission → Assurance-vie.
        </FieldHelp>
      </div>
    </div>
  );
};
