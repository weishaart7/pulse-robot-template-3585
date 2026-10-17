import React from 'react';
import { panelButtonClass } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetCharge } from '@/services/assetService';

interface ChargesListFieldsProps {
  charges: AssetCharge[];
  onAdd: () => void;
  onEdit: (charge: AssetCharge) => void;
  onDelete: (chargeId: string) => void;
  /** Titre de section « Charges » (masqué quand la page le porte déjà, ex. étape du wizard). */
  showTitle?: boolean;
}

// Reprend à l'identique la liste des charges de l'onglet "Charges" de
// AssetForm.tsx : réutilisable telle quelle dans l'étape "Charges" du
// wizard de création (la modale ChargeForm reste pilotée par l'appelant).
export const ChargesListFields: React.FC<ChargesListFieldsProps> = ({ charges, onAdd, onEdit, onDelete, showTitle = true }) => (
  <div>
    <div className={showTitle ? 'flex items-baseline justify-between' : 'flex items-center justify-between pb-3'}>
      {showTitle ? (
        <SectionHeader title="Charges" />
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {charges.length === 0 ? 'Aucune charge pour l\'instant' : `${charges.length} charge${charges.length > 1 ? 's' : ''}`}
        </p>
      )}
      <Button type="button" variant="outline" onClick={onAdd} className={`${panelButtonClass} gap-1.5`}>
        <Plus className="h-3.5 w-3.5" />
        Ajouter une charge
      </Button>
    </div>

    {charges.length > 0 ? (
      <ul className="border-b border-border">
        {charges.map(charge => (
          <li key={charge.id} className="flex items-center justify-between gap-3 border-t border-border py-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-foreground">{charge.denomination}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {charge.type_charge} · {charge.montant} {charge.unite} ({charge.periodicite})
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button type="button" variant="ghost" onClick={() => onEdit(charge)} className="h-8 rounded-[2px] px-2.5 text-[12.5px]">
                Modifier
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onDelete(charge.id!)} className="h-8 w-8 rounded-[2px]" aria-label="Supprimer la charge">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    ) : showTitle ? (
      <p className="border-t border-border py-3 text-[13px] text-muted-foreground">
        Aucune charge associée à cet actif
      </p>
    ) : null}
  </div>
);
