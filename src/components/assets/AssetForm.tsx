import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { DateInput } from '@/components/ui/date-input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { ASSET_NATURES, getAssetCategory, NATURES_WITHOUT_ACQUISITION } from '@/constants/assetTypes';
import { useAssetForm, NATURES_WITH_ETABLISSEMENT } from '@/hooks/useAssetForm';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Globe, Info, TrendingUp, TrendingDown, Sparkles, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { IndivisairesSection } from './IndivisairesSection';
import { qualifierBien, QUALIFICATION_OPTIONS } from '@/lib/patrimoine/qualification';
import { 
  ORIGINE_ACTIF_OPTIONS, 
  SITUATION_PARTICULIERE_OPTIONS, 
  MODE_DETENTION_OPTIONS,
  NATURES_LIQUIDITES_FR
} from '@/schemas/assetSchema';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: any, charges: AssetCharge[]) => Promise<void>;
  onCancel: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}

const FORM_TABS = [
  { id: 'general', label: 'Informations générales' },
  { id: 'detention', label: 'Détention' },
  { id: 'acquisition', label: 'Acquisition' },
  { id: 'valorisation', label: 'Valorisation' },
  { id: 'charges', label: 'Charges' },
];

export const AssetForm: React.FC<AssetFormProps> = ({
  asset,
  onSubmit,
  onCancel,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const {
    form,
    charges,
    showChargeForm,
    setShowChargeForm,
    editingCharge,
    setEditingCharge,
    isLoading,
    detenteurOptions,
    familyMembers,
    familyData,
    maritalContext,
    indivisaires,
    setIndivisaires,
    handleSubmit,
    handleChargeSubmit,
    handleChargeDelete,
    handleChargeEdit
  } = useAssetForm({ asset, onSubmit });

  const handleDelete = async () => {
    if (asset?.id && onDelete && window.confirm('Êtes-vous sûr de vouloir supprimer cet actif ? Cette action est irréversible.')) {
      await onDelete(asset.id);
    }
  };

  const watchedNature = form.watch('nature');
  const watchedModeDetention = form.watch('mode_detention');
  const watchedDetenteur = form.watch('detenteur');
  const watchedValeurAcquisition = form.watch('valeur_acquisition');
  const watchedValeurEstimee = form.watch('valeur_estimee');
  const isImmobilier = getAssetCategory(watchedNature) === 'actifs immobiliers';
  const hideAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature);
  const showEtablissement = NATURES_WITH_ETABLISSEMENT.includes(watchedNature);
  const showBienEtranger = watchedNature && !NATURES_LIQUIDITES_FR.includes(watchedNature);

  // Plus-value live
  const plusValueLive = (watchedValeurEstimee || 0) - (watchedValeurAcquisition || 0);
  const plusValuePct = watchedValeurAcquisition && watchedValeurAcquisition > 0
    ? (plusValueLive / watchedValeurAcquisition) * 100
    : 0;
  const showPlusValue = !hideAcquisition && watchedValeurAcquisition && watchedValeurEstimee;

  const formatEur = (n: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="nature" render={({ field }) => (
          <FormItem>
            <FormLabel>Nature *</FormLabel>
            <FormControl>
              <SearchableSelect options={ASSET_NATURES} value={field.value} onChange={field.onChange} placeholder="Choisir une nature" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="denomination" render={({ field }) => (
          <FormItem>
            <FormLabel>Dénomination</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {showEtablissement && (
          <FormField control={form.control} name="etablissement" render={({ field }) => (
            <FormItem>
              <FormLabel>Établissement</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="situation_particuliere" render={({ field }) => (
          <FormItem>
            <FormLabel>Situation particulière</FormLabel>
            <Select
              onValueChange={(value) => field.onChange([value])}
              value={field.value?.[0] || 'Non'}
            >
              <FormControl>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Choisir la situation particulière" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {SITUATION_PARTICULIERE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {showBienEtranger && (
        <FormField
          control={form.control}
          name="bien_etranger"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  Bien situé à l'étranger
                </FormLabel>
                <FormDescription>
                  Impact fiscal : déclaration spécifique (formulaire 3916 pour les comptes, conventions fiscales, IFI sur immobilier étranger). À traiter au cas par cas.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      {isImmobilier && (
        <FormField
          control={form.control}
          name="transfert_immobilier"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Transfert dans Immobilier</FormLabel>
                <FormDescription>
                  Ce bien apparaîtra dans la section "Immobilier" → "Mes biens"
                </FormDescription>
              </div>
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="attachement_emotionnel"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Attachement émotionnel</FormLabel>
            <FormDescription>
              De 0 (aucun attachement) à 10 (attachement très fort)
            </FormDescription>
            <FormControl>
              <div className="space-y-2">
                <Slider
                  min={0}
                  max={10}
                  step={0.5}
                  value={[field.value || 0]}
                  onValueChange={(vals) => field.onChange(vals[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Aucun</span>
                  <span className="font-medium text-foreground">{field.value || 0} / 10</span>
                  <span>Très fort</span>
                </div>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderDetentionSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="mode_detention" render={({ field }) => (
          <FormItem>
            <FormLabel>Mode de détention</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Choisir un mode de détention" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {MODE_DETENTION_OPTIONS.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {(watchedModeDetention === 'Usufruit' || watchedModeDetention === 'Nue-propriété') && (
          <FormField control={form.control} name="beneficiaire_autre_partie" render={({ field }) => (
            <FormItem>
              <FormLabel>
                {watchedModeDetention === 'Usufruit' ? 'Nu-propriétaire' : 'Usufruitier'}
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger size="lg">
                    <SelectValue placeholder="Choisir une personne" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-background z-50">
                  {familyMembers.map((member) => (
                    <SelectItem key={member.id || member.nom} value={member.id || ''}>
                      {member.prenom ? `${member.prenom} ${member.nom}` : member.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Sélectionnez le bénéficiaire parmi les personnes renseignées dans la section Famille
              </FormDescription>
              <FormMessage />
            </FormItem>
          )} />
        )}

        <FormField control={form.control} name="detenteur" render={({ field }) => (
          <FormItem>
            <FormLabel>Détenteur</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger size="lg">
                  <SelectValue placeholder="Choisir un détenteur" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {detenteurOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        {watchedDetenteur === 'Le couple' && familyData.hasPartner && (
          <>
            <FormField control={form.control} name="pourcentage_utilisateur" render={({ field }) => (
              <FormItem>
                <FormLabel>Pourcentage appartenant à {familyData.userFirstName || 'vous'} (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...field}
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                      form.setValue('pourcentage_conjoint', 100 - value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="pourcentage_conjoint" render={({ field }) => (
              <FormItem>
                <FormLabel>Pourcentage appartenant à {familyData.partnerFirstName || 'votre conjoint(e)'} (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    {...field}
                    onChange={e => {
                      const value = parseFloat(e.target.value) || 0;
                      field.onChange(value);
                      form.setValue('pourcentage_utilisateur', 100 - value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </>
        )}
      </div>
    </div>
  );

  const renderAcquisitionSection = () => {
    if (hideAcquisition) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Les informations d'acquisition ne sont pas applicables pour ce type d'actif.
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField control={form.control} name="origine_actif" render={({ field }) => (
            <FormItem>
              <FormLabel>Origine de l'actif</FormLabel>
              <Select
                onValueChange={(value) => field.onChange([value])}
                value={field.value?.[0] || 'Acquisition à titre onéreuse'}
              >
                <FormControl>
                  <SelectTrigger size="lg">
                    <SelectValue placeholder="Choisir l'origine de l'actif" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ORIGINE_ACTIF_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="date_acquisition" render={({ field }) => (
            <FormItem>
              <FormLabel>Date d'acquisition</FormLabel>
              <FormControl>
                <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="valeur_acquisition" render={({ field }) => (
            <FormItem>
              <FormLabel>Valeur d'achat / réception (€)</FormLabel>
              <FormDescription>Prix payé à l'achat, ou valeur déclarée si reçu en donation/héritage. Sert de base pour le calcul de la plus-value.</FormDescription>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="frais_acquisition" render={({ field }) => (
            <FormItem>
              <FormLabel>Frais d'acquisition (€)</FormLabel>
              <FormDescription>Notaire, agence, droits d'enregistrement, etc.</FormDescription>
              <FormControl>
                <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
      </div>
    );
  };

  const renderValorisationSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="valeur_estimee" render={({ field }) => (
          <FormItem>
            <FormLabel>Valeur actuelle estimée (€)</FormLabel>
            <FormDescription>Valeur du bien à ce jour. C'est elle qui est utilisée dans le calcul du patrimoine.</FormDescription>
            <FormControl>
              <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="date_estimation" render={({ field }) => (
          <FormItem>
            <FormLabel>Date d'estimation</FormLabel>
            <FormControl>
              <DateInput value={field.value} onChange={field.onChange} placeholder="jj/mm/aaaa" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="revalorisation_annuelle" render={({ field }) => (
          <FormItem>
            <FormLabel>Revalorisation annuelle (%)</FormLabel>
            <FormDescription>Hypothèse de revalorisation pour les projections.</FormDescription>
            <FormControl>
              <Input type="number" step="0.01" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      {showPlusValue && (
        <div className="rounded-xl border border-border/60 bg-card p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-widest">Plus / moins-value latente</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] text-muted-foreground/60">Valeur d'achat</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurAcquisition || 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/60">Valeur actuelle</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums mt-0.5">{formatEur(watchedValeurEstimee || 0)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground/60">Différence</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {plusValueLive >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" strokeWidth={2} />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-500" strokeWidth={2} />
                )}
                <p className={`text-[15px] font-bold tabular-nums ${plusValueLive >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {plusValueLive >= 0 ? '+' : ''}{formatEur(plusValueLive)}
                  <span className="text-[11px] font-medium ml-1.5 opacity-70">({plusValuePct >= 0 ? '+' : ''}{plusValuePct.toFixed(1)}%)</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderChargesSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Gérez les charges associées à cet actif</p>
        <Button type="button" variant="outline" onClick={() => setShowChargeForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Ajouter une charge
        </Button>
      </div>

      {charges.length > 0 ? (
        <div className="space-y-2">
          {charges.map(charge => (
            <Card key={charge.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{charge.denomination}</p>
                  <p className="text-sm text-muted-foreground">
                    {charge.type_charge} - {charge.montant} {charge.unite} ({charge.periodicite})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleChargeEdit(charge)}>
                    Modifier
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleChargeDelete(charge.id!)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Aucune charge associée à cet actif
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSection();
      case 'detention': return renderDetentionSection();
      case 'acquisition': return renderAcquisitionSection();
      case 'valorisation': return renderValorisationSection();
      case 'charges': return renderChargesSection();
      default: return renderGeneralSection();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {asset ? 'Modifier l\'actif' : 'Ajouter un actif'}
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="flex justify-start">
            <div className="rounded-[8px] bg-muted p-[2px]">
              <AnimatedBackground
                defaultValue="general"
                onValueChange={(value) => setActiveTab(value || 'general')}
                className="rounded-lg bg-background shadow-sm"
                transition={{
                  ease: "easeInOut",
                  duration: 0.2,
                }}
              >
                {FORM_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    data-id={tab.id}
                    type="button"
                    className="inline-flex min-w-24 items-center justify-center px-3 py-2 text-sm font-medium text-foreground transition-transform active:scale-[0.98]"
                  >
                    {tab.label}
                  </button>
                ))}
              </AnimatedBackground>
            </div>
          </div>

          <div className="mt-6">
            {renderContent()}
          </div>

          <div className="flex justify-between pt-6 border-t">
            {asset?.id && onDelete && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
                Supprimer l'actif
              </Button>
            )}
            <div className="flex space-x-2 ml-auto">
              <Button type="button" variant="outline" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {showChargeForm && (
        <ChargeForm
          charge={editingCharge || undefined}
          onSubmit={handleChargeSubmit}
          onCancel={() => {
            setShowChargeForm(false);
            setEditingCharge(null);
          }}
        />
      )}
    </div>
  );
};
