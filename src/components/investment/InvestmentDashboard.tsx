import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PieChart } from 'lucide-react';

export const InvestmentDashboard = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Bienvenue sur l'espace de démo ImerisLabs</h2>
            <p className="text-muted-foreground mt-1">
              Découvrez nos solutions d'investissement personnalisées
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimoine Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99 471,5 €</div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +4781,5 €
              </span>
              <span className="text-green-600">+9,63%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Mensuelle</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+2 566,5 €</div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +11,66%
              </span>
              <span className="text-muted-foreground">vs mois dernier</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Diversification</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Classes d'actifs
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Investment Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Investissements Actifs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-medium">Assurance-vie</p>
                  <p className="text-sm text-muted-foreground">26 166,5 €</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-medium">+2 566,5 €</p>
                <p className="text-sm text-green-600">+11,66%</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-secondary-foreground" />
                </div>
                <div>
                  <p className="font-medium">SCPI</p>
                  <p className="text-sm text-muted-foreground">7 000 €</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-green-600 font-medium">+910 €</p>
                <p className="text-sm text-green-600">+14,94%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Opportunités d'Investissement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border border-dashed border-primary/30 rounded-lg">
              <h4 className="font-medium text-primary mb-2">Private Equity</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Découvrez nos fonds de Private Equity sélectionnés pour leur performance.
              </p>
              <button className="text-sm text-primary hover:underline">
                En savoir plus →
              </button>
            </div>

            <div className="p-4 border border-dashed border-secondary/30 rounded-lg">
              <h4 className="font-medium text-secondary mb-2">Produits Structurés</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Investissements sur mesure adaptés à votre profil de risque.
              </p>
              <button className="text-sm text-secondary hover:underline">
                En savoir plus →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};