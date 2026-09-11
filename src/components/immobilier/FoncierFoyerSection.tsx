import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const ANNEE_COURANTE = new Date().getFullYear();

const formatPercent = (value: number | null): string => {
  if (value === null) return '—';
  return `${(value * 100).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
};

export const FoncierFoyerSection = () => {
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
        ),
      ),
    [biensNus, revenusParBien, chargesParBien, renovationEnergetique],
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

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Synthèse foncière du foyer — location nue</CardTitle>
        <CardDescription>
          Agrège tous vos biens loués nus ({biensNus.length}) pour appliquer les règles du régime réel au niveau
          du foyer fiscal : seuil micro-foncier, plafond du déficit imputable, report sur 10 ans.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result.regimeReelObligatoire && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Régime réel obligatoire</AlertTitle>
            <AlertDescription>
              Vos revenus fonciers bruts s'élèvent à {formatCurrency(result.loyersBrutsFoyer)}, au-delà du seuil du
              micro-foncier ({formatCurrency(SEUIL_MICRO_FONCIER)}).
            </AlertDescription>
          </Alert>
        )}

        <div className="max-w-[200px] space-y-2">
          <Label htmlFor="tmi-foyer">Taux marginal d'imposition du foyer (%)</Label>
          <Input
            id="tmi-foyer"
            type="number"
            step="1"
            min="0"
            max="100"
            value={tmiInput}
            onChange={(e) => setTmiInput(e.target.value)}
          />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-semibold">Biens loués nus pris en compte</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bien</TableHead>
                <TableHead className="text-right">Loyers bruts</TableHead>
                <TableHead className="text-right">Charges hors intérêts</TableHead>
                <TableHead className="text-right">Intérêts + assurance</TableHead>
                <TableHead className="text-right">Quote-part</TableHead>
                <TableHead>Rénovation énergétique (E/F/G)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {biensNus.map((asset, index) => {
                const bien = biensInput[index];
                return (
                  <TableRow key={asset.id}>
                    <TableCell>{asset.denomination || asset.nature}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien?.loyersBruts || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien?.chargesHorsInterets || 0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(bien?.interetsEtAssuranceEmprunt || 0)}</TableCell>
                    <TableCell className="text-right">{bien?.quotePart ?? 100} %</TableCell>
                    <TableCell>
                      <Checkbox
                        checked={!!renovationEnergetique[asset.id!]}
                        onCheckedChange={(checked) =>
                          setRenovationEnergetique((prev) => ({ ...prev, [asset.id!]: !!checked }))
                        }
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Loyers bruts foyer</p>
            <p className="font-medium">{formatCurrency(result.loyersBrutsFoyer)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Résultat foncier global</p>
            <p className="font-medium">{formatCurrency(result.resultatFoncierGlobal)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Résultat foncier imposable</p>
            <p className="font-medium">{formatCurrency(result.resultatFoncierImposable)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Prélèvements sociaux</p>
            <p className="font-medium">{formatCurrency(result.prelevementsSociaux)}</p>
          </div>
        </div>

        {result.deficitImputableRevenuGlobal > 0 && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium">
              Déficit imputable sur le revenu global cette année : {formatCurrency(result.deficitImputableRevenuGlobal)}
              {' '}(plafond {formatCurrency(result.plafondDeficitApplicable)}
              {result.plafondDeficitApplicable === PLAFOND_DEFICIT_FONCIER_RENOVATION_ENERGETIQUE
                ? ' — rénovation énergétique'
                : ''}
              )
            </p>
            <p className="text-sm text-muted-foreground">
              Économie d'impôt potentielle : {formatCurrency(result.economieImpotPotentielle)}
            </p>
          </div>
        )}

        {result.consommationDeficitsReportes.length > 0 && (
          <div className="rounded-lg border p-4 space-y-1">
            <p className="text-sm font-medium">Consommation des déficits reportés cette année</p>
            {result.consommationDeficitsReportes.map((c) => (
              <p key={c.id} className="text-sm text-muted-foreground">
                Report {c.anneeOrigine} ({c.type === 'interets' ? 'intérêts' : 'hors intérêts'}) : −{formatCurrency(c.montantConsomme)}
              </p>
            ))}
          </div>
        )}

        {(result.nouveauDeficitReportableHorsInterets > 0 || result.nouveauDeficitReportableInterets > 0) && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-1 dark:border-amber-900 dark:bg-amber-950">
            <p className="text-sm font-medium">Nouveau déficit reportable généré cette année (10 ans, revenus fonciers uniquement)</p>
            {result.nouveauDeficitReportableHorsInterets > 0 && (
              <p className="text-sm text-muted-foreground">
                Hors intérêts : {formatCurrency(result.nouveauDeficitReportableHorsInterets)}
              </p>
            )}
            {result.nouveauDeficitReportableInterets > 0 && (
              <p className="text-sm text-muted-foreground">
                Intérêts d'emprunt : {formatCurrency(result.nouveauDeficitReportableInterets)}
              </p>
            )}
          </div>
        )}

        {aQuelqueChoseAReporter && (
          <Button onClick={handleReporter} disabled={isReporting} variant="outline">
            {isReporting ? 'Application en cours...' : 'Reporter le solde à l\'année suivante'}
          </Button>
        )}

        <div className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-semibold">Déficits reportés (saisis manuellement, ex. depuis votre 2044)</h4>

          {deficits.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année d'origine</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Restant</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {deficits.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.annee_origine}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{d.type === 'interets' ? 'Intérêts' : 'Hors intérêts'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(d.montant_restant)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleSupprimerDeficit(d.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="deficit-annee">Année</Label>
              <Input
                id="deficit-annee"
                type="number"
                className="w-28"
                value={nouveauDeficit.annee_origine}
                onChange={(e) => setNouveauDeficit((p) => ({ ...p, annee_origine: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deficit-type">Type</Label>
              <Select
                value={nouveauDeficit.type}
                onValueChange={(v: TypeDeficitFoncierReporte) => setNouveauDeficit((p) => ({ ...p, type: v }))}
              >
                <SelectTrigger id="deficit-type" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hors_interets">Hors intérêts</SelectItem>
                  <SelectItem value="interets">Intérêts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="deficit-montant">Montant (€)</Label>
              <Input
                id="deficit-montant"
                type="number"
                className="w-32"
                value={nouveauDeficit.montant}
                onChange={(e) => setNouveauDeficit((p) => ({ ...p, montant: e.target.value }))}
              />
            </div>
            <Button onClick={handleAjouterDeficit} size="sm">
              <Plus className="mr-1 h-4 w-4" /> Ajouter
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
