import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Shield, Building, Briefcase, DollarSign, FileText } from 'lucide-react';

export const InvestmentDashboard = () => {
  return (
    <div className="p-6">
      <div className="mb-6 bg-card rounded-lg p-6">
        <div className="flex justify-between items-start">
          <h2 className="text-base text-foreground/70 font-medium">Bienvenue sur votre plateforme d'investissement.</h2>
          
          <div className="bg-muted rounded-lg p-6 max-w-md">
            <h3 className="text-base font-semibold text-foreground mb-3">Parlez avec un expert</h3>
            <p className="text-muted-foreground text-xs mb-4 leading-relaxed">
              Notre équipe de conseillers en investissement est là pour vous accompagner dans vos décisions financières et vous proposer les meilleures opportunités du marché.
            </p>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors">
              Planifier un rendez-vous
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Assurance</CardTitle>
            <CardDescription>
              Assurance-vie, contrats luxembourgeois et capitalisation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>26 166,5 € valorisation</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Immobilier</CardTitle>
            <CardDescription>
              SCPI et Club deals immobiliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Building className="w-4 h-4" />
              <span>7 000 € valorisation</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Private Equity</CardTitle>
            <CardDescription>
              Fonds de Private Equity et investissements alternatifs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>Contenu à venir...</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Produits Structurés</CardTitle>
            <CardDescription>
              Solutions d'investissement sur mesure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>Contenu à venir...</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Investir en Société</CardTitle>
            <CardDescription>
              150 0-B Ter et contrats de capitalisation PM
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Briefcase className="w-4 h-4" />
              <span>Contenu à venir...</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle className="text-xl">Financier</CardTitle>
            <CardDescription>
              Solutions financières diversifiées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>Contenu à venir...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};