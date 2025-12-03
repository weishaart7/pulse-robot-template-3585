import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useCharges } from '@/hooks/useBudget';
import { ChargesForm } from '@/components/budget/ChargesForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Charge } from '@/services/budgetService';
import { DisplayMode, PersonFilter } from '@/pages/budget/BudgetSection';

interface BudgetChargesProps {
  displayMode: DisplayMode;
  personFilter: PersonFilter;
}

export const BudgetCharges = ({ displayMode, personFilter }: BudgetChargesProps) => {
  const [showChargesForm, setShowChargesForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | undefined>();
  const {
    charges: allCharges,
    loading: chargesLoading,
    createCharge,
    updateCharge,
    deleteCharge
  } = useCharges();

  // Filtrer par personne (individuel = uniquement les éléments explicitement attribués)
  const charges = useMemo(() => {
    if (personFilter === 'couple') return allCharges;
    return allCharges.filter(c => {
      const debiteur = c.debiteur?.toLowerCase();
      return debiteur === personFilter;
    });
  }, [allCharges, personFilter]);

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
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{charges.length}</div>
              <p className="text-xs text-muted-foreground">
                entrées enregistrées
              </p>
            </div>
            <Button onClick={() => setShowChargesForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle charge
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire d'ajout/modification */}
      {showChargesForm && (
        <ChargesForm 
          charge={editingCharge} 
          onSubmit={handleSubmitCharge} 
          onCancel={handleCancelCharge} 
          open={showChargesForm}
        />
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
        displayMode={displayMode}
      />
    </div>
  );
};