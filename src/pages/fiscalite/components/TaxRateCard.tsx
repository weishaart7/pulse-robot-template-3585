import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TaxRateCard = () => {
  const taxBrackets = [
    { rate: "0%", min: 0, max: 11294, color: "bg-slate-300" },
    { rate: "11%", min: 11295, max: 28797, color: "bg-slate-400" },
    { rate: "30%", min: 28798, max: 82341, color: "bg-primary", active: true },
    { rate: "41%", min: 82342, max: 177106, color: "bg-slate-500" },
    { rate: "45%", min: 177107, max: null, color: "bg-slate-600" }
  ];

  const currentIncome = 54000;
  const currentBracket = taxBrackets.find(bracket => 
    currentIncome >= bracket.min && (bracket.max === null || currentIncome <= bracket.max)
  );

  const marginBeforeNext = currentBracket?.max ? currentBracket.max - currentIncome : 0;

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
            {/* Graphique avec barres verticales */}
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-2 h-32">
                {taxBrackets.map((bracket, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div className="relative w-full">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-300 ${
                          bracket.active 
                            ? 'bg-gradient-to-t from-orange-500 to-orange-400 shadow-lg' 
                            : 'bg-gradient-to-t from-pink-300 to-pink-200'
                        }`}
                        style={{
                          height: `${20 + (parseInt(bracket.rate) * 2)}px`
                        }}
                      />
                      {bracket.active && (
                        <div className="absolute top-2 left-1/2 transform -translate-x-1/2">
                          <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[4px] border-b-orange-500 ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Labels des taux */}
              <div className="flex justify-between">
                {taxBrackets.map((bracket, index) => (
                  <div key={index} className="flex-1 text-center">
                    <div className={`text-sm font-medium ${bracket.active ? 'font-bold text-orange-600' : 'text-muted-foreground'}`}>
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