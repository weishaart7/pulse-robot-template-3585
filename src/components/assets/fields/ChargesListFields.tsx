import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AssetCharge } from '@/services/assetService';

interface ChargesListFieldsProps {
  charges: AssetCharge[];
  onAdd: () => void;
  onEdit: (charge: AssetCharge) => void;
  onDelete: (chargeId: string) => void;
}

// Reprend à l'identique la liste des charges de l'onglet "Charges" de
// AssetForm.tsx : réutilisable telle quelle dans l'étape "Charges" du
// wizard de création (la modale ChargeForm reste pilotée par l'appelant).
export const ChargesListFields: React.FC<ChargesListFieldsProps> = ({ charges, onAdd, onEdit, onDelete }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Gérez les charges associées à cet actif</p>
      <Button type="button" variant="outline" onClick={onAdd} className="flex items-center gap-2">
        <Plus className="h-4 w-4" />
        Ajouter une charge
      </Button>
    </div>

    {charges.length > 0 ? (
      <div className="space-y-2">
        {charges.map(charge => (
          <Card key={charge.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{charge.denomination}</p>
                <p className="text-sm text-muted-foreground">
                  {charge.type_charge} - {charge.montant} {charge.unite} ({charge.periodicite})
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(charge)}>
                  Modifier
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(charge.id!)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <div className="text-center py-8 text-muted-foreground">
        Aucune charge associée à cet actif
      </div>
    )}
  </div>
);
