import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react';

export const PatrimoineResume = () => {
  const { assets } = useAssets();
  const { passifs } = usePassifs();
  const { emprunts } = useEmprunts();

  const financialSummary = useMemo(() => {
    const totalActifs = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const totalPassifs = 
      passifs.reduce((sum, passif) => sum + (passif.montant_du || 0), 0) +
      emprunts.reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0), 0);
    const patrimoineNet = totalActifs - totalPassifs;

    return {
      totalActifs,
      totalPassifs,
      patrimoineNet
    };
  }, [assets, passifs, emprunts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Carte Répartition avec graphique et synthèse */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graphique à gauche */}
            <div className="flex items-center justify-center">
              <PatrimoineChart 
                assets={assets} 
                selectedCategory={null}
              />
            </div>

            {/* Synthèse à droite */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-green-100">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Actifs</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.totalActifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-red-100">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Passifs</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.totalPassifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Patrimoine net</p>
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(financialSummary.patrimoineNet)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ligne avec trois cartes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte Patrimoine par tête */}
        <Card>
          <CardHeader>
            <CardTitle>Patrimoine par tête</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Contenu à venir
            </p>
          </CardContent>
        </Card>

        {/* Carte vide 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Carte 2</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Contenu à venir
            </p>
          </CardContent>
        </Card>

        {/* Carte vide 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Carte 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Contenu à venir
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};