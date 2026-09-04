import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BAREME_2026 } from '@/lib/fiscalite';
import { FiscalOverview } from '@/hooks/useFiscalOverview';

interface TaxRateCardProps {
  overview: FiscalOverview;
}

function formatEuros(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} €`;
}

function formatTaux(taux: number): string {
  return `${Math.round(taux * 100)} %`;
}

const TaxRateCard = ({ overview }: TaxRateCardProps) => {
  const { loading, foyerRenseigne, revenusRenseignes, parts, impot } = overview;

  const brackets = BAREME_2026.map((tranche, index) => ({
    ...tranche,
    seuilBas: index === 0 ? 0 : BAREME_2026[index - 1].seuil,
    active: tranche.taux === impot.tmi,
  }));

  const activeBracket = brackets.find(b => b.active);
  const margeAvantTranche = activeBracket && activeBracket.seuil !== Infinity
    ? Math.max(0, activeBracket.seuil - impot.quotientFamilial)
    : null;

  const getUserPositionInBracket = () => {
    if (!activeBracket || activeBracket.seuil === Infinity) return 0;
    const bracketRange = activeBracket.seuil - activeBracket.seuilBas;
    const userPositionInRange = impot.quotientFamilial - activeBracket.seuilBas;
    if (bracketRange <= 0) return 0;
    return Math.min(100, Math.max(0, (userPositionInRange / bracketRange) * 100));
  };

  const statsCards = [
    { title: 'Revenu net imposable en France (salaires + actionnariat)', value: formatEuros(impot.revenuImposable) },
    ...(impot.revenuExonereTauxEffectif > 0
      ? [{ title: 'Revenu exonéré retenu (taux effectif)', value: formatEuros(impot.revenuExonereTauxEffectif) }]
      : []),
    { title: 'Nombre de parts', value: parts.nombreParts.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) },
    { title: 'Plafonnement du quotient familial', value: impot.plafonnementApplique ? 'Oui' : 'Non' },
    { title: 'Impôt net (IR)', value: formatEuros(impot.impotNet) },
  ];

  if (loading) {
    return (
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Taux marginal d'imposition</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Taux marginal d'imposition</CardTitle>
        <div className="text-2xl font-bold">{formatTaux(impot.tmi)}</div>
        {(!foyerRenseigne || !revenusRenseignes) && (
          <p className="text-sm text-muted-foreground">
            Calcul basé sur des valeurs par défaut — complétez votre foyer fiscal et vos revenus pour un résultat personnalisé.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Graphique des tranches et détails */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barre de progression des tranches */}
            <div className="space-y-3">
              <div className="relative flex h-6 overflow-hidden">
                {brackets.map((bracket, index) => (
                  <div
                    key={index}
                    className="flex-1 relative"
                    style={{ backgroundColor: bracket.active ? '#2ec4b6' : '#cbf3f0' }}
                  >
                    {bracket.active && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-red-600"
                        style={{ left: `${getUserPositionInBracket()}%` }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Labels des taux */}
              <div className="flex justify-between text-sm">
                {brackets.map((bracket, index) => (
                  <div key={index} className="text-center flex-1">
                    <div className={`font-medium ${bracket.active ? 'font-bold text-primary' : ''}`}>
                      {formatTaux(bracket.taux)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Seuils en euros */}
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span></span>
                {BAREME_2026.slice(0, -1).map(tranche => (
                  <span key={tranche.seuil}>{formatEuros(tranche.seuil)}</span>
                ))}
                <span></span>
              </div>
            </div>

            {/* Détails des seuils */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Quotient familial ({impot.revenuExonereTauxEffectif > 0 ? 'revenu mondial' : 'revenu'} / part)
                  </div>
                  <div className="text-xl font-bold">{formatEuros(impot.quotientFamilial)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="text-sm text-muted-foreground mb-1">
                    Marge avant tranche supérieure
                  </div>
                  <div className="text-xl font-bold">{margeAvantTranche !== null ? formatEuros(margeAvantTranche) : '—'}</div>
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
