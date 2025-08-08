import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, Plus } from 'lucide-react';

const WealthOverview = () => {
  const netWorth = 21210000;
  const managedAssets = 2070000;
  const cashEquivalents = 2800000;
  const totalAssets = 21260000;

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const assetBreakdown = [
    { name: 'Public Assets', value: 3920000, percentage: 18, color: 'bg-blue-500' },
    { name: 'Company Equity', value: 8810000, percentage: 41, color: 'bg-purple-500' },
    { name: 'Real Estate', value: 3900000, percentage: 18, color: 'bg-green-500' },
    { name: 'Cash & Equivalents', value: 2800000, percentage: 13, color: 'bg-orange-500' },
    { name: 'Private Investments', value: 610500, percentage: 3, color: 'bg-red-500' },
    { name: 'Fund Investments', value: 884060, percentage: 4, color: 'bg-cyan-500' },
    { name: 'Crypto', value: 341430, percentage: 2, color: 'bg-yellow-500' },
  ];

  const liabilities = [
    { name: 'Loan', value: -56300, percentage: 99.3 },
    { name: 'Credit Card', value: -410, percentage: 0.7 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Good afternoon, Utilisateur</h1>
          <p className="text-muted-foreground mt-1">Voici votre vue d'ensemble financière</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau Compte
          </Button>
          <Button variant="outline" size="sm">
            Télécharger Document
          </Button>
          <Button size="sm">
            Parler à un expert
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Net Worth</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-foreground">{formatCurrency(netWorth)}</div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+2.5% ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Managed Assets</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-foreground">{formatCurrency(managedAssets)}</div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm text-green-600">+1.2% ce mois</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cash & Equivalents</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-semibold text-foreground">{formatCurrency(cashEquivalents)}</div>
            <div className="flex items-center mt-2">
              <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
              <span className="text-sm text-red-600">-0.5% ce mois</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              All Assets
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {formatCurrency(totalAssets)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assetBreakdown.map((asset, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${asset.color}`}></div>
                    <span className="text-sm text-foreground">{asset.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">{formatCurrency(asset.value)}</span>
                    <span className="text-sm text-muted-foreground w-8">{asset.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-medium flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              All Liabilities
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ${Math.abs(liabilities.reduce((sum, item) => sum + item.value, 0)).toLocaleString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {liabilities.map((liability, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-red-500"></div>
                    <span className="text-sm text-foreground">{liability.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-red-600">
                      ${Math.abs(liability.value).toLocaleString()}
                    </span>
                    <span className="text-sm text-muted-foreground w-8">{liability.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Performance Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Graphique de performance sera affiché ici</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WealthOverview;