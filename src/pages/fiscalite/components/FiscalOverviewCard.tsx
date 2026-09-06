import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectorsDonut, DonutSector } from '@/components/ui/sectors-donut';
import { FiscalOverview } from '@/hooks/useFiscalOverview';
import { cn } from '@/lib/utils';

interface FiscalOverviewCardProps {
  overview: FiscalOverview;
}

function formatEuros(valeur: number): string {
  return `${Math.round(valeur).toLocaleString('fr-FR')} €`;
}

/** Une ligne de détail avec puce colorée, cohérente avec le pattern déjà utilisé dans le résumé Fiscalité de la Vue d'ensemble (Dashboard.tsx). */
const DetailRow = ({ label, value, color, muted = false }: { label: string; value: string; color?: string; muted?: boolean }) => {
  const colored = !muted && !!color;
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-md bg-muted/30">
      <div className="flex items-center gap-2 min-w-0">
        <div
          className={cn('h-6 w-6 shrink-0 rounded-full flex items-center justify-center', !colored && 'bg-muted')}
          style={colored ? { backgroundColor: `${color}1a` } : undefined}
        >
          <div
            className={cn('h-1.5 w-1.5 rounded-full', !colored && 'bg-muted-foreground/50')}
            style={colored ? { backgroundColor: color } : undefined}
          />
        </div>
        <span className="text-sm min-w-0 truncate">{label}</span>
      </div>
      <span className={`text-sm font-semibold shrink-0 ${muted ? 'text-muted-foreground' : ''}`}>{value}</span>
    </div>
  );
};

const FiscalOverviewCard = ({ overview }: FiscalOverviewCardProps) => {
  const [activeTab, setActiveTab] = useState("income");
  const { loading, foyerRenseigne, revenusRenseignes, impot, revenuSalaires, gainsActionnariat, revenuExonereTauxEffectif, pensionsRetraitesRentes, prelevementsSociauxCapitauxMobiliers, prelevementsSociauxPensionsRetraitesRentes } = overview;

  const ratioImpotsRevenus = impot.revenuImposable > 0
    ? `${((impot.impotNet / impot.revenuImposable) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`
    : '—';

  const composition: DonutSector[] = [
    { label: 'Salaires', value: revenuSalaires.totalNetImposable, color: '#05aaa4' },
    { label: "Gains d'actionnariat", value: gainsActionnariat.totalNetImposable, color: '#2AA173' },
    { label: 'Pensions, retraites, rentes', value: pensionsRetraitesRentes.totalNetImposable, color: '#0b5563' },
  ]
    .filter(s => (s.value ?? 0) > 0)
    .map(s => ({ ...s, pct: impot.revenuImposable > 0 ? ((s.value ?? 0) / impot.revenuImposable) * 100 : 0 }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Imposition totale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chargement…</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Imposition totale</CardTitle>
        {(!foyerRenseigne || !revenusRenseignes) && (
          <p className="text-sm text-muted-foreground">
            Calcul basé sur des valeurs par défaut — complétez votre foyer fiscal et vos revenus pour un résultat personnalisé.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-md p-3 border border-primary/20">
          <div className="text-xs font-medium text-muted-foreground mb-1">Impôt sur le revenu (salaires, actionnariat, pensions)</div>
          <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            {formatEuros(impot.impotNet)}
          </div>
        </div>

        <div className="space-y-1.5">
          <DetailRow
            label="Prélèvements sociaux (capitaux mobiliers)"
            value={formatEuros(prelevementsSociauxCapitauxMobiliers.prelevementsSociaux)}
          />
          <DetailRow
            label="Prélèvements sociaux (pensions, retraites, rentes)"
            value={formatEuros(prelevementsSociauxPensionsRetraitesRentes.prelevementsSociaux)}
          />
          <DetailRow label="Prélèvements sociaux (salaires, gains d'actionnariat)" value="Non calculé" muted />
          <DetailRow label="IFI — voir le simulateur dédié" value="Non calculé" muted />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          <div className="flex items-center justify-center py-2">
            {composition.length > 0 ? (
              <SectorsDonut
                sectors={composition}
                formatValue={formatEuros}
                centerLabel={ratioImpotsRevenus}
                centerCaption="IR / revenu imposable"
              />
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Aucun revenu imposable saisi pour l'instant.
              </div>
            )}
          </div>

          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="income" className="text-xs px-2 text-wrap break-words hyphens-auto">
                  Impôts sur le revenu
                </TabsTrigger>
                <TabsTrigger value="wealth" className="text-xs px-2 text-wrap break-words hyphens-auto">
                  Impôts sur la fortune immobilière
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <DetailRow label="Revenu net imposable (salaires)" value={formatEuros(revenuSalaires.totalNetImposable)} color="#05aaa4" />
                  <DetailRow label="Gains d'actionnariat salarié imposables" value={formatEuros(gainsActionnariat.totalNetImposable)} color="#2AA173" />
                  <DetailRow label="Pensions, retraites et rentes imposables" value={formatEuros(pensionsRetraitesRentes.totalNetImposable)} color="#0b5563" />
                  {revenuExonereTauxEffectif.totalRetenu > 0 && (
                    <DetailRow
                      label="Revenus exonérés retenus (taux effectif)"
                      value={`${formatEuros(revenuExonereTauxEffectif.totalRetenu)} · ${(impot.tauxEffectif * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`}
                    />
                  )}
                  <DetailRow label="Revenus de placements" value="Non calculé" muted />
                  <DetailRow label="Revenus fonciers" value="Non calculé" muted />
                  <DetailRow label="Revenus exceptionnels (quotient)" value="Non calculé" muted />
                  <DetailRow label="Contributions sur les hauts revenus" value="Non calculé" muted />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Décote appliquée</div>
                    <div className="text-lg font-bold">{formatEuros(impot.decote)}</div>
                  </div>
                  <div className="rounded-md bg-muted/30 p-3 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Impôt net à payer (IR)</div>
                    <div className="text-lg font-bold">{formatEuros(impot.impotNet)}</div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="wealth" className="mt-4">
                <div className="rounded-md bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                  Non calculé ici — voir le simulateur IFI dédié
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FiscalOverviewCard;
