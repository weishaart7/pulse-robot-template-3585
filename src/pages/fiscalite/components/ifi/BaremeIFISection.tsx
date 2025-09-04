import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIFIImmeubleBatis, useIFIImmeublesNonBatis, useIFIBiensDetenusIndirectement, useIFIBiensProfessionnelsExoneres } from '@/hooks/useIFI';

const BaremeIFISection = () => {
  const { biens: immeublesBatis, loading: loadingBatis, fetchBiens: fetchBatis } = useIFIImmeubleBatis();
  const { biens: immeublesNonBatis, loading: loadingNonBatis, fetchBiens: fetchNonBatis } = useIFIImmeublesNonBatis();
  const { biens: biensIndirects, loading: loadingIndirects, fetchBiens: fetchIndirects } = useIFIBiensDetenusIndirectement();
  const { biens: biensExoneres, loading: loadingExoneres, fetchBiens: fetchExoneres } = useIFIBiensProfessionnelsExoneres();
  
  const [baseImposable, setBaseImposable] = useState(0);

  useEffect(() => {
    fetchBatis();
    fetchNonBatis();
    fetchIndirects();
    fetchExoneres();
  }, []);

  useEffect(() => {
    // Calcul de la base imposable en utilisant les valeurs déclarées
    const biensDirects = [
      ...immeublesBatis.map(bien => ({
        valeurTotale: bien.valeur_totale || 0,
        valeurDeclaree: bien.categorie === 'residence-principale' ? (bien.valeur_totale || 0) * 0.7 : bien.valeur_totale || 0
      })),
      ...immeublesNonBatis.map(bien => ({
        valeurTotale: bien.valeur_totale || 0,
        valeurDeclaree: bien.valeur_totale || 0
      }))
    ];

    const biensIndirectsList = biensIndirects.map(bien => ({
      valeurTotale: bien.valeur_bien || 0,
      valeurDeclaree: bien.valeur_bien || 0
    }));

    // Utilise les valeurs déclarées pour la base imposable
    const totalValeurDeclaree = biensDirects.reduce((sum, bien) => sum + bien.valeurDeclaree, 0) + 
                               biensIndirectsList.reduce((sum, bien) => sum + bien.valeurDeclaree, 0);
    
    // Pour l'instant, pas de passifs implémentés, donc base imposable = valeurs déclarées
    setBaseImposable(totalValeurDeclaree);
  }, [immeublesBatis, immeublesNonBatis, biensIndirects]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)} %`;
  };

  // Calcul de l'IFI selon le barème
  const calculateIFI = (montant: number) => {
    let ifi = 0;
    
    if (montant <= 800000) {
      return 0;
    }
    
    if (montant > 800000) {
      const tranche1 = Math.min(montant - 800000, 500000); // De 800k à 1.3M
      ifi += tranche1 * 0.005;
    }
    
    if (montant > 1300000) {
      const tranche2 = Math.min(montant - 1300000, 1270000); // De 1.3M à 2.57M
      ifi += tranche2 * 0.007;
    }
    
    if (montant > 2570000) {
      const tranche3 = Math.min(montant - 2570000, 2430000); // De 2.57M à 5M
      ifi += tranche3 * 0.010;
    }
    
    if (montant > 5000000) {
      const tranche4 = Math.min(montant - 5000000, 5000000); // De 5M à 10M
      ifi += tranche4 * 0.0125;
    }
    
    if (montant > 10000000) {
      const tranche5 = montant - 10000000; // Au-delà de 10M
      ifi += tranche5 * 0.015;
    }
    
    return Math.round(ifi);
  };

  // Calcul détaillé par tranche
  const getDetailedCalculation = (montant: number) => {
    const tranches = [];
    
    // Tranche 0%
    tranches.push({
      min: 0,
      max: 800000,
      taux: 0,
      montantTranche: Math.min(montant, 800000),
      impot: 0
    });
    
    if (montant > 800000) {
      const montantTranche = Math.min(montant - 800000, 500000);
      tranches.push({
        min: 800000,
        max: 1300000,
        taux: 0.005,
        montantTranche,
        impot: montantTranche * 0.005
      });
    }
    
    if (montant > 1300000) {
      const montantTranche = Math.min(montant - 1300000, 1270000);
      tranches.push({
        min: 1300000,
        max: 2570000,
        taux: 0.007,
        montantTranche,
        impot: montantTranche * 0.007
      });
    }
    
    if (montant > 2570000) {
      const montantTranche = Math.min(montant - 2570000, 2430000);
      tranches.push({
        min: 2570000,
        max: 5000000,
        taux: 0.010,
        montantTranche,
        impot: montantTranche * 0.010
      });
    }
    
    if (montant > 5000000) {
      const montantTranche = Math.min(montant - 5000000, 5000000);
      tranches.push({
        min: 5000000,
        max: 10000000,
        taux: 0.0125,
        montantTranche,
        impot: montantTranche * 0.0125
      });
    }
    
    if (montant > 10000000) {
      const montantTranche = montant - 10000000;
      tranches.push({
        min: 10000000,
        max: Infinity,
        taux: 0.015,
        montantTranche,
        impot: montantTranche * 0.015
      });
    }
    
    return tranches.filter(t => t.montantTranche > 0);
  };

  const ifiTheorique = calculateIFI(baseImposable);
  const tranchesDetaillees = getDetailedCalculation(baseImposable);
  
  // Calcul de la décote si applicable
  const decote = (baseImposable >= 1300000 && baseImposable <= 1400000) 
    ? Math.max(0, 17500 - (0.0125 * baseImposable))
    : 0;
    
  const montantAvantReduction = Math.max(0, ifiTheorique - decote);

  const isLoading = loadingBatis || loadingNonBatis || loadingIndirects || loadingExoneres;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Barème de l'IFI</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (baseImposable === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Barème de l'IFI</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun bien renseigné pour le calcul de l'IFI.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ajoutez vos biens dans la section "Liste des biens à l'IFI" pour voir le calcul.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <h2 className="text-xl font-semibold">Barème de l'IFI</h2>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary mb-2">IFI théorique</h3>
            <p className="text-3xl font-bold text-primary">{formatCurrency(ifiTheorique)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calcul détaillé de l'IFI</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tranche</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-center">Taux</TableHead>
                <TableHead className="text-right">Impôt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tranchesDetaillees.map((tranche, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {tranche.max === Infinity 
                      ? `À partir de ${formatCurrency(tranche.min)}`
                      : `De ${formatCurrency(tranche.min)} à ${formatCurrency(tranche.max)}`
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tranche.montantTranche)}
                  </TableCell>
                  <TableCell className="text-center">
                    {formatPercentage(tranche.taux)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(tranche.impot)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/10 font-semibold">
                <TableCell colSpan={3}>Total IFI théorique</TableCell>
                <TableCell className="text-right">{formatCurrency(ifiTheorique)}</TableCell>
              </TableRow>
              {decote > 0 && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3}>Décote applicable</TableCell>
                  <TableCell className="text-right">-{formatCurrency(decote)}</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-secondary/20 font-bold">
                <TableCell colSpan={3}>Montant de l'impôt avant réduction</TableCell>
                <TableCell className="text-right">{formatCurrency(montantAvantReduction)}</TableCell>
              </TableRow>
              <TableRow className="bg-blue-50 dark:bg-blue-950 border-t-2">
                <TableCell colSpan={3} className="font-semibold">Patrimoine net après IFI</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(baseImposable - ifiTheorique)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {decote > 0 && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Décote applicable</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Votre patrimoine étant compris entre 1,3M€ et 1,4M€, une décote de {formatCurrency(decote)} s'applique.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Formule: 17 500 € - (1,25% × {formatCurrency(baseImposable)}) = {formatCurrency(decote)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BaremeIFISection;