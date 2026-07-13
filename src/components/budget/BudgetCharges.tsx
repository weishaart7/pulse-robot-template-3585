import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total des Charges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{charges.length}</div>
              <p className="text-xs text-muted-foreground">
                entrées enregistrées
              </p>
            </div>
            <Button onClick={handleAddCharge}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle charge
            </Button>
          </div>
        </CardContent>
      </Card>

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
