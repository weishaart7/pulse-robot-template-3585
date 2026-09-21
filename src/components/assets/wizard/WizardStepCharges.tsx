import React from 'react';
import { Button } from '@/components/ui/button';
import { AssetCharge } from '@/services/assetService';
import { ChargesListFields } from '@/components/assets/fields/ChargesListFields';

interface WizardStepChargesProps {
  charges: AssetCharge[];
  onAdd: () => void;
  onEdit: (charge: AssetCharge) => void;
  onDelete: (chargeId: string) => void;
  onSkip: () => void;
}

// Étape "Charges" : reprend la liste actuelle (ChargesListFields, modale
// ChargeForm pilotée par l'appelant) et ajoute le bouton non-bloquant du
// wizard pour passer directement au récapitulatif sans charge.
export const WizardStepCharges: React.FC<WizardStepChargesProps> = ({ charges, onAdd, onEdit, onDelete, onSkip }) => (
  <div className="space-y-6">
    <ChargesListFields charges={charges} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} />
    {charges.length === 0 && (
      <div className="flex justify-center">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Passer, j'ajouterai plus tard
        </Button>
      </div>
    )}
  </div>
);
