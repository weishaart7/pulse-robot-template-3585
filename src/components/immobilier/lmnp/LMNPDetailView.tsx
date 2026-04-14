import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Calculator, Plus, Trash2, Info } from 'lucide-react';
import { Asset, AssetRevenu, AssetCharge, assetService } from '@/services/assetService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RevenuForm } from '../RevenuForm';
import { ChargeForm } from '../ChargeForm';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatCurrency } from '@/lib/patrimoine/utils';

interface LMNPDetailViewProps {
  asset: Asset;
  onBack: () => void;
  onUpdate: () => void;
}

const ZONE_TERRAIN_PERCENTAGES: Record<string, number> = {
  'Zones rurales et villes moyennes': 15,
  'Grandes villes': 20,
  'Hyper-centre / zones tendues': 30,
};

interface AmortissementLine {
  composant: string;
  duree: number;
  quotePart: number;
  base: number;
  amortissementAnnuel: number;
}

const computeAmortissement = (
  prixAchat: number,
  terrainPct: number,
  meubles: number,
  travaux: number
): AmortissementLine[] => {
  const valeurTerrain = prixAchat * (terrainPct / 100);
  const valeurBatiment = prixAchat - valeurTerrain;

  const lines: AmortissementLine[] = [];

  if (meubles > 0) {
    lines.push({
      composant: 'Mobilier',
      duree: 5,
      quotePart: 100,
      base: meubles,
      amortissementAnnuel: meubles / 5,
    });
  }

  if (travaux > 0) {
    lines.push({
      composant: 'Travaux',
      duree: 10,
      quotePart: 100,
      base: travaux,
      amortissementAnnuel: travaux / 10,
    });
  }

  const composantsBatiment = [
    { composant: 'Aménagements intérieurs', duree: 12, pct: 18 },
    { composant: 'Étanchéité', duree: 25, pct: 7 },
    { composant: 'Toiture', duree: 25, pct: 8 },
    { composant: 'Installations électriques', duree: 30, pct: 6 },
    { composant: 'Gros œuvre', duree: 75, pct: 41 },
  ];

  for (const c of composantsBatiment) {
    const base = valeurBatiment * (c.pct / 100);
    lines.push({
      composant: c.composant,
      duree: c.duree,
      quotePart: c.pct,
      base,
      amortissementAnnuel: base / c.duree,
    });
  }

  return lines;
};

export const LMNPDetailView: React.FC<LMNPDetailViewProps> = ({ asset, onBack, onUpdate }) => {
  const { toast } = useToast();

  // Form state
  const [prixAchat, setPrixAchat] = useState<number>(asset.montant_immeuble || asset.valeur_acquisition || 0);
  const [zoneBien, setZoneBien] = useState<string>(asset.zone_bien || '');
  const [forceTerrainPct, setForceTerrainPct] = useState<boolean>(!!asset.pourcentage_terrain_force);
  const [terrainPctCustom, setTerrainPctCustom] = useState<number>(asset.pourcentage_terrain_force || 0);
  const [fraisNotaire, setFraisNotaire] = useState<number>(asset.frais_notaire || 0);
  const [anneeAcquisition, setAnneeAcquisition] = useState<string>(
    asset.date_acquisition ? new Date(asset.date_acquisition).getFullYear().toString() : ''
  );
  const [valeurMobilier, setValeurMobilier] = useState<number>(asset.meubles || 0);
  const [travaux, setTravaux] = useState<number>((asset.travaux_renovation || 0) + (asset.travaux_construction || 0));
  const [typeLocationLmnp, setTypeLocationLmnp] = useState<string>(asset.type_location_lmnp || '');

  // Revenue & charges
  const [revenus, setRevenus] = useState<AssetRevenu[]>([]);
  const [charges, setCharges] = useState<AssetCharge[]>([]);
  const [revenuFormOpen, setRevenuFormOpen] = useState(false);
  const [chargeFormOpen, setChargeFormOpen] = useState(false);
  const [impactBudget, setImpactBudget] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Use refs for auto-save to avoid stale closures
  const formDataRef = useRef({
    prixAchat, zoneBien, forceTerrainPct, terrainPctCustom, fraisNotaire,
    anneeAcquisition, valeurMobilier, travaux, typeLocationLmnp,
  });

  useEffect(() => {
    formDataRef.current = {
      prixAchat, zoneBien, forceTerrainPct, terrainPctCustom, fraisNotaire,
      anneeAcquisition, valeurMobilier, travaux, typeLocationLmnp,
    };
  }, [prixAchat, zoneBien, forceTerrainPct, terrainPctCustom, fraisNotaire, anneeAcquisition, valeurMobilier, travaux, typeLocationLmnp]);

  const terrainPct = forceTerrainPct
    ? terrainPctCustom
    : (ZONE_TERRAIN_PERCENTAGES[zoneBien] || 0);

  const fetchData = useCallback(async () => {
    if (!asset.id) return;
    const [rev, chg] = await Promise.all([
      assetService.getAssetRevenus(asset.id),
      assetService.getAssetCharges(asset.id),
    ]);
    setRevenus(rev);
    setCharges(chg);
    setImpactBudget(rev.some((r: any) => r.impact_budget) || chg.some((c: any) => c.impact_budget));
  }, [asset.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-calculate frais de notaire when prixAchat changes (7.5%)
  useEffect(() => {
    if (prixAchat > 0) {
      setFraisNotaire(Math.round(prixAchat * 0.075));
    }
  }, [prixAchat]);

  const performSave = useCallback(async (silent: boolean) => {
    const d = formDataRef.current;
    setIsSaving(true);
    try {
      const updateData: Record<string, any> = {
        montant_immeuble: d.prixAchat || null,
        zone_bien: d.zoneBien || null,
        pourcentage_terrain_force: d.forceTerrainPct ? d.terrainPctCustom : null,
        frais_notaire: d.fraisNotaire || null,
        date_acquisition: d.anneeAcquisition ? `${d.anneeAcquisition}-01-01` : null,
        meubles: d.valeurMobilier || null,
        travaux_renovation: d.travaux || null,
        type_location_lmnp: d.typeLocationLmnp || null,
      };

      const { error } = await supabase
        .from('assets')
        .update(updateData)
        .eq('id', asset.id);

      if (error) throw error;

      if (!silent) {
        toast({ title: 'Enregistré', description: 'Les informations LMNP ont été mises à jour.' });
        onUpdate();
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [asset.id, toast, onUpdate]);

  // Auto-save with debounce
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      performSave(true);
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [prixAchat, zoneBien, forceTerrainPct, terrainPctCustom, fraisNotaire, anneeAcquisition, valeurMobilier, travaux, typeLocationLmnp, performSave]);

  // Compute amortissement
  const amortissementLines = computeAmortissement(prixAchat, terrainPct, valeurMobilier, travaux);
  const totalAmortissementAnnuel = amortissementLines.reduce((s, l) => s + l.amortissementAnnuel, 0);

  // Compute annual revenues & charges
  const totalRevenusAnnuel = revenus.reduce((sum, r) => {
    const m = r.montant || 0;
    return sum + (r.periodicite === 'Mensuelle' ? m * 12 : r.periodicite === 'Trimestrielle' ? m * 4 : m);
  }, 0);

  const totalChargesAnnuel = charges.reduce((sum, c) => {
    const m = c.montant || 0;
    const p = c.periodicite?.toLowerCase();
    return sum + (p === 'mensuelle' ? m * 12 : p === 'trimestrielle' ? m * 4 : m);
  }, 0);

  const resultatFiscal = totalRevenusAnnuel - totalChargesAnnuel - totalAmortissementAnnuel;

  const handleToggleImpactBudget = async (checked: boolean) => {
    if (!asset.id) return;
    try {
      await Promise.all([
        supabase.from('asset_revenus').update({ impact_budget: checked }).eq('asset_id', asset.id),
        supabase.from('asset_charges').update({ impact_budget: checked }).eq('asset_id', asset.id),
      ]);
      setImpactBudget(checked);
      toast({
        title: checked ? 'Transfert activé' : 'Transfert désactivé',
        description: checked
          ? 'Les revenus et charges seront visibles dans le Budget.'
          : 'Les revenus et charges ne seront plus visibles dans le Budget.',
      });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour.', variant: 'destructive' });
    }
  };

  const handleDeleteRevenu = async (id: string) => {
    await assetService.deleteAssetRevenu(id);
    fetchData();
  };

  const handleDeleteCharge = async (id: string) => {
    await assetService.deleteAssetCharge(id);
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Building2 className="h-6 w-6 text-primary" />
            {asset.denomination || 'Bien meublé'}
          </h2>
          <p className="text-muted-foreground">{asset.nature}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="impact-budget-lmnp"
              checked={impactBudget}
              onCheckedChange={handleToggleImpactBudget}
              disabled={revenus.length === 0 && charges.length === 0}
            />
            <Label htmlFor="impact-budget-lmnp" className="text-sm cursor-pointer">
              Transfert budget
            </Label>
          </div>
          <Button onClick={() => handleSave(false)} disabled={isSaving}>
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations du bien */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations du bien</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix d'achat du bien (€)</Label>
                  <Input
                    type="number"
                    value={prixAchat || ''}
                    onChange={(e) => setPrixAchat(parseFloat(e.target.value) || 0)}
                    placeholder="200 000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frais de notaire (€)</Label>
                  <Input
                    type="number"
                    value={fraisNotaire || ''}
                    onChange={(e) => setFraisNotaire(parseFloat(e.target.value) || 0)}
                    placeholder="7,5% du prix d'achat"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Année d'acquisition</Label>
                  <Input
                    type="number"
                    value={anneeAcquisition}
                    onChange={(e) => setAnneeAcquisition(e.target.value)}
                    placeholder="2024"
                    min="1900"
                    max="2100"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valeur mobilier (€)</Label>
                  <Input
                    type="number"
                    value={valeurMobilier || ''}
                    onChange={(e) => setValeurMobilier(parseFloat(e.target.value) || 0)}
                    placeholder="10 000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Travaux (€)</Label>
                  <Input
                    type="number"
                    value={travaux || ''}
                    onChange={(e) => setTravaux(parseFloat(e.target.value) || 0)}
                    placeholder="20 000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type de location</Label>
                  <Select value={typeLocationLmnp} onValueChange={setTypeLocationLmnp}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LMNP Classique">LMNP Classique</SelectItem>
                      <SelectItem value="Tourisme classé">Tourisme classé</SelectItem>
                      <SelectItem value="Tourisme non classé">Tourisme non classé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zone géographique */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Zone géographique
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    La zone détermine la part du terrain dans le prix d'achat (non amortissable).
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(ZONE_TERRAIN_PERCENTAGES).map(([zone, pct]) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => { setZoneBien(zone); setForceTerrainPct(false); }}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      zoneBien === zone && !forceTerrainPct
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{zone}</div>
                    <div className="text-2xl font-bold text-primary mt-1">{pct}%</div>
                    <div className="text-xs text-muted-foreground">Part terrain</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  checked={forceTerrainPct}
                  onCheckedChange={(checked) => {
                    setForceTerrainPct(checked);
                    if (checked && !terrainPctCustom) {
                      setTerrainPctCustom(ZONE_TERRAIN_PERCENTAGES[zoneBien] || 15);
                    }
                  }}
                />
                <Label className="text-sm">Personnaliser le pourcentage terrain</Label>
                {forceTerrainPct && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={terrainPctCustom}
                      onChange={(e) => setTerrainPctCustom(parseFloat(e.target.value) || 0)}
                      className="w-20"
                      min={0}
                      max={100}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                )}
              </div>

              {prixAchat > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">Valeur terrain (non amortissable)</div>
                    <div className="text-lg font-semibold">{formatCurrency(prixAchat * terrainPct / 100)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <div className="text-xs text-muted-foreground">Valeur bâtiment (amortissable)</div>
                    <div className="text-lg font-semibold">{formatCurrency(prixAchat * (1 - terrainPct / 100))}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tableau d'amortissement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Tableau d'amortissement LMNP
              </CardTitle>
              <CardDescription>
                Décomposition par composant avec durées d'amortissement réglementaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prixAchat > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Composant</TableHead>
                        <TableHead className="text-center">Durée (ans)</TableHead>
                        <TableHead className="text-center">Quote-part</TableHead>
                        <TableHead className="text-right">Base amortissable</TableHead>
                        <TableHead className="text-right">Amort. annuel</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {amortissementLines.map((line, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{line.composant}</TableCell>
                          <TableCell className="text-center">{line.duree}</TableCell>
                          <TableCell className="text-center">
                            {line.composant === 'Mobilier' || line.composant === 'Travaux'
                              ? 'Valeur totale'
                              : `${line.quotePart}%`}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(line.base)}</TableCell>
                          <TableCell className="text-right font-medium text-primary">
                            {formatCurrency(line.amortissementAnnuel)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/30 font-bold">
                        <TableCell colSpan={3}>Total amortissement annuel</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(amortissementLines.reduce((s, l) => s + l.base, 0))}
                        </TableCell>
                        <TableCell className="text-right text-primary">
                          {formatCurrency(totalAmortissementAnnuel)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Renseignez le prix d'achat pour calculer les amortissements.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenus */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Revenus locatifs</CardTitle>
                  <CardDescription>Revenus générés par ce bien</CardDescription>
                </div>
                <Button size="sm" onClick={() => setRevenuFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {revenus.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Aucun revenu enregistré.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nature</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {revenus.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.nature}</TableCell>
                        <TableCell className="text-right">{r.montant?.toLocaleString('fr-FR')} €</TableCell>
                        <TableCell>{r.periodicite}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => r.id && handleDeleteRevenu(r.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Charges */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Charges</CardTitle>
                  <CardDescription>Charges liées à ce bien</CardDescription>
                </div>
                <Button size="sm" onClick={() => setChargeFormOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {charges.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Aucune charge enregistrée.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nature</TableHead>
                      <TableHead className="text-right">Montant</TableHead>
                      <TableHead>Périodicité</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charges.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.denomination || c.type_charge}</TableCell>
                        <TableCell className="text-right">{c.montant?.toLocaleString('fr-FR')} {c.unite}</TableCell>
                        <TableCell className="capitalize">{c.periodicite}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => c.id && handleDeleteCharge(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Summary */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-lg">Résumé fiscal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Revenus annuels</span>
                  <span className="font-medium">{formatCurrency(totalRevenusAnnuel)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Charges annuelles</span>
                  <span className="font-medium text-destructive">-{formatCurrency(totalChargesAnnuel)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amortissements</span>
                  <span className="font-medium text-destructive">-{formatCurrency(totalAmortissementAnnuel)}</span>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between">
                    <span className="font-semibold">Résultat fiscal</span>
                    <span className={`font-bold text-lg ${resultatFiscal <= 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                      {formatCurrency(resultatFiscal)}
                    </span>
                  </div>
                  {resultatFiscal <= 0 && (
                    <Badge variant="secondary" className="mt-2 bg-emerald-100 text-emerald-700">
                      Déficit reportable
                    </Badge>
                  )}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Détails du bien</div>
                <div className="space-y-2 text-sm">
                  {typeLocationLmnp && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="outline">{typeLocationLmnp}</Badge>
                    </div>
                  )}
                  {prixAchat > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix d'achat</span>
                      <span>{formatCurrency(prixAchat)}</span>
                    </div>
                  )}
                  {terrainPct > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Part terrain</span>
                      <span>{terrainPct}%</span>
                    </div>
                  )}
                  {anneeAcquisition && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Acquisition</span>
                      <span>{anneeAcquisition}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <RevenuForm
        assetId={asset.id!}
        open={revenuFormOpen}
        onOpenChange={setRevenuFormOpen}
        onSuccess={fetchData}
      />
      <ChargeForm
        assetId={asset.id!}
        open={chargeFormOpen}
        onOpenChange={setChargeFormOpen}
        onSuccess={fetchData}
      />
    </div>
  );
};
