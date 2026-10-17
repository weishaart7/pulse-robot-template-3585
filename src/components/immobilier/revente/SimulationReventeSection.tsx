import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import type { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import {
  estimationAmortissementsLMNP,
  NATURE_LMNP,
  simulerRevente,
  travauxReelsParDefaut,
} from '@/lib/immobilier/revente';

interface SimulationReventeSectionProps {
  asset: Asset;
  emprunts: Emprunt[];
}

const toNum = (v: string): number => (v.trim() === '' ? 0 : Number(v) || 0);
const signed = (v: number) => `${v >= 0 ? '+' : ''}${formatCurrency(v)}`;

// « Simuler une revente » : hypothèses modifiables (date, prix, frais, travaux, amortissements LMNP,
// pénalités de remboursement anticipé) à gauche, plus-value, impôt, crédit à rembourser et net perçu
// par le foyer à droite. Rien n'est enregistré (lib/immobilier/revente.ts).
export const SimulationReventeSection = ({ asset, emprunts }: SimulationReventeSectionProps) => {
  const isLMNP = asset.nature === NATURE_LMNP;
  const [dateVente, setDateVente] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [prixVente, setPrixVente] = useState(String(asset.valeur_estimee ?? ''));
  const [fraisVente, setFraisVente] = useState('');
  const [travauxReels, setTravauxReels] = useState(String(travauxReelsParDefaut(asset) || ''));
  // null : estimation recalculée selon la date de vente ; sinon montant saisi par l'utilisateur.
  const [amortissementsSaisis, setAmortissementsSaisis] = useState<string | null>(null);
  const [residenceServices, setResidenceServices] = useState(false);
  const [penalitesSaisies, setPenalitesSaisies] = useState('');

  const date = useMemo(() => {
    const d = new Date(dateVente);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [dateVente]);
  const amortissementsEstimes = useMemo(() => Math.round(estimationAmortissementsLMNP(asset, date)), [asset, date]);

  const resultat = simulerRevente(asset, emprunts, {
    dateVente: date,
    prixVente: toNum(prixVente),
    fraisVente: toNum(fraisVente),
    travauxReels: toNum(travauxReels),
    amortissementsDeduits: amortissementsSaisis === null ? amortissementsEstimes : toNum(amortissementsSaisis),
    residenceServices,
    penalitesRemboursement: penalitesSaisies.trim() === '' ? null : toNum(penalitesSaisies),
  });

  const champ = (label: string, value: string, onChange: (v: string) => void, opts: { placeholder?: string; aide?: string } = {}) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={value}
          placeholder={opts.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="bg-background border-border pr-8 shadow-none tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
      </div>
      {opts.aide && <p className="text-[12px] text-muted-foreground">{opts.aide}</p>}
    </div>
  );

  return (
    <div>
      <PanelTitle>Simuler une revente</PanelTitle>
      <p className="mt-1 max-w-2xl text-[12.5px] text-muted-foreground">
        Plus-value des particuliers (abattements pour durée de détention, IR 19 %, prélèvements sociaux 17,2 %, surtaxe),
        puis remboursement du crédit. Montants à la part du foyer ; rien n'est enregistré.
      </p>

      {resultat.statut === 'hors_perimetre' ? (
        <p className="mt-4 rounded-[2px] border border-border bg-secondary/40 px-3 py-2 text-[12.5px]">{resultat.message}</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Date de vente</Label>
              <Input
                type="date"
                value={dateVente}
                onChange={(e) => setDateVente(e.target.value)}
                className="bg-background border-border shadow-none tabular-nums"
              />
            </div>
            {champ('Prix de vente', prixVente, setPrixVente, { aide: 'Valeur estimée par défaut.' })}
            {champ('Frais de vente', fraisVente, setFraisVente, { placeholder: '0', aide: 'Agence et diagnostics à votre charge.' })}
            {champ('Travaux réels retenus', travauxReels, setTravauxReels, {
              placeholder: '0',
              aide: 'Amélioration, construction ou agrandissement facturés par une entreprise et jamais déduits des revenus. Comparés au forfait de 15 % (après 5 ans), le plus favorable est retenu.',
            })}
            {isLMNP && (
              <>
                {champ('Amortissements déduits', amortissementsSaisis ?? String(amortissementsEstimes), setAmortissementsSaisis, {
                  aide: amortissementsSaisis === null
                    ? 'Estimation maximale (immeuble, hors mobilier) jusqu’à la date de vente — à remplacer par le cumul réel de vos liasses.'
                    : 'Montant saisi.',
                })}
                <label className="flex cursor-pointer items-start gap-3 self-end rounded-[2px] border border-border bg-secondary/40 px-3 py-2.5 text-[12.5px]">
                  <Checkbox checked={residenceServices} onCheckedChange={(v) => setResidenceServices(v === true)} className="mt-0.5" />
                  Résidence étudiante, seniors ou EHPAD (amortissements non réintégrés)
                </label>
              </>
            )}
            {resultat.credits.length > 0 &&
              champ('Pénalités de remboursement anticipé', penalitesSaisies, setPenalitesSaisies, {
                placeholder: String(Math.round(resultat.credits.reduce((s, c) => s + c.penalitesPlafond, 0))),
                aide: 'Vide : plafond légal (6 mois d’intérêts, au plus 3 % du capital restant dû). 0 si votre prêt n’en prévoit pas.',
              })}
          </div>

          <div>
            <dl>
              <SummaryRow label="Prix net"><span className="tabular-nums">{formatCurrency(resultat.prixNet)}</span></SummaryRow>
              <SummaryRow label="Plus-value">
                <span className="tabular-nums">{signed(resultat.plusValueBrute)}</span>
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">avant forfaits</span>
              </SummaryRow>
              <SummaryRow label="Impôt">
                <span className="tabular-nums">{formatCurrency(resultat.impot)}</span>
                <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">{resultat.regime.badge}</span>
              </SummaryRow>
              {resultat.regime.ir !== null && resultat.impot > 0 && (
                <SummaryRow label="Détail">
                  <span className="font-normal tabular-nums">
                    IR {formatCurrency(resultat.regime.ir)} ({resultat.regime.irDetail}) · PS {formatCurrency(resultat.regime.ps ?? 0)} ({resultat.regime.psDetail})
                    {resultat.regime.totalDetail && ` · ${resultat.regime.totalDetail}`}
                  </span>
                </SummaryRow>
              )}
              {resultat.credits.length > 0 && (
                <>
                  <SummaryRow label="Crédit">
                    <span className="tabular-nums">{formatCurrency(resultat.capitalRestantDu)}</span>
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">capital restant dû</span>
                  </SummaryRow>
                  <SummaryRow label="Pénalités"><span className="tabular-nums">{formatCurrency(resultat.penalites)}</span></SummaryRow>
                </>
              )}
            </dl>
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-[12px] text-muted-foreground">Net perçu par le foyer</p>
              <p className={`mt-1 text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums ${resultat.netPercu < 0 ? 'text-destructive' : 'text-foreground'}`}>
                {formatCurrency(resultat.netPercu)}
              </p>
            </div>
            {[resultat.regime.note, ...resultat.notes].filter(Boolean).length > 0 && (
              <ul className="mt-4 space-y-1.5 text-[12px] text-muted-foreground">
                {[resultat.regime.note, ...resultat.notes].filter(Boolean).map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
