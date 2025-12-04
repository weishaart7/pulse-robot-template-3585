import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocietesIFI, useSocietesTransmission, getSocieteCategory, getSocieteTypeLabel } from '@/hooks/useSocietesIntegration';
import { Building2, TrendingUp, Wallet, Scale, ShieldCheck, Users, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react';
export const SocietesSynthese = () => {
  const {
    societes,
    isLoading
  } = useSocietes();
  const ifiData = useSocietesIFI(societes);
  const transmissionData = useSocietesTransmission(societes);
  if (isLoading) {
    return <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>;
  }
  const totalSocietes = societes.length;
  const valeurTotale = societes.reduce((sum, s) => sum + (s.valeur_estimee || 0), 0);
  const capitalTotal = societes.reduce((sum, s) => sum + (s.capital_social || 0), 0);

  // Group by category
  const categoryCounts = societes.reduce((acc, s) => {
    const cat = getSocieteCategory(s);
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Group by regime fiscal
  const regimeCounts = societes.reduce((acc, s) => {
    const regime = s.regime_fiscal || 'Non défini';
    acc[regime] = (acc[regime] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Holdings count
  const holdings = societes.filter(s => s.holding && s.holding !== 'Non');
  const holdingsAnimatrices = societes.filter(s => s.holding === 'Animatrice');
  if (totalSocietes === 0) {
    return <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground">
          Commencez par ajouter vos sociétés dans l'onglet "Mes sociétés".
        </p>
      </div>;
  }
  return <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sociétés</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSocietes}</div>
            <p className="text-xs text-muted-foreground">
              dont {holdings.length} holding{holdings.length > 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur totale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {valeurTotale.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground">
              Capital: {capitalTotal.toLocaleString('fr-FR')} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impact IFI</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {ifiData.totalValeurIFI.toLocaleString('fr-FR')} €
            </div>
            <div className="flex items-center text-xs">
              {ifiData.nombreSocietesExonerees > 0 && <span className="text-green-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {ifiData.nombreSocietesExonerees} exonérée{ifiData.nombreSocietesExonerees > 1 ? 's' : ''}
                </span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transmission</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {transmissionData.totalApresAbattement.toLocaleString('fr-FR')} €
            </div>
            {transmissionData.totalAbattementDutreil > 0 && <p className="text-xs text-green-600 flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -{transmissionData.totalAbattementDutreil.toLocaleString('fr-FR')} € (Dutreil)
              </p>}
          </CardContent>
        </Card>
      </div>

      {/* Répartition */}
      

      {/* Liste des sociétés avec indicateurs */}
      <Card>
        
        
      </Card>
    </div>;
};