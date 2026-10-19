import React from 'react';
import { Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { WorkspaceHeader, panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Asset } from '@/services/assetService';
import type { Emprunt } from '@/services/passifService';
import { ProjectionBienSection } from './projection/ProjectionBienSection';
import { SimulationReventeSection } from './revente/SimulationReventeSection';
import { useImmobilierPropertyForm } from '@/hooks/useImmobilierPropertyForm';
import { PropertyGeneralSection } from './property/PropertyGeneralSection';
import { PropertyCostSection } from './property/PropertyCostSection';
import { PropertyFinancingSection } from './property/PropertyFinancingSection';
import { PropertyLocationSection } from './property/PropertyLocationSection';
import { SimulateurRentabiliteSection } from './SimulateurRentabiliteSection';

interface ImmobilierPropertyDetailViewProps {
  asset: Asset;
  /** Emprunts Patrimoine des biens d'Immobilier (ceux reliés à ce bien font foi pour son crédit). */
  emprunts?: Emprunt[];
  onBack: () => void;
  onUpdate: () => void;
}

// Fiche d'un bien en « panneau de travail », comme les formulaires d'actif de Patrimoine : barre
// d'en-tête « Immobilier / Mes biens / bien » portant Retour, Annuler et Enregistrer, titre 24 px,
// puis les sections du formulaire séparées par des filets, et le simulateur pour la location nue.
export const ImmobilierPropertyDetailView: React.FC<ImmobilierPropertyDetailViewProps> = ({
  asset,
  emprunts = [],
  onBack,
  onUpdate,
}) => {
  const empruntsRelies = emprunts.filter((e) => e.asset_id === asset.id);
  const { form, isResidence, isRentalProperty, handleSubmit } = useImmobilierPropertyForm({
    asset,
    onSuccess: onUpdate,
    onClose: onBack,
  });

  const showForm = isResidence || isRentalProperty;
  const isSubmitting = form.formState.isSubmitting;
  const nom = asset.denomination || 'Sans dénomination';

  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader
        icon={<Building2 strokeWidth={1.75} />}
        trail={['Immobilier', 'Mes biens', nom]}
        actions={
          <>
            <Button type="button" variant="outline" onClick={onBack} className={panelButtonClass}>
              {showForm ? 'Annuler' : 'Retour'}
            </Button>
            {showForm && (
              <Button type="submit" form="immobilier-property-form" disabled={isSubmitting} className={panelPrimaryButtonClass}>
                {isSubmitting ? <><LogoSpinner />Enregistrement...</> : 'Enregistrer'}
              </Button>
            )}
          </>
        }
      />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{nom}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{asset.nature}</p>
      </div>

      <div className="border-t border-border px-8 py-6">
        {showForm ? (
          <Form {...form}>
            <form id="immobilier-property-form" onSubmit={handleSubmit}>
              <PropertyGeneralSection form={form} showStatutField={isResidence} />
              <PropertyCostSection asset={asset} showMeublesField={isRentalProperty} />
              {isRentalProperty && (
                <>
                  <PropertyFinancingSection form={form} empruntsRelies={empruntsRelies} />
                  <PropertyLocationSection form={form} assetNature={asset.nature} />
                </>
              )}
            </form>
          </Form>
        ) : (
          <p className="max-w-md text-[13px] text-muted-foreground">
            La gestion des informations pour cette catégorie de bien sera disponible prochainement.
          </p>
        )}
      </div>

      {asset.nature === 'Immeubles locatifs (loués nus)' && (
        <div className="border-t border-border">
          <SimulateurRentabiliteSection asset={asset} emprunts={emprunts} />
        </div>
      )}

      {showForm && (
        <div className="border-t border-border px-8 py-6">
          <ProjectionBienSection asset={asset} emprunts={emprunts} />
        </div>
      )}

      {showForm && (
        <div className="border-t border-border px-8 py-6">
          <SimulationReventeSection asset={asset} emprunts={emprunts} />
        </div>
      )}
    </div>
  );
};
