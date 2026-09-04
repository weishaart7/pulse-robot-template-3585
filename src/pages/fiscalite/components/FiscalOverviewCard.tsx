import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { FiscalOverview } from '@/hooks/useFiscalOverview';

interface FiscalOverviewCardProps {
  overview: FiscalOverview;
}

function formatEuros(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} €`;
}

const FiscalOverviewCard = ({ overview }: FiscalOverviewCardProps) => {
  const [activeTab, setActiveTab] = useState("income");
  const { loading, foyerRenseigne, revenusRenseignes, impot, revenuSalaires, gainsActionnariat } = overview;

  const chartData = impot.impotNet > 0
    ? [{ name: 'IR (salaires + actionnariat)', value: impot.impotNet, color: '#05aaa4' }]
    : [];

  const ratioImpotsRevenus = impot.revenuImposable > 0
    ? `${((impot.impotNet / impot.revenuImposable) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
    : '—';

  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Imposition totale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Imposition totale</CardTitle>
        <div className="text-2xl font-bold">{formatEuros(impot.impotNet)}</div>
        <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
          <span>IR (salaires + actionnariat) : {formatEuros(impot.impotNet)}</span>
          <span>Prélèvements sociaux : non calculé</span>
          <span>IFI : non calculé — voir le simulateur IFI</span>
        </div>
        {(!foyerRenseigne || !revenusRenseignes) && (
          <p className="text-sm text-muted-foreground">
            Calcul basé sur des valeurs par défaut — complétez votre foyer fiscal et vos revenus pour un résultat personnalisé.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique */}
          <div className="flex items-center justify-center">
            <div className="relative w-80 h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={120}
                      outerRadius={140}
                      paddingAngle={2}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center rounded-full border-8 border-muted" />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">{ratioImpotsRevenus}</div>
                  <div className="text-sm text-muted-foreground">IR / Revenu imposable</div>
                </div>
              </div>
            </div>
          </div>

          {/* Onglets et détails */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 overflow-hidden">
                <TabsTrigger value="income" className="text-xs px-2 text-wrap break-words hyphens-auto">
                  Impôts sur le revenu
                </TabsTrigger>
                <TabsTrigger value="wealth" className="text-xs px-2 text-wrap break-words hyphens-auto">
                  Impôts sur la fortune immobilière
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Revenu net imposable (salaires) :</span>
                      <span className="font-medium">{formatEuros(revenuSalaires.totalNetImposable)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gains d'actionnariat salarié imposables :</span>
                      <span className="font-medium">{formatEuros(gainsActionnariat.totalNetImposable)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenus de placements :</span>
                      <span className="font-medium">Non calculé</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenus fonciers :</span>
                      <span className="font-medium">Non calculé</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenus exceptionnels (quotient) :</span>
                      <span className="font-medium">Non calculé</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Contributions sur les hauts revenus :</span>
                      <span className="font-medium">Non calculé</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        Décote appliquée
                      </div>
                      <div className="text-lg font-bold">{formatEuros(impot.decote)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        Impôt net à payer (IR)
                      </div>
                      <div className="text-lg font-bold">{formatEuros(impot.impotNet)}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="wealth" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center text-muted-foreground">
                      Non calculé ici — voir le simulateur IFI dédié
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiscalOverviewCard;
