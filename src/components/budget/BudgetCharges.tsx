import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingDown } from 'lucide-react';
import { useCharges } from '@/hooks/useBudget';
import { ChargesForm } from '@/components/budget/ChargesForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Charge } from '@/services/budgetService';

export const BudgetCharges = () => {
  const [showChargesForm, setShowChargesForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | undefined>();

  const {
    charges,
    loading: chargesLoading,
    createCharge,
    updateCharge,
    deleteCharge
  } = useCharges();

  const handleSubmitCharge = async (data: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingCharge) {
      await updateCharge(editingCharge.id, data);
      setEditingCharge(undefined);
    } else {
      await createCharge(data);
    }
    setShowChargesForm(false);
  };

  const handleEditCharge = (charge: Charge) => {
    setEditingCharge(charge);
    setShowChargesForm(true);
  };

  const handleCancelCharge = () => {
    setShowChargesForm(false);
    setEditingCharge(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Résumé des charges */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total des Charges</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{charges.length}</div>
          <p className="text-xs text-muted-foreground">
            entrées enregistrées
          </p>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/modification */}
      {showChargesForm && (
        <ChargesForm 
          charge={editingCharge} 
          onSubmit={handleSubmitCharge} 
          onCancel={handleCancelCharge} 
        />
      )}

      {/* Bouton d'ajout */}
      {!showChargesForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Ajouter une Charge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowChargesForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle charge
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Liste des charges */}
      <BudgetList 
        revenus={[]} 
        charges={charges} 
        onEditRevenu={() => {}} 
        onDeleteRevenu={() => {}} 
        onEditCharge={handleEditCharge} 
        onDeleteCharge={deleteCharge} 
        loading={chargesLoading}
      />
    </div>
  );
};