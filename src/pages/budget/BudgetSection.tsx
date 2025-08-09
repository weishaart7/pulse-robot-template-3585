import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { RevenusForm } from '@/components/budget/RevenusForm';
import { ChargesForm } from '@/components/budget/ChargesForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Revenu, Charge } from '@/services/budgetService';
export const BudgetSection = () => {
  const [showRevenusForm, setShowRevenusForm] = useState(false);
  const [showChargesForm, setShowChargesForm] = useState(false);
  const [editingRevenu, setEditingRevenu] = useState<Revenu | undefined>();
  const [editingCharge, setEditingCharge] = useState<Charge | undefined>();
  const {
    revenus,
    loading: revenusLoading,
    createRevenu,
    updateRevenu,
    deleteRevenu
  } = useRevenus();
  const {
    charges,
    loading: chargesLoading,
    createCharge,
    updateCharge,
    deleteCharge
  } = useCharges();
  const handleSubmitRevenu = async (data: Omit<Revenu, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingRevenu) {
      await updateRevenu(editingRevenu.id, data);
      setEditingRevenu(undefined);
    } else {
      await createRevenu(data);
    }
    setShowRevenusForm(false);
  };
  const handleSubmitCharge = async (data: Omit<Charge, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (editingCharge) {
      await updateCharge(editingCharge.id, data);
      setEditingCharge(undefined);
    } else {
      await createCharge(data);
    }
    setShowChargesForm(false);
  };
  const handleEditRevenu = (revenu: Revenu) => {
    setEditingRevenu(revenu);
    setShowRevenusForm(true);
  };
  const handleEditCharge = (charge: Charge) => {
    setEditingCharge(charge);
    setShowChargesForm(true);
  };
  const handleCancelRevenu = () => {
    setShowRevenusForm(false);
    setEditingRevenu(undefined);
  };
  const handleCancelCharge = () => {
    setShowChargesForm(false);
    setEditingCharge(undefined);
  };
  const loading = revenusLoading || chargesLoading;
  return <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Budget</h2>
        <p className="text-muted-foreground">
          Contrôlez vos revenus, dépenses et objectifs financiers
        </p>
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 mx-0">
            <CardTitle className="text-sm font-medium">Revenus</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenus.length}</div>
            <p className="text-xs text-muted-foreground">
              entrées enregistrées
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Charges</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{charges.length}</div>
            <p className="text-xs text-muted-foreground">
              entrées enregistrées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Formulaires */}
      {showRevenusForm && <RevenusForm revenu={editingRevenu} onSubmit={handleSubmitRevenu} onCancel={handleCancelRevenu} />}

      {showChargesForm && <ChargesForm charge={editingCharge} onSubmit={handleSubmitCharge} onCancel={handleCancelCharge} />}

      {/* Boutons d'ajout */}
      {!showRevenusForm && !showChargesForm && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowRevenusForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un revenu
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowChargesForm(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une charge
              </Button>
            </CardContent>
          </Card>
        </div>}

      {/* Liste des revenus et charges */}
      <BudgetList revenus={revenus} charges={charges} onEditRevenu={handleEditRevenu} onDeleteRevenu={deleteRevenu} onEditCharge={handleEditCharge} onDeleteCharge={deleteCharge} loading={loading} />
    </div>;
};