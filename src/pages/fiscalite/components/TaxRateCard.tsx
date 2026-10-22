import { PanelTitle } from '@/components/layout/workspace-panel';
import { BAREME_2026 } from '@/lib/fiscalite';
import { FiscalOverview } from '@/hooks/useFiscalOverview';
import { cn } from '@/lib/utils';
import { formatEuros, LigneDetail } from './FiscalOverviewCard';

// Taux marginal d'imposition : chiffre principal, barème 2026 avec la tranche du foyer et le repère du
// quotient familial, puis les données du calcul (quotient, marge, revenus, parts).

const TaxRateCard = ({ overview }: { overview: FiscalOverview }) => {
  const { parts, impot } = overview;

  const tranches = BAREME_2026.map((t, i) => ({ ...t, seuilBas: i === 0 ? 0 : BAREME_2026[i - 1].seuil }));
  const active = tranches.find((t) => t.taux === impot.tmi);
  const position = active && active.seuil !== Infinity && active.seuil > active.seuilBas
    ? Math.min(100, Math.max(0, ((impot.quotientFamilial - active.seuilBas) / (active.seuil - active.seuilBas)) * 100))
    : 0;
  const marge = active && active.seuil !== Infinity ? Math.max(0, active.seuil - impot.quotientFamilial) : null;

  return (
    <div className="border-b border-border px-8 py-6">
      <PanelTitle>Taux marginal d'imposition</PanelTitle>
      <p className="mt-2 text-[22px] font-medium leading-none tracking-[-0.02em] tabular-nums">{Math.round(impot.tmi * 100)} %</p>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <div className="grid grid-cols-5 gap-[2px]">
            {tranches.map((t) => {
              const estActive = t === active;
              return (
                <div key={t.taux}>
                  <div className={cn('relative h-3 rounded-[1px]', estActive ? 'bg-lagon' : 'bg-secondary')}>
                    {estActive && (
                      <span aria-hidden className="absolute -top-1 h-5 w-[2px] -translate-x-1/2 bg-foreground" style={{ left: `${position}%` }} />
                    )}
                  </div>
                  <p className={cn('mt-2 text-[13px] tabular-nums', estActive ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                    {Math.round(t.taux * 100)} %
                  </p>
                  <p className="text-[11.5px] tabular-nums text-muted-foreground">
                    {t.seuil === Infinity ? `> ${formatEuros(t.seuilBas)}` : `≤ ${formatEuros(t.seuil)}`}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-[2px]">
            <div className="rounded-[2px] bg-secondary/50 p-3">
              <p className="text-[11.5px] text-muted-foreground">
                Quotient familial ({impot.revenuExonereTauxEffectif > 0 ? 'revenu mondial' : 'revenu'} / part)
              </p>
              <p className="mt-1 text-[16px] font-medium tabular-nums">{formatEuros(impot.quotientFamilial)}</p>
            </div>
            <div className="rounded-[2px] bg-secondary/50 p-3">
              <p className="text-[11.5px] text-muted-foreground">Marge avant tranche supérieure</p>
              <p className="mt-1 text-[16px] font-medium tabular-nums">{marge !== null ? formatEuros(marge) : '—'}</p>
            </div>
          </div>
        </div>

        <div>
          <LigneDetail label="Revenu net imposable" valeur={formatEuros(impot.revenuImposable)} />
          <LigneDetail label="Revenu fiscal de référence (RFR)" valeur={formatEuros(impot.revenuFiscalReference)} />
          {impot.revenuExonereTauxEffectif > 0 && (
            <LigneDetail label="Revenu exonéré retenu (taux effectif)" valeur={formatEuros(impot.revenuExonereTauxEffectif)} />
          )}
          <LigneDetail label="Nombre de parts" valeur={parts.nombreParts.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} />
          <LigneDetail label="Plafonnement du quotient familial" valeur={impot.plafonnementApplique ? 'Oui' : 'Non'} />
          <LigneDetail label="Impôt net (IR)" valeur={formatEuros(impot.impotNet)} />
        </div>
      </div>
    </div>
  );
};

export default TaxRateCard;
