import React from 'react';
import { Revenu } from '@/services/budgetService';
import { REVENUS_CATEGORIES } from '@/constants/budgetCategories';
import { useBudgetEntryForm } from '@/hooks/useBudgetEntryForm';
import { BudgetEntryDialog } from '@/components/budget/BudgetEntryDialog';

interface RevenusFormProps {
  revenu?: Revenu;
  onSubmit: (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onCancel: () => void;
  open: boolean;
}

export const RevenusForm: React.FC<RevenusFormProps> = ({ revenu, onSubmit, onCancel, open }) => {
  const entry = useBudgetEntryForm<Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    entity: revenu,
    open,
    categories: REVENUS_CATEGORIES,
    partieKey: 'beneficiaire',
    formName: 'budget_revenus',
    buildSubmitPayload: (f) => ({
      nature: f.nature,
      libelle: f.libelle,
      beneficiaire: f.partie,
      montant: f.montant,
      revenu_disponible: false,
      periodicite: f.periodicite,
      date_debut: f.date_debut,
      date_fin: f.date_fin,
      jour_fixe: f.jour_fixe,
      commentaire: f.commentaire,
    }),
    onSubmit,
  });

  return <BudgetEntryDialog kind="revenus" editing={!!revenu} open={open} onCancel={onCancel} entry={entry} />;
};
