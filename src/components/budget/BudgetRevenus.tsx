import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRevenus } from '@/hooks/useBudget';
import { RevenusForm } from '@/components/budget/RevenusForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Revenu } from '@/services/budgetService';
import { DisplayMode } from '@/pages/budget/BudgetSection';

interface BudgetRevenusProps {
  displayMode: DisplayMode;
}

export const BudgetRevenus = ({ displayMode }: BudgetRevenusProps) => {
  const [showRevenusForm, setShowRevenusForm] = useState(false);
  const [editingRevenu, setEditingRevenu] = useState<Revenu | undefined>();
  const {
    revenus,
    loading: revenusLoading,
    createRevenu,
    updateRevenu,
    deleteRevenu
  } = useRevenus();

  const handleSubmitRevenu = async (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingRevenu) {
      await updateRevenu(editingRevenu.id, data);
      setEditingRevenu(undefined);
    } else {
      await createRevenu(data);
    }
    setShowRevenusForm(false);
  };

  const handleEditRevenu = (revenu: Revenu) => {
    setEditingRevenu(revenu);
    setShowRevenusForm(true);
  };

  const handleCancelRevenu = () => {
    setShowRevenusForm(false);
    setEditingRevenu(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Résumé des revenus */}
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
            <Button onClick={() => setShowRevenusForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau revenu
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/modification */}
      <RevenusForm 
        revenu={editingRevenu} 
        onSubmit={handleSubmitRevenu} 
        onCancel={handleCancelRevenu} 
        open={showRevenusForm}
        displayMode={displayMode}
      />

      {/* Liste des revenus */}
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