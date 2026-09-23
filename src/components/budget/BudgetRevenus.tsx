import { Plus } from 'lucide-react';
import { useRevenus } from '@/hooks/useBudget';
import { useBudgetEntryDialogState } from '@/hooks/useBudgetEntryDialogState';
import { RevenusForm } from '@/components/budget/RevenusForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Revenu } from '@/services/budgetService';
import { DisplayMode } from '@/pages/budget/BudgetSection';

interface BudgetRevenusProps {
  displayMode: DisplayMode;
}

export const BudgetRevenus = ({ displayMode }: BudgetRevenusProps) => {
  const {
    revenus,
    loading: revenusLoading,
    createRevenu,
    updateRevenu,
    deleteRevenu
  } = useRevenus();

  const {
    showForm: showRevenusForm,
    editingEntry: editingRevenu,
    handleSubmit: handleSubmitRevenu,
    handleEdit: handleEditRevenu,
    handleCancel: handleCancelRevenu,
    handleAdd: handleAddRevenu,
  } = useBudgetEntryDialogState<Revenu, Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>>({
    createEntry: createRevenu,
    updateEntry: updateRevenu,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Gestion des revenus</h3>
        <button
          onClick={handleAddRevenu}
          className="inline-flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/15">
            <Plus className="h-4 w-4 text-background" />
          </span>
          Nouveau revenu
        </button>
      </div>

      {showRevenusForm && (
        <RevenusForm
          revenu={editingRevenu}
          onSubmit={handleSubmitRevenu}
          onCancel={handleCancelRevenu}
          open={showRevenusForm}
        />
      )}

      <BudgetList
        revenus={revenus}
        charges={[]}
        onEditRevenu={handleEditRevenu}
        onDeleteRevenu={deleteRevenu}
        onEditCharge={() => {}}
        onDeleteCharge={() => {}}
        loading={revenusLoading}
        displayMode={displayMode}
      />
    </div>
  );
};
