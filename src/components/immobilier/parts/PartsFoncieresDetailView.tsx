import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { Chip, PanelTitle, SummaryRow, WorkspaceHeader, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { PanelSection } from '@/components/immobilier/property/PanelSection';
import { AcquisitionDateInput } from '@/components/immobilier/property/PropertyGeneralSection';
import { useToast } from '@/hooks/use-toast';
import { useFamilyLinks, useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { Asset, assetService } from '@/services/assetService';
import { assetDemembrementService, AssetDemembrement } from '@/services/assetDemembrementService';
import { getFractionDemembrement } from '@/lib/patrimoine/demembrementFraction';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { getExonerationRurale, isBienRuralNonQualifie, isNatureRurale, REGIME_FISCAL_PARTS_OPTIONS } from '@/constants/assetTypes';
import { computeIndicateursParts, estBienNuEnDirect, regimeImpositionParts } from '@/lib/immobilier/partsFoncieres';

interface PartsFoncieresDetailViewProps {
  asset: Asset;
  onBack: () => void;
  onUpdate: () => void;
}

const fmtPct = (v: number | null) =>
  v === null ? null : `${(v * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));
const toInput = (v: number | null | undefined): string => (v == null ? '' : String(v));

const EXONERATION_RURALE_LIBELLE: Record<string, string> = {
  forestier: 'Forestier — 3/4 sans plafond (art. 793 CGI)',
  agricole: 'Agricole — 3/4 jusqu’à 600 000 € par héritier, 1/2 au-delà (art. 793 bis CGI)',
};

// Fiche des parts foncières / forestières (SCPI, groupements fonciers, GFA/GAF/GFV/GFR, sociétés
// d'épargne forestière) en « panneau de travail » : saisie à gauche, indicateurs et imposition
// indicative à droite. Aucun impôt calculé : le revenu imposable vient de l'attestation fiscale du
// gestionnaire (cf. lib/immobilier/partsFoncieres.ts).
export const PartsFoncieresDetailView: React.FC<PartsFoncieresDetailViewProps> = ({ asset, onBack, onUpdate }) => {
  const { toast } = useToast();
  const [etablissement, setEtablissement] = useState(asset.etablissement ?? '');
  // La saisie de date (SmartDateInput) s'appuie sur le contexte react-hook-form d'un FormItem : la date
  // seule passe donc par un formulaire, les autres champs restent en état local.
  const dateForm = useForm<{ date_acquisition?: Date }>({
    defaultValues: { date_acquisition: asset.date_acquisition ? new Date(asset.date_acquisition) : undefined },
  });
  const dateAcquisition = dateForm.watch('date_acquisition');
  const [valeurAcquisition, setValeurAcquisition] = useState(toInput(asset.valeur_acquisition));
  const [fraisAcquisition, setFraisAcquisition] = useState(toInput(asset.frais_acquisition));
  const [valeurEstimee, setValeurEstimee] = useState(toInput(asset.valeur_estimee));
  const [revenus12m, setRevenus12m] = useState(toInput(asset.revenus_distribues_12m));
  const [regimeFiscal, setRegimeFiscal] = useState(asset.regime_fiscal_parts ?? '');
  const [isSaving, setIsSaving] = useState(false);

  const [demembrements, setDemembrements] = useState<AssetDemembrement[]>([]);
  const [detientBienNuEnDirect, setDetientBienNuEnDirect] = useState(false);
  const { data: familyProfile } = useFamilyProfile();
  const { data: maritalStatus } = useMaritalStatus();
  const { data: familyLinks } = useFamilyLinks();

  useEffect(() => {
    assetDemembrementService.getAllForUser().then(setDemembrements).catch(() => setDemembrements([]));
    assetService.getBiensLocationNue()
      .then((biens) => setDetientBienNuEnDirect(biens.some(estBienNuEnDirect)))
      .catch(() => setDetientBienNuEnDirect(false));
  }, []);

  // Même fraction de démembrement que la Vue d'ensemble et le Résumé Patrimoine (barème 669 CGI).
  const fraction = useMemo(
    () => getFractionDemembrement(
      asset,
      demembrements.filter((d) => d.asset_id === asset.id),
      { familyProfile, maritalStatus, familyLinks },
    ),
    [asset, demembrements, familyProfile, maritalStatus, familyLinks],
  );

  // Indicateurs recalculés sur la saisie en cours.
  const indicateurs = computeIndicateursParts(
    {
      revenus_distribues_12m: numOrNull(revenus12m) ?? undefined,
      valeur_acquisition: numOrNull(valeurAcquisition) ?? undefined,
      valeur_estimee: numOrNull(valeurEstimee) ?? undefined,
      frais_acquisition: numOrNull(fraisAcquisition) ?? undefined,
      pourcentage_utilisateur: asset.pourcentage_utilisateur,
      pourcentage_conjoint: asset.pourcentage_conjoint,
    },
    fraction,
  );
  const imposition = regimeImpositionParts(regimeFiscal, detientBienNuEnDirect);
  const regimeOptions = REGIME_FISCAL_PARTS_OPTIONS[asset.nature] || [];
  const etablissementLabel = asset.nature === 'Parts de SCPI' ? 'Société de gestion' : 'Gestionnaire';
  const nom = asset.denomination || 'Sans dénomination';

  const exonerationRurale = isNatureRurale(asset.nature)
    ? isBienRuralNonQualifie(asset)
      ? 'Non renseignée — à qualifier dans Patrimoine (bloque le calcul de transmission)'
      : EXONERATION_RURALE_LIBELLE[getExonerationRurale(asset) ?? ''] ?? 'Aucune (régime ou conditions non remplis)'
    : null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await assetService.updateAsset(asset.id!, {
        etablissement: etablissement.trim() || null,
        // Colonne `date` : date locale, comme Patrimoine (pas de toISOString, qui donnerait la veille).
        date_acquisition: dateAcquisition ? format(dateAcquisition, 'yyyy-MM-dd') : null,
        valeur_acquisition: numOrNull(valeurAcquisition),
        frais_acquisition: numOrNull(fraisAcquisition),
        valeur_estimee: numOrNull(valeurEstimee),
        revenus_distribues_12m: numOrNull(revenus12m),
        regime_fiscal_parts: regimeFiscal || null,
      });
      toast({ title: 'Enregistré', description: 'Les informations des parts ont été mises à jour.' });
      onUpdate();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const numberField = (label: string, value: string, setter: (v: string) => void, placeholder?: string) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step="0.01"
          min={0}
          value={value}
          onChange={(e) => setter(e.target.value)}
          placeholder={placeholder}
          className="bg-background border-border pr-8 shadow-none tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
      </div>
    </div>
  );

  const plusValue = indicateurs.plusValueLatente;

  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader
        icon={<Building2 strokeWidth={1.75} />}
        trail={['Immobilier', 'Mes biens', nom]}
        actions={
          <>
            <Button type="button" variant="outline" onClick={onBack} className={panelButtonClass}>Retour</Button>
            <Button type="button" onClick={handleSave} disabled={isSaving} className={panelPrimaryButtonClass}>
              {isSaving ? <><LogoSpinner />Enregistrement...</> : 'Enregistrer'}
            </Button>
          </>
        }
      />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{nom}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{asset.nature}</p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
        <div className="min-w-0 px-8 py-6">
          <PanelSection title="Parts">
            <div className="space-y-1.5">
              <Label>{etablissementLabel}</Label>
              <Input
                value={etablissement}
                onChange={(e) => setEtablissement(e.target.value)}
                className="bg-background border-border shadow-none"
              />
            </div>
            <Form {...dateForm}>
              <FormField
                control={dateForm.control}
                name="date_acquisition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date d'acquisition</FormLabel>
                    <AcquisitionDateInput value={field.value} onChange={field.onChange} />
                  </FormItem>
                )}
              />
            </Form>
            {numberField("Prix d'acquisition", valeurAcquisition, setValeurAcquisition, 'Prix de souscription des parts')}
            {numberField("Frais d'acquisition", fraisAcquisition, setFraisAcquisition)}
            {numberField('Valeur estimée actuelle', valeurEstimee, setValeurEstimee, 'Valeur de retrait ou de réalisation')}
          </PanelSection>

          <PanelSection
            title="Revenus et fiscalité"
            description="Montants perçus par le foyer sur cette ligne de parts. Le revenu imposable, lui, figure sur l'attestation fiscale annuelle du gestionnaire."
          >
            {numberField('Revenus distribués (12 derniers mois)', revenus12m, setRevenus12m)}
            <div className="space-y-1.5">
              <Label>Régime fiscal</Label>
              <Select value={regimeFiscal || undefined} onValueChange={setRegimeFiscal}>
                <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                  <SelectValue placeholder="Choisir le régime fiscal" />
                </SelectTrigger>
                <SelectContent>
                  {regimeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PanelSection>

          <PanelSection title="Imposition" grid={false}>
            <dl className="max-w-2xl">
              <SummaryRow label="Catégorie">
                <span className="flex flex-wrap items-center gap-2">
                  {imposition.libelle}
                  {imposition.microFoncierPossible === true && <Chip tone="lagon">Micro-foncier possible</Chip>}
                  {imposition.microFoncierPossible === false && <Chip tone="citron">Réel obligatoire</Chip>}
                </span>
              </SummaryRow>
              <SummaryRow label="Déclaration"><span className="font-normal">{imposition.declaration}</span></SummaryRow>
            </dl>
            {imposition.notes.length > 0 && (
              <ul className="max-w-2xl space-y-1.5 border-t border-border pt-3 text-[12.5px] text-muted-foreground">
                {imposition.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </PanelSection>
        </div>

        <aside className="px-8 py-6">
          <div className="lg:sticky lg:top-6">
            <PanelTitle>Indicateurs</PanelTitle>
            <dl className="mt-3">
              <SummaryRow label="Distribution">
                {fmtPct(indicateurs.tauxDistribution) && (
                  <>
                    <span className="tabular-nums">{fmtPct(indicateurs.tauxDistribution)}</span>
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">revenus / prix d'acquisition</span>
                  </>
                )}
              </SummaryRow>
              <SummaryRow label="Rendement">
                {fmtPct(indicateurs.rendementActuel) && (
                  <>
                    <span className="tabular-nums">{fmtPct(indicateurs.rendementActuel)}</span>
                    <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">revenus / valeur estimée</span>
                  </>
                )}
              </SummaryRow>
              <SummaryRow label="Plus-value">
                {plusValue !== null && (
                  <>
                    <span className={`tabular-nums ${plusValue >= 0 ? 'text-positive' : 'text-destructive'}`}>
                      {plusValue >= 0 ? '+' : ''}{formatCurrency(plusValue)}
                    </span>
                    {fmtPct(indicateurs.tauxPlusValue) && (
                      <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">{fmtPct(indicateurs.tauxPlusValue)} latente</span>
                    )}
                  </>
                )}
              </SummaryRow>
              {exonerationRurale && (
                <SummaryRow label="Succession"><span className="font-normal">{exonerationRurale}</span></SummaryRow>
              )}
            </dl>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Plus-value pondérée par la quote-part du foyer et, en cas de démembrement, par la valeur de l'usufruit ou de
              la nue-propriété, comme la Vue d'ensemble.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
