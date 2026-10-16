import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import type { Requalification } from '@/lib/patrimoine/requalification';

interface RequalificationDialogProps {
  /** null = fermé. */
  changements: Requalification[] | null;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

// Confirmation commune avant requalification en lot (périmètre de la société
// d'acquêts, enregistrement du régime) : liste chaque bien, avant → après.
export const RequalificationDialog: React.FC<RequalificationDialogProps> = ({ changements, pending, onCancel, onConfirm }) => {
  const n = changements?.length ?? 0;
  return (
    <AlertDialog open={changements !== null} onOpenChange={open => !open && !pending && onCancel()}>
      <AlertDialogContent className="workspace-panel rounded-[4px] sm:rounded-[4px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[16px] font-medium">
            {n} bien{n > 1 ? 's changent' : ' change'} de qualification
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>Avec ce régime, la qualification enregistrée de ces biens n'est plus à jour. Les biens qualifiés manuellement ne sont pas concernés.</p>
              <ul className="max-h-60 divide-y divide-border overflow-y-auto border-y border-border">
                {changements?.map(c => (
                  <li key={c.asset.id} className="flex items-center justify-between gap-3 py-2 text-[13px]">
                    <span className="truncate text-foreground">{c.asset.denomination || c.asset.nature}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {c.avant || '—'} → <span className="font-medium text-foreground">{c.apres}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className={panelButtonClass} disabled={pending}>Ne pas modifier les biens</AlertDialogCancel>
          <AlertDialogAction
            className={panelPrimaryButtonClass}
            disabled={pending}
            onClick={e => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {pending ? 'Application…' : 'Requalifier'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
