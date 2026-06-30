import React from 'react';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useIFIImmeubleBatis,
  useIFIImmeublesNonBatis,
  useIFIBiensDetenusIndirectement,
  useIFIBiensProfessionnelsExoneres,
  useIFIPassifsDeductions,
  useIFIHypotheses,
} from '@/hooks/useIFI';
import { computeIFI } from '@/lib/ifi';

const BaremeIFISection = () => {
  const { biens: immeublesBatis, loading: loadingBatis } = useIFIImmeubleBatis();
  const { biens: immeublesNonBatis, loading: loadingNonBatis } = useIFIImmeublesNonBatis();
  const { biens: biensIndirects, loading: loadingIndirects } = useIFIBiensDetenusIndirectement();
  const { loading: loadingExoneres } = useIFIBiensProfessionnelsExoneres();
  const { passifs, loading: loadingPassifs } = useIFIPassifsDeductions();
  const { hypotheses, loading: loadingHypotheses } = useIFIHypotheses();

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

  const plafonnementActif = hypotheses.find(h => h.type_hypothese === 'plafonnement_ifi')?.actif ?? true;
  const revenusN1 = hypotheses.find(h => h.type_hypothese === 'plafonnement_revenus_n1')?.valeur;
  const irPsN = hypotheses.find(h => h.type_hypothese === 'plafonnement_ir_ps_n')?.valeur;
  const plafonnementApplicable = plafonnementActif && !!revenusN1 && revenusN1 > 0;

  const ifiResult = computeIFI({
    immeublesBatis: immeublesBatis.map(bien => ({
      valeurTotale: bien.valeur_totale || 0,
      bienMixte: bien.bien_mixte,
      fractionTaxable: bien.fraction_taxable,
      abattementResidencePrincipale: bien.categorie === 'residence-principale',
    })),
    immeublesNonBatis: immeublesNonBatis.map(bien => ({
      valeurTotale: bien.valeur_totale || 0,
      bienMixte: bien.bien_mixte,
      fractionTaxable: bien.fraction_taxable,
      abattementBoisForets: bien.abattement_bois_forets,
    })),
    biensIndirects: biensIndirects.map(bien => ({ valeurBien: bien.valeur_bien || 0 })),
    passifs: passifs.map(passif => ({ montant: passif.montant || 0 })),
    plafonnement: plafonnementApplicable ? { revenusN1: revenusN1!, irPsN: irPsN || 0 } : undefined,
  });

  const {
    assietteTaxable: baseImposable,
    tranches: tranchesDetaillees,
    ifiTheorique,
    decote,
    montantApresDecote,
    reductionPlafonnement,
    ifiFinal,
  } = ifiResult;

  const isLoading = loadingBatis || loadingNonBatis || loadingIndirects || loadingExoneres || loadingPassifs || loadingHypotheses;

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
              {reductionPlafonnement > 0 && (
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={3}>Réduction plafonnement (art. 979 CGI)</TableCell>
                  <TableCell className="text-right">-{formatCurrency(reductionPlafonnement)}</TableCell>
                </TableRow>
              )}
              <TableRow className="bg-secondary/20 font-bold">
                <TableCell colSpan={3}>Montant de l'IFI dû</TableCell>
                <TableCell className="text-right">{formatCurrency(ifiFinal)}</TableCell>
              </TableRow>
              <TableRow className="bg-blue-50 dark:bg-blue-950 border-t-2">
                <TableCell colSpan={3} className="font-semibold">Patrimoine net après IFI</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(baseImposable - ifiFinal)}</TableCell>
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

      {plafonnementActif && !plafonnementApplicable && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Renseignez vos revenus N-1 dans les hypothèses pour activer le plafonnement.
            </p>
          </CardContent>
        </Card>
      )}

      {reductionPlafonnement > 0 && (
        <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">Plafonnement applicable</h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                L'IFI et l'IR/PS de l'année excèdent 75 % de vos revenus N-1 : une réduction de {formatCurrency(reductionPlafonnement)} s'applique.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BaremeIFISection;
