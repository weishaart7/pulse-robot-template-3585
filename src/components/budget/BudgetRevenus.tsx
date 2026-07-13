import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sources de revenus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{revenus.length}</div>
              <p className="text-xs text-muted-foreground">
                entrées enregistrées
              </p>
            </div>
            <Button onClick={handleAddRevenu}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau revenu
            </Button>
          </div>
        </CardContent>
      </Card>

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
