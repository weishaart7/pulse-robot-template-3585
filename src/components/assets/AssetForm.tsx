import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm } from './ChargeForm';
import { ASSET_NATURE_OPTIONS, isAssuranceVieHorsSuccession } from '@/constants/assetTypes';
import { useAssetForm } from '@/hooks/useAssetForm';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Info, Users, ShoppingCart, Coins, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndivisaireDraft } from './IndivisairesSection';
import { DemembrementDraft } from './DemembrementSection';
import { isInCouple } from '@/lib/patrimoine/qualification';
import { ActifFormFrame } from './ActifFormFrame';
import { PlusValueBlock } from './fields/PlusValueBlock';
import { ValeurEstimeeFields } from './fields/ValeurEstimeeFields';
import { ValorisationDemembreeBlock } from './fields/ValorisationDemembreeBlock';
import { OrigineQualificationFields } from './fields/OrigineQualificationFields';
import { DetentionFields } from './fields/DetentionFields';
import { CaracteristiquesFields } from './fields/CaracteristiquesFields';
import { ChargesListFields } from './fields/ChargesListFields';
import { FieldHelp } from '@/components/ui/field-help';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[]) => Promise<void>;
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
              <SearchableSelect options={ASSET_NATURE_OPTIONS} value={field.value} onChange={field.onChange} placeholder="Choisir une nature" className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="denomination" render={({ field }) => (
          <FormItem>
            <FormLabel>Dénomination</FormLabel>
            <FormControl>
              <Input className="bg-muted border-transparent shadow-none rounded-[5px] focus-visible:bg-background focus-visible:border-ring" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
      </div>

      <ValeurEstimeeFields form={form} />

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
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
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
        <div className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
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
    <div className="space-y-6">
      <ActifFormFrame
        title={asset ? "Modifier l'actif" : 'Ajouter un actif'}
      >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex gap-2 flex-wrap">
              {FORM_TABS.map((tab) => {
                const locked = isTabLocked(tab.id);
                return (
                  <button
                    key={tab.id}
                    type="button"
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
                      "af-mono inline-flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all duration-200",
                      locked
                        ? "bg-[var(--af-track)] text-[var(--af-smoke)] opacity-50 cursor-not-allowed"
                        : activeTab === tab.id
                          ? "bg-[var(--af-ink)] text-white"
                          : "bg-[var(--af-track)] text-[var(--af-smoke)] hover:text-[var(--af-ink)]"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {showLockedTabHint && isTabLocked('propriete') && (
              <p className="text-xs text-muted-foreground px-1">
                Renseignez d'abord la nature de l'actif
              </p>
            )}
          </div>

          <div className="mt-6">
            {renderContent()}
          </div>

          <div className="flex justify-between pt-8">
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
