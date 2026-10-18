import React from 'react';
import { AssetCharge } from '@/services/assetService';
import { ChargesListFields } from '@/components/assets/fields/ChargesListFields';
import { isPrevoyanceDeces } from '@/constants/assetTypes';

interface WizardStepChargesProps {
  charges: AssetCharge[];
  onAdd: () => void;
  onEdit: (charge: AssetCharge) => void;
  onDelete: (chargeId: string) => void;
  nature?: string;
}

// Étape "Charges" : reprend la liste actuelle (ChargesListFields, modale ChargeForm pilotée par
// l'appelant). Étape facultative : « Suivant » passe au récapitulatif sans charge.
// Contrat de prévoyance : les primes saisies ici ne servent qu'au budget ; celles qui comptent
// pour la transmission se saisissent dans Transmission → Assurance-vie.
export const WizardStepCharges: React.FC<WizardStepChargesProps> = ({ charges, onAdd, onEdit, onDelete, nature }) => (
  <div className="space-y-4">
    {isPrevoyanceDeces(nature) && (
      <p className="text-[13px] text-muted-foreground">
        Les primes ajoutées ici ne comptent que pour le budget. Pour la transmission, saisissez-les dans Transmission → Assurance-vie.
      </p>
    )}
    <ChargesListFields charges={charges} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} showTitle={false} />
  </div>
);
