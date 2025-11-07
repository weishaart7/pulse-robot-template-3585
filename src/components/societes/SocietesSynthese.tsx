import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSocietes } from '@/hooks/useSocietes';
import { Building2, TrendingUp, Wallet } from 'lucide-react';

export const SocietesSynthese = () => {
  const { societes, isLoading } = useSocietes();

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const totalSocietes = societes.length;
  const societesPatrimoniales = societes.filter(s => 
    s.type_societe?.toLowerCase().includes('sci') || 
    s.type_societe?.toLowerCase().includes('patrimonial')
  ).length;
  
  const valeurTotale = societes.reduce((sum, s) => sum + (s.valeur_estimee || 0), 0);
  const tresorerie = societes.reduce((sum, s) => sum + (s.capital_social || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sociétés</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSocietes}</div>
            <p className="text-xs text-muted-foreground">
              dont {societesPatrimoniales} patrimoniale{societesPatrimoniales > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur détenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valeurTotale.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground">
              {totalSocietes > 0 ? `Moyenne: ${(valeurTotale / totalSocietes).toLocaleString('fr-FR')} €` : 'Aucune société'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trésorerie disponible</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tresorerie.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground">
              Capital social cumulé
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};