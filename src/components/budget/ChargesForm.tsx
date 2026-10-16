import React from 'react';
import { Charge } from '@/services/budgetService';
import { CHARGES_CATEGORIES } from '@/constants/budgetCategories';
import { useBudgetEntryForm } from '@/hooks/useBudgetEntryForm';
import { BudgetEntryDialog } from '@/components/budget/BudgetEntryDialog';

interface ChargesFormProps {
  charge?: Charge;
  onSubmit: (data: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  open: boolean;
}

export const ChargesForm: React.FC<ChargesFormProps> = ({ charge, onSubmit, onCancel, open }) => {
  const entry = useBudgetEntryForm<Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    entity: charge,
    open,
    categories: CHARGES_CATEGORIES,
    partieKey: 'debiteur',
    formName: 'budget_charges',
    buildSubmitPayload: (f) => ({
      nature: f.nature,
      libelle: f.libelle,
      debiteur: f.partie,
      montant: f.montant,
      periodicite: f.periodicite,
      date_debut: f.date_debut,
      date_fin: f.date_fin,
      jour_fixe: f.jour_fixe,
      commentaire: f.commentaire,
    }),
    onSubmit,
  });

  return <BudgetEntryDialog kind="charges" editing={!!charge} open={open} onCancel={onCancel} entry={entry} />;
};
