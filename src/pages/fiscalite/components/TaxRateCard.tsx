import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

const TaxRateCard = () => {
  const taxBrackets = [
    { rate: "0%", min: 0, max: 11294, active: false },
    { rate: "11%", min: 11295, max: 28797, active: false },
    { rate: "30%", min: 28798, max: 82341, active: true },
    { rate: "41%", min: 82342, max: 177106, active: false },
    { rate: "45%", min: 177107, max: null, active: false }
  ];

  // Données pour le graphique Recharts
  const chartData = taxBrackets.map((bracket, index) => ({
    name: bracket.rate,
    value: 1, // Toutes les barres ont la même hauteur
    isActive: bracket.active
  }));

  const currentIncome = 54000;
  const currentBracket = taxBrackets.find(bracket => 
    currentIncome >= bracket.min && (bracket.max === null || currentIncome <= bracket.max)
  );

  const marginBeforeNext = currentBracket?.max ? currentBracket.max - currentIncome : 0;

  // Custom label component pour la rotation à 270°
  const CustomLabel = (props: any) => {
    const { x, y, width, height, payload } = props;
    
    // Vérification de sécurité pour éviter les erreurs
    if (!payload || !payload.name || typeof x !== 'number' || typeof y !== 'number') {
      return null;
    }
    
    return (
      <text 
        x={x + 8} 
        y={y + height - 8} 
        fill="#81023a" 
        fontSize="12"
        fontWeight="500"
        transform={`rotate(270, ${x + 8}, ${y + height - 8})`}
        textAnchor="start"
      >
        {payload.name}
      </text>
    );
  };

  const statsCards = [
    { title: "Revenu imposable", value: "54 000 €" },
    { title: "Nombre de parts", value: "1" },
    { title: "Plafonnement du quotient familial", value: "Non" },
    { title: "Revenu fiscal de référence", value: "54 000 €" }
  ];

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle>Taux marginal d'imposition</CardTitle>
        <div className="text-2xl font-bold">30 %</div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique des tranches et détails */}
          <div className="lg:col-span-2 space-y-6">
            {/* Graphique avec barres verticales Recharts */}
            <div className="relative h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart
                   data={chartData}
                   margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                   barCategoryGap="10%"
                 >
                   <XAxis
                     dataKey="name"
                     axisLine={false}
                     tickLine={false}
                     tick={false}
                   />
                   <YAxis hide />
                   <Bar 
                     dataKey="value" 
                     radius={[0, 0, 0, 0]}
                   >
                     {chartData.map((entry, index) => (
                       <Cell
                         key={`cell-${index}`}
                         fill={entry.isActive ? "#ff00b8" : "#81023a"}
                       />
                     ))}
                   </Bar>
                 </BarChart>
              </ResponsiveContainer>
              
              {/* Labels superposés avec rotation */}
              <div className="absolute bottom-2 left-8 right-8 flex justify-between">
                {taxBrackets.map((bracket, index) => (
                  <div key={index} className="flex-1 flex justify-center">
                    <div 
                      className="text-xs font-medium origin-bottom"
                      style={{
                        color: "#81023a",
                        transform: "rotate(-90deg)",
                        transformOrigin: "center bottom",
                        writingMode: "vertical-rl"
                      }}
                    >
                      {bracket.rate}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Détails des seuils */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Seuil de la tranche d'imposition
                  </div>
                  <div className="text-xl font-bold">29 316 €</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Marge avant tranche supérieure
                  </div>
                  <div className="text-xl font-bold">29 824 €</div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cartes de statistiques */}
          <div className="space-y-4">
            {statsCards.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-4">
                  <div className="text-xs text-muted-foreground mb-1">
                    {stat.title}
                  </div>
                  <div className="text-lg font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaxRateCard;