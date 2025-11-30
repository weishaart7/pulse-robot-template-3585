import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { MatrimonialRegimeOptions } from '@/components/famille/MatrimonialRegimeOptions';

interface SituationMatrimonialeFormAdvancedProps {
  regimeMatrimonial: string;
  userProfile?: any;
  spouseProfile?: any;
}

export function SituationMatrimonialeFormAdvanced({
  regimeMatrimonial,
  userProfile,
  spouseProfile
}: SituationMatrimonialeFormAdvancedProps) {
  
  const getRegimeType = (regime: string) => {
    if (regime.includes('Communauté réduite')) return 'communaute_reduite';
    if (regime.includes('Communauté de meubles')) return 'communaute_meubles';
    if (regime.includes('Communauté universelle')) return 'communaute_universelle';
    if (regime.includes('Séparation de biens')) return 'separation_biens';
    if (regime.includes('Participation aux acquêts')) return 'participation_acquets';
    return 'communaute_reduite';
  };

  const regimeType = getRegimeType(regimeMatrimonial);

  const getRegimeDescription = () => {
    switch (regimeType) {
      case 'communaute_reduite':
        return "Les biens acquis après le mariage sont communs. Les biens possédés avant restent propres à chaque époux.";
      case 'communaute_meubles':
        return "Tous les biens meubles (même acquis avant le mariage) sont communs. Les immeubles restent propres.";
      case 'communaute_universelle':
        return "Tous les biens (présents et futurs) sont communs, sauf disposition contraire dans le contrat.";
      case 'separation_biens':
        return "Chaque époux reste propriétaire de ses biens acquis avant et pendant le mariage.";
      case 'participation_acquets':
        return "Pendant le mariage, fonctionne comme une séparation de biens. Au divorce, partage de l'enrichissement.";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <span>Régime matrimonial</span>
                <Badge variant="outline" className="ml-2">
                  {regimeMatrimonial}
                </Badge>
              </CardTitle>
              <CardDescription className="mt-2">
                {getRegimeDescription()}
              </CardDescription>
            </div>
            <div className="rounded-full bg-primary/10 p-2">
              <Info className="h-5 w-5 text-primary" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted/50 p-4 border border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Vous pouvez personnaliser votre régime matrimonial avec des clauses spécifiques adaptées à votre situation.
              Ces clauses peuvent protéger certains biens, aménager le partage, ou optimiser la transmission au survivant.
            </p>
            <MatrimonialRegimeOptions 
              regimeType={regimeType as any}
              userProfile={userProfile}
              spouseProfile={spouseProfile}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
