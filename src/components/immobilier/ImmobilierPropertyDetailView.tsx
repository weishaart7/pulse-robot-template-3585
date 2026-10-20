import { getNatureDisplayLabel } from '@/constants/assetTypes';
import { typologiesPourNature, avecPosteMeubles, toujoursLoueNu, estEnLocation } from '@/schemas/immobilierPropertySchema';
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { GooeyNav } from '@/components/ui/gooey-nav';
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
import { PropertyLocationSection } from './property/PropertyLocationSection';
import { SimulateurRentabiliteSection } from './SimulateurRentabiliteSection';
import { RevenusChargesSection } from './RevenusChargesSection';

interface ImmobilierPropertyDetailViewProps {
  asset: Asset;
  /** Emprunts Patrimoine des biens d'Immobilier (ceux reliés à ce bien font foi pour son crédit). */
  emprunts?: Emprunt[];
  onBack: () => void;
  onUpdate: () => void;
  /** Ouverte depuis « Revenus et charges » : la fiche s'ouvre sur cet onglet. */
  focusRevenusCharges?: boolean;
}

type OngletFiche = 'informations' | 'revenus' | 'simulation';

// Fiche d'un bien en « panneau de travail », comme les formulaires d'actif de Patrimoine : barre
// d'en-tête « Immobilier / Mes biens / bien » portant Retour, Annuler et Enregistrer, titre 24 px,
// puis trois onglets : informations du bien, revenus et charges, simulations.
export const ImmobilierPropertyDetailView: React.FC<ImmobilierPropertyDetailViewProps> = ({
  asset,
  emprunts = [],
  onBack,
  onUpdate,
  focusRevenusCharges = false,
}) => {
  const [onglet, setOnglet] = useState<OngletFiche>(focusRevenusCharges ? 'revenus' : 'informations');
  useEffect(() => {
    if (focusRevenusCharges) setOnglet('revenus');
  }, [focusRevenusCharges]);
  const empruntsRelies = emprunts.filter((e) => e.asset_id === asset.id);
  const { form, isResidence, isRentalProperty, handleSubmit } = useImmobilierPropertyForm({
    asset,
    onSuccess: onUpdate,
    onClose: onBack,
  });

  const showForm = isResidence || isRentalProperty;
  // Parking personnel ou local occupé pour sa propre activité (sans type de location) : pas de location.
  const enLocation = estEnLocation({ nature: asset.nature, usage_loue: !!asset.type_location });
  const isSubmitting = form.formState.isSubmitting;
  const nom = asset.denomination || 'Sans dénomination';

  const onglets: { id: OngletFiche; label: string }[] = [
    { id: 'informations', label: 'Informations' },
    { id: 'revenus', label: 'Revenus et charges' },
    ...(showForm ? [{ id: 'simulation' as const, label: 'Simulation' }] : []),
  ];

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

      <div className="px-8 pt-6">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{nom}</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{getNatureDisplayLabel(asset.nature)}</p>
      </div>

      {/* Même barre d'onglets que le régime matrimonial (Famille). */}
      <div className="border-b border-border px-8 pt-5 pb-1">
        <GooeyNav
          aria-label="Onglets de la fiche du bien"
          items={onglets}
          value={onglet}
          onValueChange={(id) => setOnglet(id as OngletFiche)}
        />
      </div>

      {/* Le formulaire reste monté hors de son onglet : saisie conservée et « Enregistrer » actif. */}
      <div className={cn('px-8 py-6', onglet !== 'informations' && 'hidden')}>
        {showForm ? (
          <Form {...form}>
            <form id="immobilier-property-form" onSubmit={handleSubmit}>
              <PropertyGeneralSection form={form} showStatutField={isResidence} typologies={typologiesPourNature(asset.nature)} prixAchat={asset.valeur_acquisition ?? asset.montant_immeuble} />
              <PropertyCostSection asset={asset} empruntsRelies={empruntsRelies} showMeublesField={avecPosteMeubles(asset.nature)} />
              {enLocation && (
                <>
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

      {/* Hors du <form> de la fiche : revenus et charges s'enregistrent ligne à ligne. */}
      {onglet === 'revenus' && (
        <div className="px-8 py-6">
          <RevenusChargesSection asset={asset} emprunts={empruntsRelies} />
        </div>
      )}

      {onglet === 'simulation' && showForm && (
        <>
          {/* Loués nus et locaux professionnels : revenus fonciers, même simulateur. */}
          {toujoursLoueNu(asset.nature) && enLocation && (
            <div className="mt-6 border-t border-border">
              <SimulateurRentabiliteSection asset={asset} emprunts={emprunts} />
            </div>
          )}
          <div className="mt-6 border-t border-border px-8 py-6">
            <ProjectionBienSection asset={asset} emprunts={emprunts} />
          </div>
          <div className="border-t border-border px-8 py-6">
            <SimulationReventeSection asset={asset} emprunts={emprunts} />
          </div>
        </>
      )}
    </div>
  );
};
