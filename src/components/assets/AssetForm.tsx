import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NaturePicker } from '@/components/assets/NaturePicker';
import { Asset, AssetCharge } from '@/services/assetService';
import { ChargeForm, debiteurDepuisDetention } from './ChargeForm';
import { NATURES_WITHOUT_ACQUISITION, isAssuranceVieHorsSuccession, isCreance, isLiquidites, isPrevoyanceDeces, isPrevoyanceSansRachat } from '@/constants/assetTypes';
import { useAssetForm } from '@/hooks/useAssetForm';
import AnimatedBackground from '@/components/ui/animated-tabs';
import { Info, Users, ShoppingCart, Coins, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IndivisaireDraft } from './IndivisairesSection';
import { AssetSaisieExtras } from '@/hooks/useAssetForm';
import { DemembrementDraft } from './DemembrementSection';
import { isInCouple } from '@/lib/patrimoine/qualification';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { ActifFormFrame } from './ActifFormFrame';
import { PlusValueBlock } from './fields/PlusValueBlock';
import { ValeurEstimeeFields } from './fields/ValeurEstimeeFields';
import { PrimeFields } from './fields/PrimeFields';
import { ValorisationDemembreeBlock } from './fields/ValorisationDemembreeBlock';
import { OrigineFields, QualificationFields } from './fields/OrigineQualificationFields';
import { DetentionFields } from './fields/DetentionFields';
import { CaracteristiquesFields, TypeFondsField, TypeGroupementField } from './fields/CaracteristiquesFields';
import { ChargesListFields } from './fields/ChargesListFields';
import { FieldHelp } from '@/components/ui/field-help';
import { DescriptionBienFields } from './fields/BienImmobilierFields';
import { LocationFields } from './fields/LocationFields';
import { hasDetailImmobilier, isRentalPropertyType, estEnLocation } from '@/schemas/immobilierPropertySchema';
import type { Emprunt } from '@/services/passifService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { RequiredMark } from '@/components/ui/required-mark';
import { PanelSection } from '@/components/immobilier/property/PanelSection';
import { champsObligatoiresVisibles } from '@/schemas/assetSchema';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (asset: any, charges: AssetCharge[], indivisaires: IndivisaireDraft[], demembrements: DemembrementDraft[], extras?: AssetSaisieExtras) => Promise<boolean | void>;
  onCancel: () => void;
  onDelete?: (assetId: string) => Promise<void>;
  /** Emprunts Patrimoine reliés à cet actif (résidence ou bien locatif), affichés dans Propriété. */
  empruntsRelies?: Emprunt[];
  /** Ouvre la saisie d'un emprunt relié à cet actif (Passifs). */
  onAjouterCredit?: () => void;
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
  onDelete,
  empruntsRelies = [],
  onAjouterCredit,
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

  // Champ en erreur dans un onglet masqué : on ouvre l'onglet qui le porte (les champs non listés
  // sont dans Caractéristiques, où vivent les champs conditionnés à la nature).
  const handleInvalid = (errors: Record<string, unknown>) => {
    const champs = Object.keys(errors);
    const ongletDe = (champ: string) =>
      ['nature', 'denomination', 'type_groupement', 'type_fonds', 'valeur_estimee', 'date_estimation', 'capital_garanti'].includes(champ) ? 'essentiel'
        : ['date_acquisition', 'origine_actif', 'valeur_acquisition', 'frais_acquisition', 'mode_detention', 'detenteur', 'qualification_bien', 'financement_mixte_apport_propre', 'pourcentage_utilisateur', 'pourcentage_conjoint'].includes(champ) ? 'propriete'
        : 'caracteristiques';
    const onglets: string[] = champs.map(ongletDe);
    if (onglets.length > 0 && !onglets.includes(activeTab)) setActiveTab(onglets[0]);
  };

  const watchedNature = form.watch('nature');
  const watchedDetenteur = form.watch('detenteur');
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
            <FormLabel>Nature<RequiredMark /></FormLabel>
            <FormControl>
              <NaturePicker value={field.value} onChange={field.onChange} className="bg-background border-border shadow-none" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="denomination" render={({ field }) => (
          <FormItem>
            <FormLabel>Dénomination<RequiredMark /></FormLabel>
            <FormControl>
              <Input className="bg-background border-border shadow-none" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <TypeGroupementField form={form} />
        <TypeFondsField form={form} />
      </div>

      <DescriptionBienFields form={form} />

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

  const renderCaracteristiquesSection = () => (
    <div className="space-y-6">
      {estEnLocation({ nature: watchedNature, usage_loue: form.watch('usage_loue') }) && <LocationFields form={form} />}
      <CaracteristiquesFields form={form} />
    </div>
  );

  // Onglet Propriété en sections de panneau (PanelSection : titre à repère, filets bord à bord), dans
  // l'ordre où se construit la qualification : acquisition, prix, puis détention et qualification
  // réunies (avec le rappel du régime matrimonial), et crédit du bien. Une section sans objet pour la
  // nature n'est pas affichée.
  const renderProprieteSection = () => {
    const sansAcquisition = NATURES_WITHOUT_ACQUISITION.includes(watchedNature) && !isCreance(watchedNature);
    const prixVisible = champsObligatoiresVisibles({ nature: watchedNature, detenteur: watchedDetenteur }).valeur_acquisition;
    const qualificationVisible = (!sansAcquisition || isLiquidites(watchedNature)) && !isPrevoyanceSansRachat(watchedNature);
    const enCouple = isInCouple(maritalContext.statutCouple);
    const pacs = maritalContext.statutCouple === 'Pacsé(e)';
    const dateUnion = pacs ? maritalContext.datePacs : maritalContext.dateMariage;

    return (
    <div>
      {isAVHorsSuccession && (
        <div className="mt-6 flex items-center gap-2 rounded-[2px] border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" strokeWidth={1.5} />
          <p>
            Sans effet sur la transmission
            <FieldHelp>
              Ces informations n'ont aucun effet sur la transmission de ce contrat : au décès, il est transmis hors succession selon sa clause bénéficiaire, à renseigner dans Transmission → Assurance-vie. Elles ne servent qu'à la répartition du patrimoine par personne.
            </FieldHelp>
          </p>
        </div>
      )}

      {!sansAcquisition && (
        <PanelSection title="Acquisition" grid={false}>
          <div className="space-y-5">
            <OrigineFields form={form} maritalContext={maritalContext} section="origine" />
          </div>
        </PanelSection>
      )}

      {prixVisible && (
        <PanelSection title="Prix" grid={false}>
          <div className="space-y-5">
            <OrigineFields form={form} maritalContext={maritalContext} section="prix" />
          </div>
        </PanelSection>
      )}

      {/* Détention et qualification ensemble : le détenteur est une entrée de qualifierBien(), la
          qualification se lit juste sous le choix qui la détermine, avec le régime en rappel. */}
      <PanelSection
        title={qualificationVisible ? 'Détention et qualification' : 'Détention'}
        grid={false}
        description={qualificationVisible && enCouple ? (
          <>
            {maritalContext.regimeMatrimonial || 'Régime non renseigné'}
            <span className="mx-1.5 text-muted-foreground/50">·</span>
            {dateUnion ? `${pacs ? 'PACS' : 'Mariage'} le ${new Date(`${dateUnion.slice(0, 10)}T00:00:00`).toLocaleDateString('fr-FR')}` : `Date de ${pacs ? 'PACS' : 'mariage'} non renseignée`}
          </>
        ) : undefined}
      >
        <div className="space-y-5">
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
          {qualificationVisible && <QualificationFields form={form} qualificationRaison={qualificationRaison} familyData={familyData} />}
        </div>
      </PanelSection>

      {asset?.id && hasDetailImmobilier(watchedNature) && (
        <PanelSection title="Crédit" grid={false} description="Les crédits se saisissent et se modifient dans Patrimoine → Passifs.">
          {empruntsRelies.length > 0 ? (
            <ul className="divide-y divide-border border-y border-border text-[13px]">
              {empruntsRelies.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                  <span className="text-foreground">{e.libelle || e.nature}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {e.capital_restant_du != null ? `${formatCurrency(e.capital_restant_du)} restant dû` : 'Capital restant dû non renseigné'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-muted-foreground">Aucun crédit relié à ce bien.</p>
          )}
          {onAjouterCredit && (
            form.formState.isDirty ? (
              <p className="text-[12px] text-muted-foreground">Enregistrez d'abord vos modifications pour ajouter un crédit.</p>
            ) : (
              <Button type="button" variant="outline" onClick={onAjouterCredit} className={panelButtonClass}>
                Ajouter un crédit
              </Button>
            )
          )}
        </PanelSection>
      )}
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
        <form id="asset-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="space-y-6">
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

      {showChargeForm && activeTab === 'charges' && (
        <ChargeForm
          charge={editingCharge || undefined}
          debiteurParDefaut={debiteurDepuisDetention(form.getValues('detenteur'), form.getValues('qualification_bien'), familyData, { utilisateur: form.getValues('pourcentage_utilisateur'), conjoint: form.getValues('pourcentage_conjoint') })}
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
