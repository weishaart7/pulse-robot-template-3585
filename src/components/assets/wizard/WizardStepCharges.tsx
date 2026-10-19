import React from 'react';
import { AssetCharge } from '@/services/assetService';
import { ChargesListFields } from '@/components/assets/fields/ChargesListFields';

interface WizardStepChargesProps {
  charges: AssetCharge[];
  onAdd: () => void;
  onEdit: (charge: AssetCharge) => void;
  onDelete: (chargeId: string) => void;
}

// Étape "Charges" : reprend la liste actuelle (ChargesListFields, modale ChargeForm pilotée par
// l'appelant). Étape facultative : « Suivant » passe au récapitulatif sans charge.
export const WizardStepCharges: React.FC<WizardStepChargesProps> = ({ charges, onAdd, onEdit, onDelete }) => (
  <ChargesListFields charges={charges} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} showTitle={false} />
);
