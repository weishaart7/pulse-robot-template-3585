import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NaturePicker } from '@/components/assets/NaturePicker';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { isAssuranceVieHorsSuccession, isCreance, isPrevoyanceDeces } from '@/constants/assetTypes';
import { useAssetForm } from '@/hooks/useAssetForm';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Info, Users, ShoppingCart, Coins, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndivisaireDraft } from './IndivisairesSection';
import { DemembrementDraft } from './DemembrementSection';
import { isInCouple } from '@/lib/patrimoine/qualification';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { ActifFormFrame } from './ActifFormFrame';
import { PlusValueBlock } from './fields/PlusValueBlock';
import { ValeurEstimeeFields } from './fields/ValeurEstimeeFields';
import { PrimeFields } from './fields/PrimeFields';
import { ValorisationDemembreeBlock } from './fields/ValorisationDemembreeBlock';
import { OrigineQualificationFields } from './fields/OrigineQualificationFields';
import { DetentionFields } from './fields/DetentionFields';
import { CaracteristiquesFields } from './fields/CaracteristiquesFields';
import { ChargesListFields } from './fields/ChargesListFields';
import { FieldHelp } from '@/components/ui/field-help';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<boolean | void>;
  onCancel: () => void;
  onDelete?: (assetId: string) => Promise<void>;
}

const FORM_TABS = [
  { id: 'essentiel', label: 'Essentiel' },
  { id: 'propriete', label: 'Propriété' },
  { id: 'caracteristiques', label: 'Caractéristiques' },
  { id: 'charges', label: 'Charges' },
];

export const AssetForm: React.FC<AssetFormProps> = ({
  asset,
  onSubmit,
  onCancel,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState('essentiel');
  const [showLockedTabHint, setShowLockedTabHint] = useState(false);
  const {
    form,
    charges,
    setCharges,
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
    demembrements,
    setDemembrements,
    qualificationRaison,
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
  // À la création, tant que la nature n'est pas renseignée, les onglets
  // autres que "essentiel" sont verrouillés (rien à qualifier avant ça).
  // En édition, l'actif existe déjà avec une nature : pas de verrouillage.
  const isTabLocked = (tabId: string) => !asset && tabId !== 'essentiel' && !watchedNature;
  const isAVHorsSuccession = isAssuranceVieHorsSuccession(watchedNature);

  const renderEssentielSection = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField control={form.control} name="nature" render={({ field }) => (
          <FormItem>
            <FormLabel>Nature *</FormLabel>
            <FormControl>
              <NaturePicker value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="denomination" render={({ field }) => (
          <FormItem>
            <FormLabel>Dénomination</FormLabel>
            <FormControl>
              <Input className="bg-background border-border shadow-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <ValeurEstimeeFields form={form} />

      {isPrevoyanceDeces(watchedNature) && (
        <PrimeFields form={form} charges={charges} setCharges={setCharges} familyData={familyData} assetId={asset?.id} />
      )}

      <PlusValueBlock form={form} />

      <ValorisationDemembreeBlock
        form={form}
        familyData={familyData}
        familyMembers={familyMembers}
        demembrements={demembrements}
      />
    </div>
  );

  const renderCaracteristiquesSection = () => <CaracteristiquesFields form={form} />;

  const renderProprieteSection = () => {
    const proprieteRappel = isInCouple(maritalContext.statutCouple) ? (
      <div className="rounded-[2px] border border-border bg-secondary/50 p-4 text-sm text-muted-foreground">
        <p>
          Régime matrimonial : <span className="font-medium text-foreground">{maritalContext.regimeMatrimonial || 'Non renseigné'}</span>
        </p>
        <p>
          {maritalContext.statutCouple === 'Pacsé(e)' ? 'Date de PACS' : 'Date de mariage'} :{' '}
          <span className="font-medium text-foreground">
            {(maritalContext.statutCouple === 'Pacsé(e)' ? maritalContext.datePacs : maritalContext.dateMariage) || 'Non renseignée'}
          </span>
        </p>
      </div>
    ) : null;

    return (
    <div className="space-y-6">
      {isAVHorsSuccession && (
        <div className="flex items-center gap-2 rounded-[2px] border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <p>
            Sans effet sur la transmission
            <FieldHelp>
              Ces informations n'ont aucun effet sur la transmission de ce contrat : au décès, il est transmis hors succession selon sa clause bénéficiaire, à renseigner dans Transmission → Assurance-vie. Elles ne servent qu'à la répartition du patrimoine par personne.
            </FieldHelp>
          </p>
        </div>
      )}

      {proprieteRappel}

      <OrigineQualificationFields
        form={form}
        maritalContext={maritalContext}
        qualificationRaison={qualificationRaison}
      />

      <DetentionFields
        form={form}
        detenteurOptions={detenteurOptions}
        familyData={familyData}
        familyMembers={familyMembers}
        maritalContext={maritalContext}
        indivisaires={indivisaires}
        setIndivisaires={setIndivisaires}
        demembrements={demembrements}
        setDemembrements={setDemembrements}
      />
    </div>
    );
  };

  const renderChargesSection = () => (
    <ChargesListFields
      charges={charges}
      onAdd={() => setShowChargeForm(true)}
      onEdit={handleChargeEdit}
      onDelete={handleChargeDelete}
    />
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'essentiel': return renderEssentielSection();
      case 'propriete': return renderProprieteSection();
      case 'caracteristiques': return renderCaracteristiquesSection();
      case 'charges': return renderChargesSection();
      default: return renderEssentielSection();
    }
  };

  return (
    <div>
      <ActifFormFrame
        title={asset ? (asset.denomination || "Modifier l'actif") : 'Ajouter un actif'}
        trail={asset ? "Modifier l'actif" : 'Ajouter un actif'}
        actions={
          <>
            <Button type="button" variant="outline" onClick={onCancel} className={panelButtonClass}>
              Annuler
            </Button>
            <Button type="submit" form="asset-form" disabled={isLoading} className={panelPrimaryButtonClass}>
              {isLoading ? <><LogoSpinner />Enregistrement...</> : 'Enregistrer'}
            </Button>
          </>
        }
      >
      <Form {...form}>
        <form id="asset-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="flex flex-col items-start gap-1.5">
            <div className="inline-flex flex-wrap gap-[3px] rounded-[5px] border border-border bg-muted/40 p-[3px]">
              {FORM_TABS.filter((tab) => !(tab.id === 'charges' && (isCreance(watchedNature) || isPrevoyanceDeces(watchedNature)))).map((tab) => {
                const locked = isTabLocked(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={activeTab === tab.id}
                    aria-disabled={locked}
                    onClick={() => {
                      if (locked) {
                        setShowLockedTabHint(true);
                        return;
                      }
                      setShowLockedTabHint(false);
                      setActiveTab(tab.id);
                    }}
                    className={cn(
                      "h-8 rounded-[2px] border px-4 text-[12.5px] transition-colors",
                      locked
                        ? "border-transparent text-muted-foreground opacity-50 cursor-not-allowed"
                        : activeTab === tab.id
                          ? "border-foreground bg-foreground text-background"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {showLockedTabHint && isTabLocked('propriete') && (
              <p className="text-[12px] text-muted-foreground">
                Renseignez d'abord la nature de l'actif
              </p>
            )}
          </div>

          <div className="mt-6">
            {renderContent()}
          </div>

          {asset?.id && onDelete && (
            <div className="border-t border-border pt-5">
              <Button type="button" variant="ghost" onClick={handleDelete} disabled={isLoading} className="h-8 rounded-[2px] px-3 text-[12.5px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive">
                Supprimer l'actif
              </Button>
            </div>
          )}
        </form>
      </Form>
      </ActifFormFrame>

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
