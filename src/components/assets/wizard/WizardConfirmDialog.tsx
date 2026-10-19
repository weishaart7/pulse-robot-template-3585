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
import { cn } from '@/lib/utils';

interface WizardConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Remplace window.confirm dans le wizard : ce dialogue natif est bloqué dans
// le navigateur intégré de l'app desktop (il renvoie `false` immédiatement,
// sans rien afficher), ce qui rendait "Annuler" inopérant dès qu'une saisie
// existait.
export const WizardConfirmDialog: React.FC<WizardConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) => (
  <AlertDialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
    {/* Gabarit des fenêtres de panneau (cf. ImmobilierGestionDialog) : fond flouté, angles 4 px,
        pied fileté portant des boutons de 32 px à angles 2 px. */}
    <AlertDialogContent
      overlayClassName="bg-black/30 backdrop-blur-[6px]"
      className="workspace-panel max-w-md gap-0 overflow-hidden rounded-[4px] p-0 sm:rounded-[4px]"
    >
      <AlertDialogHeader className="space-y-1.5 px-6 pt-5 pb-5 text-left">
        <AlertDialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">{title}</AlertDialogTitle>
        <AlertDialogDescription className="text-[13px] leading-relaxed text-muted-foreground">{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row justify-end gap-2 border-t border-border bg-secondary/30 px-6 py-3 sm:space-x-0">
        <AlertDialogCancel className={cn(panelButtonClass, 'mt-0')}>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} className={panelPrimaryButtonClass}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
