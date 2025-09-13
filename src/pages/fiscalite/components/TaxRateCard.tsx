import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TaxRateCard = () => {
  const taxBrackets = [
    { rate: "0%", min: 0, max: 11294, color: "#cbf3f0" },
    { rate: "11%", min: 11295, max: 28797, color: "#cbf3f0" },
    { rate: "30%", min: 28798, max: 82341, color: "#2ec4b6", active: true },
    { rate: "41%", min: 82342, max: 177106, color: "#cbf3f0" },
    { rate: "45%", min: 177107, max: null, color: "#cbf3f0" }
  ];

  const currentIncome = 54000;
  const currentBracket = taxBrackets.find(bracket => 
    currentIncome >= bracket.min && (bracket.max === null || currentIncome <= bracket.max)
  );

  const marginBeforeNext = currentBracket?.max ? currentBracket.max - currentIncome : 0;

  // Calculer la position proportionnelle de l'utilisateur dans son secteur
  const getUserPositionInBracket = () => {
    if (!currentBracket || currentBracket.max === null) return 0;
    const bracketRange = currentBracket.max - currentBracket.min;
    const userPositionInRange = currentIncome - currentBracket.min;
    return (userPositionInRange / bracketRange) * 100;
  };

  const userPositionPercentage = getUserPositionInBracket();

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
            {/* Barre de progression des tranches */}
            <div className="space-y-3">
              <div className="relative flex h-6 overflow-hidden">
                {taxBrackets.map((bracket, index) => (
                  <div
                    key={index}
                    className="flex-1 relative"
                    style={{ backgroundColor: bracket.color }}
                  >
                    {/* Trait proportionnel pour l'utilisateur */}
                    {bracket.active && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                        style={{ left: `${userPositionPercentage}%` }}
                      />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Labels des taux */}
              <div className="flex justify-between text-sm">
                {taxBrackets.map((bracket, index) => (
                  <div key={index} className="text-center flex-1">
                    <div className={`font-medium ${bracket.active ? 'font-bold text-primary' : ''}`}>
                      {bracket.rate}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Seuils en euros */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span></span> {/* Pas de seuil pour 0% */}
                <span>11 498 €</span>
                <span>29 316 €</span>
                <span>83 824 €</span>
                <span>180 295 €</span>
                <span></span> {/* Pas de seuil supérieur pour 45% */}
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