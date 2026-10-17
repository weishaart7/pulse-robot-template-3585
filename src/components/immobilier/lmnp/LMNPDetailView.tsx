import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Chip, PanelTitle, SummaryRow, WorkspaceHeader, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { SectionHeader } from '@/components/family/SectionHeader';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { Asset, AssetRevenu, AssetCharge, assetService } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { ProjectionBienSection } from '../projection/ProjectionBienSection';
import { SimulationReventeSection } from '../revente/SimulationReventeSection';
import { useToast } from '@/hooks/use-toast';
import { RevenuForm } from '../RevenuForm';
import { ChargeForm } from '../ChargeForm';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/patrimoine/utils';
import {
  ZONE_TERRAIN_PERCENTAGES,
  creditAnnuelBien,
  computeAmortissementImmeubleLMNP as computeAmortissement,
  computeResultatReelLMNP,
  computeResultatReelLMP,
  estimerFraisNotaire,
} from '@/lib/immobilier/rentabilite';
import { dateAcquisitionDepuisAnnee } from '@/lib/immobilier/dateAcquisition';
import { SimulateurRentabiliteLMNPSection } from './SimulateurRentabiliteLMNPSection';
import { SimulateurRentabiliteLMPSection } from './SimulateurRentabiliteLMPSection';

interface LMNPDetailViewProps {
  asset: Asset;
  /** Emprunts Patrimoine des biens d'Immobilier (ceux reliés à ce bien font foi pour son crédit). */
  emprunts?: Emprunt[];
  onBack: () => void;
  onUpdate: () => void;
}

export const LMNPDetailView: React.FC<LMNPDetailViewProps> = ({ asset, emprunts = [], onBack, onUpdate }) => {
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
  // Ligne dont la suppression attend confirmation.
  const [pendingDelete, setPendingDelete] = useState<{ id: string; nom: string; type: 'revenu' | 'charge' } | null>(null);
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
    type AvecImpact = { impact_budget?: boolean };
    setImpactBudget(rev.some((r) => (r as AvecImpact).impact_budget) || chg.some((c) => (c as AvecImpact).impact_budget));
  }, [asset.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Frais de notaire pré-calculés à 7,5 % uniquement quand l'utilisateur modifie le prix d'achat —
  // pas au chargement de la fiche, qui écraserait sinon les frais réels enregistrés (et déclencherait
  // l'auto-sauvegarde sans aucune saisie), cf. docs/immobilier.md §3.
  const handlePrixAchatChange = (value: number) => {
    setPrixAchat(value);
    if (value > 0) {
      setFraisNotaire(estimerFraisNotaire(value));
    }
  };

  const performSave = useCallback(async (silent: boolean) => {
    const d = formDataRef.current;
    setIsSaving(true);
    try {
      const updateData: Partial<Asset> = {
        montant_immeuble: d.prixAchat || null,
        zone_bien: d.zoneBien || null,
        pourcentage_terrain_force: d.forceTerrainPct ? d.terrainPctCustom : null,
        frais_notaire: d.fraisNotaire || null,
        // Seule l'année est saisie ici : la date réelle stockée est conservée (cf. dateAcquisition.ts).
        date_acquisition: dateAcquisitionDepuisAnnee(d.anneeAcquisition, asset.date_acquisition),
        meubles: d.valeurMobilier || null,
        // Le champ « Travaux » de cette fiche est la somme rénovation + construction (lues partout
        // additionnées) : la somme est enregistrée dans travaux_renovation et la construction remise à
        // vide, sinon elle serait recomptée à chaque rechargement.
        travaux_renovation: d.travaux || null,
        travaux_construction: null,
        type_location_lmnp: d.typeLocationLmnp || null,
      };

      await assetService.updateAsset(asset.id!, updateData);

      if (!silent) {
        toast({ title: 'Enregistré', description: 'Les informations LMNP ont été mises à jour.' });
        onUpdate();
      }
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }, [asset.id, asset.date_acquisition, toast, onUpdate]);

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

  // Compute annual revenues & charges — Mensuelle ×12, Trimestrielle ×4, Semestrielle ×2, Annuelle ×1 ;
  // toute valeur non reconnue reste traitée comme déjà annuelle (comportement existant conservé).
  const periodiciteAnnualFactor = (periodicite?: string): number => {
    switch ((periodicite || '').toLowerCase()) {
      case 'mensuelle': return 12;
      case 'trimestrielle': return 4;
      case 'semestrielle': return 2;
      default: return 1;
    }
  };

  const totalRevenusAnnuel = revenus.reduce((sum, r) => {
    return sum + (r.montant || 0) * periodiciteAnnualFactor(r.periodicite);
  }, 0);

  const totalChargesAnnuel = charges.reduce((sum, c) => {
    return sum + (c.montant || 0) * periodiciteAnnualFactor(c.periodicite);
  }, 0);

  // Régime Micro-BIC : base = recettes − abattement forfaitaire (50 % quel que soit le type de
  // location, y compris meublé de tourisme classé depuis la loi Le Meur du 19/11/2024 qui a
  // supprimé l'abattement renforcé à 71 % pour les revenus 2025 et suivants), sans déduction de
  // charges ni d'amortissement — régime BIC réel sinon (comportement par défaut inchangé si
  // regime_location est vide/'BIC'). Plafond de recettes non vérifié ici (dépend de la catégorie
  // de location, seuils révisés chaque année) — avertissement affiché à l'utilisateur, cf.
  // docs/immobilier.md §3.
  const isMicroBic = asset.regime_location === 'Micro-BIC';
  const tauxAbattementMicroBic = 0.50;
  const abattementMicroBic = totalRevenusAnnuel * tauxAbattementMicroBic;

  // Plafonnement de l'amortissement déductible (régime réel) : l'amortissement ne peut pas créer ni
  // aggraver un déficit — seul l'excédent sur le résultat avant amortissement est déductible cette
  // année. L'excédent non déduit n'est pas automatiquement reporté sur l'année suivante (aucun
  // historique par exercice n'est persisté par l'application) — affiché à l'utilisateur pour un report
  // manuel, cf. docs/immobilier.md §3.
  // Intérêts d'emprunt + assurance emprunteur : déductibles au régime réel (LMNP comme LMP), comme
  // dans les simulateurs de rentabilité (même moteur, rentabilite.ts). Ils viennent des champs de
  // financement enregistrés sur l'actif (pas de l'état de saisie en cours).
  // Emprunt Patrimoine relié s'il existe, sinon champs Financement ; à 100 % comme les simulateurs LMNP/LMP.
  const { interetsAnnee: interetsCredit, assuranceAnnee: assuranceCredit } = creditAnnuelBien(asset, emprunts, 1, false);
  const chargesDeductiblesReel = totalChargesAnnuel + interetsCredit + assuranceCredit;

  const { amortissementDeductible, amortissementNonDeductible, resultatFiscal: resultatFiscalReelLMNP } =
    computeResultatReelLMNP(totalRevenusAnnuel, chargesDeductiblesReel, totalAmortissementAnnuel);

  // LMP : pas de plafonnement de l'amortissement — le déficit BIC, y compris celui créé par
  // l'amortissement, est imputable sur le revenu global sans plafond ni limite de durée.
  const isLMP = asset.nature === 'Immeubles locatifs (LMP)';
  const resultatFiscalReel = isLMP
    ? computeResultatReelLMP(totalRevenusAnnuel, chargesDeductiblesReel, totalAmortissementAnnuel).resultatFiscal
    : resultatFiscalReelLMNP;

  const resultatFiscal = isMicroBic
    ? totalRevenusAnnuel - abattementMicroBic
    : resultatFiscalReel;

  const handleToggleImpactBudget = async (checked: boolean) => {
    if (!asset.id) return;
    try {
      // Les erreurs Supabase sont désormais levées par le service (Promise.all sur les réponses
      // brutes les ignorait et affichait « Transfert activé » même en cas d'échec).
      await assetService.setImpactBudget(asset.id, checked);
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

  const numberCls = 'bg-background border-border shadow-none tabular-nums';
  const ligneRevenus = revenus.map(r => ({ id: r.id, nom: r.nature, montant: `${r.montant?.toLocaleString('fr-FR')} €`, periodicite: r.periodicite, type: 'revenu' as const }));
  const ligneCharges = charges.map(c => ({ id: c.id, nom: c.denomination || c.type_charge, montant: `${c.montant?.toLocaleString('fr-FR')} ${c.unite}`, periodicite: c.periodicite, type: 'charge' as const }));
  const amortDeduit = isLMP ? totalAmortissementAnnuel : amortissementDeductible;

  const renderLignes = (lignes: typeof ligneRevenus | typeof ligneCharges, vide: string) =>
    lignes.length === 0 ? (
      <p className="border-y border-border py-4 text-[13px] text-muted-foreground">{vide}</p>
    ) : (
      <ul className="-mx-2 divide-y divide-border border-y border-border">
        {lignes.map(l => (
          <li key={l.id} className="flex items-center gap-3 px-2 py-2 text-[13px]">
            <span className="w-[4.25rem] shrink-0">
              <Chip tone={l.type === 'revenu' ? 'lagon' : 'citron'}>{l.type === 'revenu' ? 'Revenu' : 'Charge'}</Chip>
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-foreground">{l.nom}</span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="block font-medium text-foreground">{l.montant}</span>
              <span className="block text-[12px] lowercase text-muted-foreground">{l.periodicite}</span>
            </span>
            <button
              type="button"
              aria-label={`Supprimer ${l.nom}`}
              onClick={() => l.id && setPendingDelete({ id: l.id, nom: l.nom, type: l.type })}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    );

  // Fiche d'un bien meublé en « panneau de travail » : barre d'en-tête portant le report au Budget et
  // les actions, puis à gauche la saisie (bien, zone, amortissement, revenus et charges) et à droite le
  // résumé fiscal, et enfin le simulateur LMNP / LMP.
  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader
        icon={<Building2 strokeWidth={1.75} />}
        trail={['Immobilier', 'Mes biens', asset.denomination || 'Bien meublé']}
        actions={
          <>
            <label htmlFor="impact-budget-lmnp" className="mr-2 hidden cursor-pointer items-center gap-2 text-[12.5px] text-foreground sm:flex">
              <Checkbox
                id="impact-budget-lmnp"
                checked={impactBudget}
                onCheckedChange={handleToggleImpactBudget}
                disabled={revenus.length === 0 && charges.length === 0}
              />
              Reporter dans le Budget
            </label>
            <Button type="button" variant="outline" onClick={onBack} className={panelButtonClass}>Retour</Button>
            <Button type="button" onClick={() => performSave(false)} disabled={isSaving} className={panelPrimaryButtonClass}>
              {isSaving ? <><LogoSpinner />Enregistrement...</> : 'Enregistrer'}
            </Button>
          </>
        }
      />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{asset.denomination || 'Bien meublé'}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{asset.nature}</p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        {/* Saisie. */}
        <div className="min-w-0 divide-y divide-border">
          <section className="px-8 py-6">
            <SectionHeader title="Informations du bien" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              {([
                ["Prix d'achat du bien", prixAchat, handlePrixAchatChange, '200 000'],
                ['Frais de notaire', fraisNotaire, setFraisNotaire, "7,5 % du prix d'achat"],
                ['Valeur du mobilier', valeurMobilier, setValeurMobilier, '10 000'],
                ['Travaux', travaux, setTravaux, '20 000'],
              ] as const).map(([label, value, setter, placeholder]) => (
                <div key={label} className="space-y-1.5">
                  <Label>{label}</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={value || ''}
                      onChange={(e) => setter(parseFloat(e.target.value) || 0)}
                      placeholder={placeholder}
                      className={`${numberCls} pr-8`}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
                  </div>
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Année d'acquisition</Label>
                <Input
                  type="number"
                  value={anneeAcquisition}
                  onChange={(e) => setAnneeAcquisition(e.target.value)}
                  placeholder="2024"
                  min="1900"
                  max="2100"
                  className={numberCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type de location</Label>
                <Select value={typeLocationLmnp} onValueChange={setTypeLocationLmnp}>
                  <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
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
          </section>

          <section className="px-8 py-6">
            <SectionHeader title="Zone géographique" />
            <p className="-mt-2 mb-4 text-[12.5px] text-muted-foreground">
              La zone détermine la part du terrain dans le prix d'achat, qui n'est pas amortissable.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {Object.entries(ZONE_TERRAIN_PERCENTAGES).map(([zone, pct]) => {
                const selected = zoneBien === zone && !forceTerrainPct;
                return (
                  <button
                    key={zone}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setZoneBien(zone); setForceTerrainPct(false); }}
                    className={`rounded-[2px] border px-4 py-3 text-left transition-colors ${
                      selected ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-secondary'
                    }`}
                  >
                    <div className={`text-[12.5px] ${selected ? 'text-background/80' : 'text-muted-foreground'}`}>{zone}</div>
                    <div className="mt-1 text-[20px] font-medium leading-none tabular-nums">{pct} %</div>
                    <div className={`mt-1 text-[11px] ${selected ? 'text-background/70' : 'text-muted-foreground'}`}>part terrain</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Switch
                checked={forceTerrainPct}
                onCheckedChange={(checked) => {
                  setForceTerrainPct(checked);
                  if (checked && !terrainPctCustom) {
                    setTerrainPctCustom(ZONE_TERRAIN_PERCENTAGES[zoneBien] || 15);
                  }
                }}
              />
              <Label className="text-[13px]">Personnaliser la part terrain</Label>
              {forceTerrainPct && (
                <div className="relative">
                  <Input
                    type="number"
                    value={terrainPctCustom}
                    onChange={(e) => setTerrainPctCustom(parseFloat(e.target.value) || 0)}
                    className={`w-24 pr-7 ${numberCls}`}
                    min={0}
                    max={100}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {prixAchat > 0 && (
              <dl className="mt-4 max-w-md">
                <SummaryRow label="Terrain"><span className="tabular-nums">{formatCurrency(prixAchat * terrainPct / 100)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">non amortissable</span></SummaryRow>
                <SummaryRow label="Bâtiment"><span className="tabular-nums">{formatCurrency(prixAchat * (1 - terrainPct / 100))}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">amortissable</span></SummaryRow>
              </dl>
            )}
          </section>

          <section className="px-8 py-6">
            <SectionHeader title="Tableau d'amortissement" />
            <p className="-mt-2 mb-4 text-[12.5px] text-muted-foreground">
              Décomposition par composant, avec les durées d'amortissement réglementaires.
            </p>
            {prixAchat > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[30rem]">
                  <div className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_6rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 border-b border-border pb-2 text-[12px] text-muted-foreground">
                    <span>Composant</span>
                    <span className="text-right">Durée</span>
                    <span className="text-right">Quote-part</span>
                    <span className="text-right">Base</span>
                    <span className="text-right">Annuel</span>
                  </div>
                  <ul className="divide-y divide-border border-b border-border">
                    {amortissementLines.map((line, idx) => (
                      <li key={idx} className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_6rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-x-4 py-2 text-[13px] tabular-nums">
                        <span className="truncate font-medium text-foreground">{line.composant}</span>
                        <span className="text-right">{line.duree} ans</span>
                        <span className="text-right text-muted-foreground">
                          {line.composant === 'Mobilier' || line.composant === 'Travaux' ? 'totale' : `${line.quotePart} %`}
                        </span>
                        <span className="text-right">{formatCurrency(line.base)}</span>
                        <span className="text-right font-medium text-foreground">{formatCurrency(line.amortissementAnnuel)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="grid grid-cols-[minmax(0,1.4fr)_4.5rem_6rem_minmax(0,1fr)_minmax(0,1fr)] gap-x-4 pt-2.5 text-[13px] font-medium tabular-nums text-foreground">
                    <span className="col-span-3">Total annuel</span>
                    <span className="text-right">{formatCurrency(amortissementLines.reduce((s, l) => s + l.base, 0))}</span>
                    <span className="text-right">{formatCurrency(totalAmortissementAnnuel)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">Renseignez le prix d'achat pour calculer les amortissements.</p>
            )}
          </section>

          <section className="px-8 py-6">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <SectionHeader title="Revenus locatifs" />
              <Button type="button" onClick={() => setRevenuFormOpen(true)} className={`-mt-3.5 ${panelButtonClass}`} variant="outline">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
            {renderLignes(ligneRevenus, 'Aucun revenu enregistré.')}
          </section>

          <section className="px-8 py-6">
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <SectionHeader title="Charges" markClassName="bg-citron" />
              <Button type="button" onClick={() => setChargeFormOpen(true)} className={`-mt-3.5 ${panelButtonClass}`} variant="outline">
                <Plus className="h-4 w-4" /> Ajouter
              </Button>
            </div>
            {renderLignes(ligneCharges, 'Aucune charge enregistrée.')}
          </section>
        </div>

        {/* Résumé fiscal. */}
        <aside className="px-8 py-6">
          <div className="lg:sticky lg:top-6">
            <PanelTitle>Résumé fiscal</PanelTitle>
            <dl className="mt-3">
              {isMicroBic ? (
                <>
                  <SummaryRow label="Recettes"><span className="tabular-nums">{formatCurrency(totalRevenusAnnuel)}</span></SummaryRow>
                  <SummaryRow label="Abattement">
                    <span className="tabular-nums">−{formatCurrency(abattementMicroBic)}</span>
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">{(tauxAbattementMicroBic * 100).toFixed(0)} %</span>
                  </SummaryRow>
                </>
              ) : (
                <>
                  <SummaryRow label="Revenus"><span className="tabular-nums">{formatCurrency(totalRevenusAnnuel)}</span></SummaryRow>
                  <SummaryRow label="Charges"><span className="tabular-nums">−{formatCurrency(totalChargesAnnuel)}</span></SummaryRow>
                  {interetsCredit > 0 && <SummaryRow label="Intérêts"><span className="tabular-nums">−{formatCurrency(interetsCredit)}</span></SummaryRow>}
                  {assuranceCredit > 0 && <SummaryRow label="Assurance"><span className="tabular-nums">−{formatCurrency(assuranceCredit)}</span></SummaryRow>}
                  <SummaryRow label="Amortissements"><span className="tabular-nums">−{formatCurrency(amortDeduit)}</span><span className="ml-1.5 text-[12px] font-normal text-muted-foreground">déduits</span></SummaryRow>
                </>
              )}
            </dl>

            {isMicroBic ? (
              <p className="mt-3 text-[12px] leading-5 text-muted-foreground">
                Régime micro-BIC : charges et amortissements non déduits, base = recettes − abattement forfaitaire. Sous
                réserve du respect du plafond de recettes en vigueur pour cette catégorie de location, à vérifier manuellement.
              </p>
            ) : !isLMP && amortissementNonDeductible > 0 && (
              <div className="mt-3 rounded-[2px] border border-spark/30 bg-spark/5 px-3 py-2.5 text-[12px] leading-5 text-foreground">
                {formatCurrency(amortissementNonDeductible)} d'amortissement non déduit cette année (l'amortissement ne peut
                ni créer ni aggraver un déficit), à reporter manuellement l'année prochaine : ce report n'est pas encore automatisé.
              </div>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[12px] text-muted-foreground">Résultat fiscal</p>
              <p className={`mt-1.5 text-[24px] font-medium leading-none tracking-[-0.02em] tabular-nums ${resultatFiscal <= 0 ? 'text-positive' : 'text-foreground'}`}>
                {formatCurrency(resultatFiscal)}
              </p>
              {resultatFiscal <= 0 && (
                <p className="mt-2">
                  <Chip tone="lagon">{isLMP && !isMicroBic ? 'Déficit imputable sur le revenu global' : 'Déficit reportable'}</Chip>
                </p>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <PanelTitle>Le bien</PanelTitle>
              <dl className="mt-2">
                {typeLocationLmnp && <SummaryRow label="Type">{typeLocationLmnp}</SummaryRow>}
                {prixAchat > 0 && <SummaryRow label="Prix d'achat"><span className="tabular-nums">{formatCurrency(prixAchat)}</span></SummaryRow>}
                {terrainPct > 0 && <SummaryRow label="Part terrain"><span className="tabular-nums">{terrainPct} %</span></SummaryRow>}
                {anneeAcquisition && <SummaryRow label="Acquisition"><span className="tabular-nums">{anneeAcquisition}</span></SummaryRow>}
              </dl>
            </div>
          </div>
        </aside>
      </div>

      {asset.nature === 'Immeubles locatifs (LMNP)' && (
        <div className="border-t border-border">
          <SimulateurRentabiliteLMNPSection asset={asset} emprunts={emprunts} />
        </div>
      )}
      {asset.nature === 'Immeubles locatifs (LMP)' && (
        <div className="border-t border-border">
          <SimulateurRentabiliteLMPSection asset={asset} emprunts={emprunts} />
        </div>
      )}

      {/* Projection sur les données enregistrées (revenus, charges, crédit), pas sur la saisie en cours. */}
      <div className="border-t border-border px-8 py-6">
        <ProjectionBienSection asset={asset} emprunts={emprunts} />
      </div>

      {/* Revente : LMNP (réintégration des amortissements) ; LMP signalé hors périmètre. */}
      <div className="border-t border-border px-8 py-6">
        <SimulationReventeSection asset={asset} emprunts={emprunts} />
      </div>

      <WizardConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.type === 'revenu' ? 'Supprimer ce revenu ?' : 'Supprimer cette charge ?'}
        description={pendingDelete ? `« ${pendingDelete.nom} » sera définitivement supprimé${pendingDelete.type === 'revenu' ? '' : 'e'}.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (pendingDelete?.type === 'revenu') handleDeleteRevenu(pendingDelete.id);
          else if (pendingDelete) handleDeleteCharge(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />

      <RevenuForm
        assetId={asset.id!}
        open={revenuFormOpen}
        onOpenChange={setRevenuFormOpen}
        impactBudget={impactBudget}
        onSuccess={fetchData}
      />
      <ChargeForm
        assetId={asset.id!}
        open={chargeFormOpen}
        onOpenChange={setChargeFormOpen}
        impactBudget={impactBudget}
        onSuccess={fetchData}
      />
    </div>
  );
};
