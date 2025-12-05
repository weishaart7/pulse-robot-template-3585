import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, Scale, FileText, Check, X } from 'lucide-react';

interface SocieteFormData {
  type_societe: string;
  holding?: string;
  type_activite?: string;
  regime_fiscal?: string;
  valeur_estimee?: number;
  pourcentage_ifi?: number;
  valeur_ifi?: number;
  resultat_net?: number;
  nombre_salaries?: number;
}

interface SocieteFinancesImpactFiscalProps {
  formData: SocieteFormData;
}

export const SocieteFinancesImpactFiscal: React.FC<SocieteFinancesImpactFiscalProps> = ({
  formData,
}) => {
  const formatCurrency = (value: number | null | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Determine if eligible for IFI professional exemption
  const isIFIExempt = useMemo(() => {
    // Holdings animatrices and sociétés opérationnelles can be exempt
    return formData.holding === 'animatrice' || 
           (formData.type_activite && ['commerciale', 'artisanale', 'industrielle', 'liberale'].includes(formData.type_activite));
  }, [formData.holding, formData.type_activite]);

  // Determine if eligible for Dutreil exemption
  const isDutreilEligible = useMemo(() => {
    // Eligible if operational activity (not pure holding or patrimoine)
    if (formData.holding === 'passive') return false;
    if (formData.type_societe === 'SCI' && formData.type_activite === 'immobilier') return false;
    return formData.type_activite && ['commerciale', 'artisanale', 'industrielle', 'liberale', 'agricole'].includes(formData.type_activite);
  }, [formData.type_societe, formData.holding, formData.type_activite]);

  // Calculate IS estimate
  const isEstimate = useMemo(() => {
    if (!formData.resultat_net || formData.resultat_net <= 0) return null;
    if (formData.regime_fiscal !== 'IS') return null;

    const resultat = formData.resultat_net;
    // Simplified IS calculation (2024 rates)
    // 15% up to 42,500€, 25% above
    if (resultat <= 42500) {
      return resultat * 0.15;
    }
    return (42500 * 0.15) + ((resultat - 42500) * 0.25);
  }, [formData.resultat_net, formData.regime_fiscal]);

  // Calculate IFI impact
  const ifiImpact = useMemo(() => {
    if (isIFIExempt) return { value: 0, exempt: true };
    
    const ifiValue = formData.valeur_ifi || 
      (formData.valeur_estimee && formData.pourcentage_ifi 
        ? formData.valeur_estimee * (formData.pourcentage_ifi / 100) 
        : 0);
    
    return { value: ifiValue, exempt: false };
  }, [formData.valeur_estimee, formData.pourcentage_ifi, formData.valeur_ifi, isIFIExempt]);

  // Calculate Dutreil abatement
  const dutreilAbatement = useMemo(() => {
    if (!isDutreilEligible || !formData.valeur_estimee) return null;
    return formData.valeur_estimee * 0.75; // 75% exemption
  }, [isDutreilEligible, formData.valeur_estimee]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Impact fiscal
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IFI Section */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">IFI (Impôt sur la Fortune Immobilière)</span>
            </div>
            {isIFIExempt ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Exonéré
              </Badge>
            ) : (
              <Badge variant="outline">
                Taxable
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valeur IFI estimée</p>
              <p className="font-medium">{formatCurrency(ifiImpact.value)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">% immobilier</p>
              <p className="font-medium">{formData.pourcentage_ifi || 0}%</p>
            </div>
          </div>
          {isIFIExempt && (
            <p className="text-xs text-muted-foreground">
              Cette société est considérée comme bien professionnel et peut être exonérée d'IFI.
            </p>
          )}
        </div>

        {/* Transmission / Dutreil Section */}
        <div className="p-4 bg-muted/30 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Transmission (Pacte Dutreil)</span>
            </div>
            {isDutreilEligible ? (
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                <Check className="h-3 w-3 mr-1" />
                Éligible
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/30">
                <X className="h-3 w-3 mr-1" />
                Non éligible
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Valeur successorale</p>
              <p className="font-medium">{formatCurrency(formData.valeur_estimee)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Abattement Dutreil</p>
              <p className="font-medium text-green-600">
                {dutreilAbatement ? `-${formatCurrency(dutreilAbatement)}` : '-'}
              </p>
            </div>
          </div>
          {isDutreilEligible && (
            <p className="text-xs text-muted-foreground">
              Exonération de 75% de la valeur des titres sous conditions (engagement collectif de 2 ans, engagement individuel de 4 ans).
            </p>
          )}
        </div>

        {/* IS Estimate Section */}
        {formData.regime_fiscal === 'IS' && (
          <div className="p-4 bg-muted/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">IS (Impôt sur les Sociétés)</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Résultat net</p>
                <p className="font-medium">{formatCurrency(formData.resultat_net)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IS estimé</p>
                <p className="font-medium">{formatCurrency(isEstimate)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Taux réduit 15% jusqu'à 42 500 €, puis 25% au-delà.
            </p>
          </div>
        )}

        {formData.regime_fiscal === 'IR' && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">IR (Impôt sur le Revenu)</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Les résultats sont directement imposés au niveau des associés selon leur quote-part.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
