import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const FiscalOverviewCard = () => {
  const [activeTab, setActiveTab] = useState("income");

  // Données aléatoires pour le graphique - couleurs inversées de transmission
  const chartData = [
    { name: 'IR', value: 9365, color: '#05aaa4' },
    { name: 'Prélèvements sociaux', value: 2500, color: '#caeffb' },
    { name: 'IFI', value: 0, color: '#0b5563' }
  ];

  const incomeData = {
    revenus_placement: "Aucun revenus",
    revenus_fonciers: "Aucun revenus", 
    revenus_exceptionnels: "Non",
    contributions_hauts_revenus: "Non",
    retenues_acomptes: "0€",
    solde_a_payer: "5 000€"
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Imposition totale</CardTitle>
        <div className="text-2xl font-bold">9 365 €</div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>IR et contributions sociales: 9 365 €</span>
          <span>IFI: 0 €</span>
          <span>Autres impôts: 0 €</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique */}
          <div className="flex items-center justify-center">
            <div className="relative w-80 h-80">
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
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold">15,61 %</div>
                  <div className="text-sm text-muted-foreground">Impôts/Revenus</div>
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
                      <span>Revenus de placements :</span>
                      <span className="font-medium">{incomeData.revenus_placement}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenus fonciers :</span>
                      <span className="font-medium">{incomeData.revenus_fonciers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenus exceptionnels (quotient) :</span>
                      <span className="font-medium">{incomeData.revenus_exceptionnels}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Contributions sur les hauts revenus :</span>
                      <span className="font-medium">{incomeData.contributions_hauts_revenus}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        Retenus et acomptes 2024
                      </div>
                      <div className="text-lg font-bold">{incomeData.retenues_acomptes}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 text-center">
                      <div className="text-xs text-muted-foreground mb-1">
                        Solde à payer en 2025
                      </div>
                      <div className="text-lg font-bold">{incomeData.solde_a_payer}</div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="wealth" className="space-y-4 mt-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center text-muted-foreground">
                      Aucun impôt sur la fortune immobilière
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