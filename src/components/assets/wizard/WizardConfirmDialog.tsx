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
// existait. `.actifs-form` sur le contenu (rendu dans un portail) rebranche les
// couleurs de la charte des formulaires d'actif.
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
    <AlertDialogContent className="actifs-form">
      <AlertDialogHeader>
        <AlertDialogTitle className="af-display">{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
