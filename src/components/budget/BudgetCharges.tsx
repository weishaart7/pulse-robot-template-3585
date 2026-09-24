import { Plus, AlertTriangle } from 'lucide-react';
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
    chargesEnPourcentage,
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
          className="inline-flex items-center gap-2 rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/15">
            <Plus className="h-4 w-4 text-background" />
          </span>
          Nouvelle charge
        </button>
      </div>

      {chargesEnPourcentage.length > 0 && (
        <div className="rounded-lg border border-spark/30 bg-spark/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-spark mt-0.5 shrink-0" strokeWidth={1.75} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {chargesEnPourcentage.length} charge{chargesEnPourcentage.length > 1 ? 's' : ''} d'actif
                exprimée{chargesEnPourcentage.length > 1 ? 's' : ''} en % non prise{chargesEnPourcentage.length > 1 ? 's' : ''} en compte
              </p>
              <p className="text-xs text-foreground/80">
                {chargesEnPourcentage.map(c => c.libelle).join(', ')} — saisissez-les en € depuis Patrimoine pour les intégrer au budget.
              </p>
            </div>
          </div>
        </div>
      )}

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
