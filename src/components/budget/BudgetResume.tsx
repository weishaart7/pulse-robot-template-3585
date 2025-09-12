import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveSankey } from '@nivo/sankey';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetTypes';

export const BudgetResume = () => {
  const { revenus, loading: revenusLoading } = useRevenus();
  const { charges, loading: chargesLoading } = useCharges();

  const sankeyData = useMemo(() => {
    if (revenusLoading || chargesLoading || !revenus.length || !charges.length) {
      return { nodes: [], links: [] };
    }

    const nodes = [];
    const links = [];

    // Créer les nœuds pour les revenus
    const revenusByCategory = revenus.reduce((acc, revenu) => {
      const category = revenu.nature || 'Autres revenus';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += revenu.montant || 0;
      return acc;
    }, {} as Record<string, number>);

    // Créer les nœuds pour les charges
    const chargesByCategory = charges.reduce((acc, charge) => {
      const category = charge.nature || 'Autres charges';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += charge.montant || 0;
      return acc;
    }, {} as Record<string, number>);

    // Ajouter les nœuds de revenus
    Object.keys(revenusByCategory).forEach(category => {
      nodes.push({ id: category, nodeColor: 'hsl(142, 76%, 36%)' });
    });

    // Ajouter le nœud central "Budget"
    nodes.push({ id: 'Budget', nodeColor: 'hsl(217, 91%, 60%)' });

    // Ajouter les nœuds de charges
    Object.keys(chargesByCategory).forEach(category => {
      nodes.push({ id: category, nodeColor: 'hsl(0, 84%, 60%)' });
    });

    // Créer les liens des revenus vers le budget
    Object.entries(revenusByCategory).forEach(([category, amount]) => {
      links.push({
        source: category,
        target: 'Budget',
        value: amount
      });
    });

    // Créer les liens du budget vers les charges
    Object.entries(chargesByCategory).forEach(([category, amount]) => {
      links.push({
        source: 'Budget',
        target: category,
        value: amount
      });
    });

    return { nodes, links };
  }, [revenus, charges, revenusLoading, chargesLoading]);

  const totalRevenus = revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0);
  const totalCharges = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);
  const solde = totalRevenus - totalCharges;

  if (revenusLoading || chargesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Revenus</div>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenus.toLocaleString('fr-FR')} €
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Charges</div>
            <div className="text-2xl font-bold text-red-600">
              {totalCharges.toLocaleString('fr-FR')} €
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Solde</div>
            <div className={`text-2xl font-bold ${solde >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {solde.toLocaleString('fr-FR')} €
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flux Budgétaire</CardTitle>
        </CardHeader>
        <CardContent>
          {sankeyData.nodes.length > 0 ? (
            <div style={{ height: '500px' }}>
              <ResponsiveSankey
                data={sankeyData}
                margin={{ top: 40, right: 160, bottom: 40, left: 50 }}
                align="justify"
                colors={{ scheme: 'category10' }}
                nodeOpacity={1}
                nodeHoverOthersOpacity={0.35}
                nodeThickness={18}
                nodeSpacing={24}
                nodeBorderWidth={0}
                nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
                linkOpacity={0.5}
                linkHoverOthersOpacity={0.1}
                linkContract={3}
                enableLinkGradient={true}
                labelPosition="outside"
                labelOrientation="vertical"
                labelPadding={16}
                labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
                animate={true}
                motionConfig="gentle"
              />
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Aucune donnée disponible. Ajoutez des revenus et des charges pour voir le diagramme des flux.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};