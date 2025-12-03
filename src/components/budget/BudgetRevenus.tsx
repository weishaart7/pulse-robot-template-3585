import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useRevenus } from '@/hooks/useBudget';
import { RevenusForm } from '@/components/budget/RevenusForm';
import { BudgetList } from '@/components/budget/BudgetList';
import { Revenu } from '@/services/budgetService';
import { DisplayMode, PersonFilter, PersonNames } from '@/pages/budget/BudgetSection';

interface BudgetRevenusProps {
  displayMode: DisplayMode;
  personFilter: PersonFilter;
  personNames: PersonNames;
}

export const BudgetRevenus = ({ displayMode, personFilter, personNames }: BudgetRevenusProps) => {
  const [showRevenusForm, setShowRevenusForm] = useState(false);
  const [editingRevenu, setEditingRevenu] = useState<Revenu | undefined>();
  const {
    revenus: allRevenus,
    loading: revenusLoading,
    createRevenu,
    updateRevenu,
    deleteRevenu
  } = useRevenus();

  // Filtrer par personne (individuel = uniquement les éléments explicitement attribués + moitié des communs)
  const revenus = useMemo(() => {
    if (personFilter === 'couple') return allRevenus;
    const targetName = personFilter === 'utilisateur' 
      ? personNames.userFullName.toLowerCase() 
      : personNames.partnerFullName.toLowerCase();
    const commonValues = ['le couple', 'couple', 'commun', 'les deux'];
    
    return allRevenus
      .filter(r => {
        const beneficiaire = r.beneficiaire?.toLowerCase() || '';
        return beneficiaire === targetName || commonValues.some(cv => beneficiaire.includes(cv));
      })
      .map(r => {
        const beneficiaire = r.beneficiaire?.toLowerCase() || '';
        if (commonValues.some(cv => beneficiaire.includes(cv))) {
          return { ...r, montant: (r.montant || 0) / 2 };
        }
        return r;
      });
  }, [allRevenus, personFilter, personNames]);

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
      {showRevenusForm && (
        <RevenusForm 
          revenu={editingRevenu} 
          onSubmit={handleSubmitRevenu} 
          onCancel={handleCancelRevenu} 
          open={showRevenusForm}
        />
      )}

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