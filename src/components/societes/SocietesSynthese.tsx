import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocietes } from '@/hooks/useSocietes';
import { 
  useSocietesIFI, 
  useSocietesTransmission,
  getSocieteCategory,
  getSocieteTypeLabel 
} from '@/hooks/useSocietesIntegration';
import { 
  Building2, 
  TrendingUp, 
  Wallet, 
  Scale, 
  ShieldCheck, 
  Users,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export const SocietesSynthese = () => {
  const { societes, isLoading } = useSocietes();
  const ifiData = useSocietesIFI(societes);
  const transmissionData = useSocietesTransmission(societes);

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
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
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground">
          Commencez par ajouter vos sociétés dans l'onglet "Mes sociétés".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              {ifiData.nombreSocietesExonerees > 0 && (
                <span className="text-green-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {ifiData.nombreSocietesExonerees} exonérée{ifiData.nombreSocietesExonerees > 1 ? 's' : ''}
                </span>
              )}
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
            {transmissionData.totalAbattementDutreil > 0 && (
              <p className="text-xs text-green-600 flex items-center">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                -{transmissionData.totalAbattementDutreil.toLocaleString('fr-FR')} € (Dutreil)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Répartition */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Répartition par type
            </CardTitle>
            <CardDescription>Catégories de vos sociétés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/70" />
                    <span className="text-sm">{category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">
                      ({Math.round((count / totalSocietes) * 100)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Régime fiscal
            </CardTitle>
            <CardDescription>Répartition IS / IR</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(regimeCounts).map(([regime, count]) => (
                <div key={regime} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={regime.includes('Sociétés') ? 'default' : 'secondary'}>
                      {regime.includes('Sociétés') ? 'IS' : regime.includes('Revenu') ? 'IR' : '?'}
                    </Badge>
                    <span className="text-sm">{regime}</span>
                  </div>
                  <span className="text-sm font-medium">{count} société{count > 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des sociétés avec indicateurs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperçu des sociétés</CardTitle>
          <CardDescription>Synthèse de vos participations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {societes.map(societe => {
              const ifiCalc = ifiData.calculations.find(c => c.societe.id === societe.id);
              const transCalc = transmissionData.calculations.find(c => c.societe.id === societe.id);
              
              return (
                <div key={societe.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-background rounded-lg">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{societe.denomination}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-muted-foreground">
                          {getSocieteTypeLabel(societe.type_societe)}
                        </span>
                        {societe.holding && societe.holding !== 'Non' && (
                          <Badge variant="outline" className="text-xs">
                            Holding {societe.holding}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(societe.valeur_estimee || 0).toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-xs text-muted-foreground">Valeur estimée</p>
                    </div>

                    <div className="text-right min-w-[100px]">
                      {ifiCalc?.type === 'professionnel_exonere' ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          IFI exonéré
                        </Badge>
                      ) : ifiCalc?.valeurIFI ? (
                        <>
                          <p className="text-sm font-medium text-primary">
                            {ifiCalc.valeurIFI.toLocaleString('fr-FR')} €
                          </p>
                          <p className="text-xs text-muted-foreground">Impact IFI</p>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>

                    <div className="text-right min-w-[80px]">
                      {transCalc?.eligibleDutreil ? (
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                          Dutreil
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
