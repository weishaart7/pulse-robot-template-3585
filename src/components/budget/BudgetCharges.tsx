import { Plus } from 'lucide-react';
import { useCharges } from '@/hooks/useBudget';
import { useBudgetEntryDialogState } from '@/hooks/useBudgetEntryDialogState';
import { ChargesForm } from '@/components/budget/ChargesForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Charge } from '@/services/budgetService';
import { DisplayMode } from '@/pages/budget/BudgetSection';

interface BudgetChargesProps {
  displayMode: DisplayMode;
}

export const BudgetCharges = ({ displayMode }: BudgetChargesProps) => {
  const {
    charges,
    loading: chargesLoading,
    createCharge,
    updateCharge,
    deleteCharge
  } = useCharges();

  const {
    showForm: showChargesForm,
    editingEntry: editingCharge,
    handleSubmit: handleSubmitCharge,
    handleEdit: handleEditCharge,
    handleCancel: handleCancelCharge,
    handleAdd: handleAddCharge,
  } = useBudgetEntryDialogState<Charge, Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    createEntry: createCharge,
    updateEntry: updateCharge,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des charges</h3>
        <button
          onClick={handleAddCharge}
          className="inline-flex items-center gap-2 rounded-full bg-[#006064] hover:bg-[#006064]/90 text-white pl-1 pr-4 py-1 text-sm font-medium transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#9bf00d]">
            <Plus className="h-4 w-4 text-[#054b16]" />
          </span>
          Nouvelle charge
        </button>
      </div>

      {showChargesForm && (
        <ChargesForm
          charge={editingCharge}
          onSubmit={handleSubmitCharge}
          onCancel={handleCancelCharge}
          open={showChargesForm}
        />
      )}

      <BudgetList
        revenus={[]}
        charges={charges}
        onEditRevenu={() => {}}
        onDeleteRevenu={() => {}}
        onEditCharge={handleEditCharge}
        onDeleteCharge={deleteCharge}
        loading={chargesLoading}
        displayMode={displayMode}
      />
    </div>
  );
};
