import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Check } from 'lucide-react';

interface AVFiscalInfoProps {
  fiscalRegime: string;
  contractAge: number;
  subscriberAge: number | null;
}

export const AVFiscalInfo: React.FC<AVFiscalInfoProps> = ({ fiscalRegime, contractAge, subscriberAge }) => {
  const getRegimeLabel = () => {
    switch (fiscalRegime) {
      case 'avant_1997': return 'Avant le 26/09/1997';
      case 'entre_1997_2017': return 'Du 26/09/1997 au 27/09/2017';
      case 'apres_2017': return 'Après le 27/09/2017';
      default: return 'Date inconnue';
    }
  };

  const renderFiscalRules = () => {
    switch (fiscalRegime) {
      case 'avant_1997':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Impôt sur le revenu : <strong>Exonéré</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Prélèvements sociaux : <strong>17,2%</strong> sur les gains</span>
            </div>
          </div>
        );

      case 'entre_1997_2017':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">
                {contractAge < 8 ? '⏱ Durée < 8 ans' : '✅ Durée ≥ 8 ans'}
              </p>
              {contractAge < 8 ? (
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>IR : {contractAge < 4 ? '35%' : '15%'} (ou TMI sur option)</li>
                  <li>PS : 17,2%</li>
                </ul>
              ) : (
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Abattement : {subscriberAge !== null && (subscriberAge >= 18) ? '4 600 €' : '4 600 €'} (célibataire) / 9 200 € (couple)</li>
                  <li>IR : 7,5% sur l'excédent</li>
                  <li>PS : 17,2%</li>
                </ul>
              )}
            </div>
          </div>
        );

      case 'apres_2017':
        return (
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">
                {contractAge < 8 ? '⏱ Durée < 8 ans' : '✅ Durée ≥ 8 ans'}
              </p>
              {contractAge < 8 ? (
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>PFU (flat tax) : 12,8%</li>
                  <li>PS : 17,2%</li>
                  <li>Total : <strong>30%</strong></li>
                </ul>
              ) : (
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Abattement : 4 600 € (célibataire) / 9 200 € (couple)</li>
                  <li>Versements ≤ 150 000 € : IR à 7,5%</li>
                  <li>Versements &gt; 150 000 € : IR à 12,8% sur l'excédent</li>
                  <li>PS : 17,2%</li>
                </ul>
              )}
            </div>
          </div>
        );

      default:
        return (
          <p className="text-sm text-muted-foreground">
            Renseignez la date de souscription dans le patrimoine pour afficher le régime fiscal applicable.
          </p>
        );
    }
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Fiscalité des rachats</CardTitle>
          <Badge variant="outline">{getRegimeLabel()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {renderFiscalRules()}
      </CardContent>
    </Card>
  );
};
