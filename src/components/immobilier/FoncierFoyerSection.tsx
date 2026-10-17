import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { Chip, PanelTitle, SummaryRow, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { assetService, type Asset, type AssetCharge, type AssetRevenu } from '@/services/assetService';
import {
  deficitFoncierService,
  toDeficitFoncierReporte,
  type DeficitFoncierReporteRecord,
} from '@/services/deficitFoncierService';
import {
  buildBienFoncierInput,
  computeFoyerFoncier,
  PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE,
  SEUIL_MICRO_FONCIER,
  type BienFoncierInput,
  type FoyerFoncierResult,
  type TypeDeficitFoncierReporte,
} from '@/lib/immobilier/foncierFoyer';
import { formatCurrency } from '@/lib/patrimoine/utils';
import type { Emprunt } from '@/services/passifService';

const ANNEE_COURANTE = new Date().getFullYear();

const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

export const FoncierFoyerSection = ({ emprunts = [] }: { emprunts?: Emprunt[] }) => {
  const { toast } = useToast();
  const [biensNus, setBiensNus] = useState<Asset[]>([]);
  const [revenusParBien, setRevenusParBien] = useState<Record<string, AssetRevenu[]>>({});
  const [chargesParBien, setChargesParBien] = useState<Record<string, AssetCharge[]>>({});
  const [deficits, setDeficits] = useState<DeficitFoncierReporteRecord[]>([]);
  const [renovationEnergetique, setRenovationEnergetique] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [tmiInput, setTmiInput] = useState('30');
  const [isReporting, setIsReporting] = useState(false);

  const [nouveauDeficit, setNouveauDeficit] = useState({
    annee_origine: String(ANNEE_COURANTE - 1),
    type: 'hors_interets' as TypeDeficitFoncierReporte,
    montant: '',
  });

  const load = async () => {
    setIsLoading(true);
    try {
      const biens = await assetService.getBiensLocationNue();
      setBiensNus(biens);

      const ids = biens.map((b) => b.id).filter((id): id is string => !!id);
      const [revenus, charges, deficitsData] = await Promise.all([
        assetService.getAssetRevenusByAssetIds(ids),
        assetService.getAssetChargesByAssetIds(ids),
        deficitFoncierService.list(),
      ]);

      const revenusMap: Record<string, AssetRevenu[]> = {};
      for (const r of revenus) {
        (revenusMap[r.asset_id] ??= []).push(r);
      }
      const chargesMap: Record<string, AssetCharge[]> = {};
      for (const c of charges) {
        (chargesMap[c.asset_id] ??= []).push(c);
      }
      setRevenusParBien(revenusMap);
      setChargesParBien(chargesMap);
      setDeficits(deficitsData);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur chargement synthèse foncière foyer:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger la synthèse foncière.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tmi = (parseFloat(tmiInput) || 0) / 100;

  const biensInput: BienFoncierInput[] = useMemo(
    () =>
      biensNus.map((asset) =>
        buildBienFoncierInput(
          asset,
          revenusParBien[asset.id!] || [],
          chargesParBien[asset.id!] || [],
          !!renovationEnergetique[asset.id!],
          emprunts,
        ),
      ),
    [biensNus, revenusParBien, chargesParBien, renovationEnergetique, emprunts],
  );

  const result: FoyerFoncierResult = useMemo(
    () => computeFoyerFoncier(biensInput, deficits.map(toDeficitFoncierReporte), tmi, ANNEE_COURANTE),
    [biensInput, deficits, tmi],
  );

  const handleAjouterDeficit = async () => {
    const montant = parseFloat(nouveauDeficit.montant);
    if (!montant || montant <= 0) {
      toast({ title: 'Montant invalide', description: 'Renseignez un montant positif.', variant: 'destructive' });
      return;
    }
    try {
      await deficitFoncierService.create({
        annee_origine: parseInt(nouveauDeficit.annee_origine, 10),
        type: nouveauDeficit.type,
        montant_initial: montant,
        montant_restant: montant,
      });
      setNouveauDeficit({ annee_origine: String(ANNEE_COURANTE - 1), type: 'hors_interets', montant: '' });
      await load();
      toast({ title: 'Déficit reporté ajouté' });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur ajout déficit reporté:', error);
      toast({ title: 'Erreur', description: "Impossible d'ajouter ce déficit reporté.", variant: 'destructive' });
    }
  };

  const handleSupprimerDeficit = async (id: string) => {
    try {
      await deficitFoncierService.delete(id);
      await load();
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur suppression déficit reporté:', error);
      toast({ title: 'Erreur', description: 'Impossible de supprimer ce déficit reporté.', variant: 'destructive' });
    }
  };

  const handleReporter = async () => {
    setIsReporting(true);
    try {
      await deficitFoncierService.reporterAlAnneeSuivante({
        consommation: result.consommationDeficitsReportes,
        anneeCourante: ANNEE_COURANTE,
        nouveauDeficitHorsInterets: result.nouveauDeficitReportableHorsInterets,
        nouveauDeficitInterets: result.nouveauDeficitReportableInterets,
      });
      await load();
      toast({ title: 'Report appliqué', description: 'Le stock de déficits reportés a été mis à jour.' });
    } catch (error) {
      if (import.meta.env.DEV) console.error('Erreur report déficits fonciers:', error);
      toast({ title: 'Erreur', description: "Impossible d'appliquer le report.", variant: 'destructive' });
    } finally {
      setIsReporting(false);
    }
  };

  if (isLoading) {
    return null;
  }

  if (biensNus.length === 0) {
    return null;
  }

  const aQuelqueChoseAReporter =
    result.consommationDeficitsReportes.length > 0 ||
    result.nouveauDeficitReportableHorsInterets > 0 ||
    result.nouveauDeficitReportableInterets > 0;

  const numberInputClass = 'bg-background border-border shadow-none tabular-nums';

  // Bandeaux bord à bord, sur le modèle des panneaux de travail : en-tête, puis paramètres et
  // résultats du foyer à gauche, biens et déficits de l'année à droite, puis stock de déficits reportés.
  return (
    <section className="border-b border-border">
      <div className="px-8 pt-6 pb-4">
        <PanelTitle>Synthèse foncière du foyer · location nue</PanelTitle>
        <p className="mt-1 max-w-3xl text-[12.5px] text-muted-foreground">
          Agrège vos {biensNus.length} bien{biensNus.length > 1 ? 's' : ''} loué{biensNus.length > 1 ? 's' : ''} nu{biensNus.length > 1 ? 's' : ''} pour
          appliquer les règles du régime réel au niveau du foyer fiscal : seuil micro-foncier, plafond du déficit
          imputable, report sur 10 ans.
        </p>
        {result.regimeReelObligatoire && (
          <div className="mt-4 flex items-start gap-3 rounded-[2px] border border-spark/30 bg-spark/5 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-spark" strokeWidth={1.75} />
            <p className="text-[13px] text-foreground">
              <span className="font-medium">Régime réel obligatoire.</span>{' '}
              Vos revenus fonciers bruts s'élèvent à {formatCurrency(result.loyersBrutsFoyer)}, au-delà du seuil du
              micro-foncier ({formatCurrency(SEUIL_MICRO_FONCIER)}).
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
        {/* Paramètre et résultats du foyer. */}
        <div className="px-8 py-6">
          <div className="max-w-[14rem] space-y-1.5">
            <Label htmlFor="tmi-foyer">Taux marginal d'imposition</Label>
            <div className="relative">
              <Input
                id="tmi-foyer"
                type="number"
                step="1"
                min="0"
                max="100"
                value={tmiInput}
                onChange={(e) => setTmiInput(e.target.value)}
                className={`${numberInputClass} pr-8`}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">%</span>
            </div>
          </div>
          <dl className="mt-5">
            <SummaryRow label="Loyers bruts"><span className="tabular-nums">{formatCurrency(result.loyersBrutsFoyer)}</span></SummaryRow>
            <SummaryRow label="Résultat global"><span className="tabular-nums">{formatCurrency(result.resultatFoncierGlobal)}</span></SummaryRow>
            <SummaryRow label="Imposable"><span className="tabular-nums">{formatCurrency(result.resultatFoncierImposable)}</span></SummaryRow>
            <SummaryRow label="Prél. sociaux"><span className="tabular-nums">{formatCurrency(result.prelevementsSociaux)}</span></SummaryRow>
            {result.deficitImputableRevenuGlobal > 0 && (
              <>
                <SummaryRow label="Déficit imputable">
                  <span className="tabular-nums">{formatCurrency(result.deficitImputableRevenuGlobal)}</span>
                  <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">
                    plafond {formatCurrency(result.plafondDeficitApplicable)}
                    {result.plafondDeficitApplicable === PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE ? ' · rénovation énergétique' : ''}
                  </span>
                </SummaryRow>
                <SummaryRow label="Économie d'impôt">
                  <span className="tabular-nums text-positive">{formatCurrency(result.economieImpotPotentielle)}</span>
                  <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">potentielle</span>
                </SummaryRow>
              </>
            )}
          </dl>
        </div>

        {/* Biens pris en compte et mouvements de déficits de l'année. */}
        <div className="min-w-0 px-8 py-6">
          <PanelTitle>Biens pris en compte</PanelTitle>
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[34rem]">
              <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_5.5rem] gap-x-4 border-b border-border pb-2 text-[12px] text-muted-foreground">
                <span>Bien</span>
                <span className="text-right">Loyers bruts</span>
                <span className="text-right">Charges</span>
                <span className="text-right">Intérêts + ass.</span>
                <span className="text-right">Quote-part</span>
                <span className="text-center" title="Rénovation énergétique (DPE E, F ou G)">Rénov. E/F/G</span>
              </div>
              <ul className="divide-y divide-border border-b border-border">
                {biensNus.map((asset, index) => {
                  const bien = biensInput[index];
                  return (
                    <li key={asset.id} className="grid grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))_5.5rem] items-center gap-x-4 py-2.5 text-[13px] tabular-nums">
                      <span className="truncate font-medium text-foreground">{asset.denomination || asset.nature}</span>
                      <span className="text-right">{formatCurrency(bien?.loyersBruts || 0)}</span>
                      <span className="text-right">{formatCurrency(bien?.chargesHorsInterets || 0)}</span>
                      <span className="text-right">{formatCurrency(bien?.interetsEtAssuranceEmprunt || 0)}</span>
                      <span className="text-right">{bien?.quotePart ?? 100} %</span>
                      <span className="flex justify-center">
                        <Checkbox
                          aria-label={`Rénovation énergétique — ${asset.denomination || asset.nature}`}
                          checked={!!renovationEnergetique[asset.id!]}
                          onCheckedChange={(checked) =>
                            setRenovationEnergetique((prev) => ({ ...prev, [asset.id!]: !!checked }))
                          }
                        />
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {result.consommationDeficitsReportes.length > 0 && (
            <div className="mt-5">
              <p className="text-[13px] font-medium text-foreground">Déficits reportés consommés cette année</p>
              <ul className="mt-1.5">
                {result.consommationDeficitsReportes.map((c) => (
                  <li key={c.id} className="flex justify-between gap-4 py-1 text-[13px]">
                    <span className="text-muted-foreground">Report {c.anneeOrigine} · {c.type === 'interets' ? 'intérêts' : 'hors intérêts'}</span>
                    <span className="tabular-nums text-foreground">−{formatCurrency(c.montantConsomme)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(result.nouveauDeficitReportableHorsInterets > 0 || result.nouveauDeficitReportableInterets > 0) && (
            <div className="mt-5 rounded-[2px] border border-spark/30 bg-spark/5 px-4 py-3">
              <p className="text-[13px] font-medium text-foreground">Nouveau déficit reportable cette année</p>
              <p className="text-[12px] text-muted-foreground">Imputable sur les revenus fonciers des 10 années suivantes.</p>
              <ul className="mt-1.5">
                {result.nouveauDeficitReportableHorsInterets > 0 && (
                  <li className="flex justify-between gap-4 py-0.5 text-[13px]">
                    <span className="text-muted-foreground">Hors intérêts</span>
                    <span className="tabular-nums text-foreground">{formatCurrency(result.nouveauDeficitReportableHorsInterets)}</span>
                  </li>
                )}
                {result.nouveauDeficitReportableInterets > 0 && (
                  <li className="flex justify-between gap-4 py-0.5 text-[13px]">
                    <span className="text-muted-foreground">Intérêts d'emprunt</span>
                    <span className="tabular-nums text-foreground">{formatCurrency(result.nouveauDeficitReportableInterets)}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {aQuelqueChoseAReporter && (
            <Button onClick={handleReporter} disabled={isReporting} variant="outline" className={`mt-4 ${panelButtonClass}`}>
              {isReporting ? <><LogoSpinner /> Application en cours...</> : "Reporter le solde à l'année suivante"}
            </Button>
          )}
        </div>
      </div>

      {/* Stock de déficits reportés, saisi à la main. */}
      <div className="border-t border-border px-8 py-6">
        <PanelTitle>
          <span className="flex items-baseline gap-2">
            Déficits reportés
            <span className="text-[12px] font-normal text-muted-foreground">saisis manuellement, ex. depuis votre 2044</span>
          </span>
        </PanelTitle>

        {deficits.length > 0 && (
          <ul className="mt-3 max-w-2xl divide-y divide-border border-y border-border">
            {deficits.map((d) => (
              <li key={d.id} className="flex items-center gap-4 py-2 text-[13px]">
                <span className="w-14 tabular-nums font-medium text-foreground">{d.annee_origine}</span>
                <Chip tone={d.type === 'interets' ? 'lagon' : 'neutral'}>{d.type === 'interets' ? 'Intérêts' : 'Hors intérêts'}</Chip>
                <span className="ml-auto tabular-nums text-foreground">{formatCurrency(d.montant_restant)}</span>
                <button
                  type="button"
                  aria-label={`Supprimer le déficit ${d.annee_origine}`}
                  onClick={() => handleSupprimerDeficit(d.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="deficit-annee">Année</Label>
            <Input
              id="deficit-annee"
              type="number"
              className={`w-28 ${numberInputClass}`}
              value={nouveauDeficit.annee_origine}
              onChange={(e) => setNouveauDeficit((p) => ({ ...p, annee_origine: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deficit-type">Type</Label>
            <Select
              value={nouveauDeficit.type}
              onValueChange={(v: TypeDeficitFoncierReporte) => setNouveauDeficit((p) => ({ ...p, type: v }))}
            >
              <SelectTrigger id="deficit-type" className="w-40 rounded-[2px] border-border bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hors_interets">Hors intérêts</SelectItem>
                <SelectItem value="interets">Intérêts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="deficit-montant">Montant</Label>
            <div className="relative">
              <Input
                id="deficit-montant"
                type="number"
                className={`w-36 pr-7 ${numberInputClass}`}
                value={nouveauDeficit.montant}
                onChange={(e) => setNouveauDeficit((p) => ({ ...p, montant: e.target.value }))}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
            </div>
          </div>
          <Button onClick={handleAjouterDeficit} className={panelPrimaryButtonClass}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      </div>
    </section>
  );
};
