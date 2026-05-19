import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form } from '@/components/ui/form';
import { ArrowLeft } from 'lucide-react';
import { Asset } from '@/services/assetService';
import { useImmobilierPropertyForm } from '@/hooks/useImmobilierPropertyForm';
import { PropertyGeneralSection } from './property/PropertyGeneralSection';
import { PropertyCostSection } from './property/PropertyCostSection';
import { PropertyFinancingSection } from './property/PropertyFinancingSection';
import { PropertyLocationSection } from './property/PropertyLocationSection';

interface ImmobilierPropertyDetailViewProps {
  asset: Asset;
  onBack: () => void;
  onUpdate: () => void;
}

export const ImmobilierPropertyDetailView: React.FC<ImmobilierPropertyDetailViewProps> = ({
  asset,
  onBack,
  onUpdate,
}) => {
  const { form, isResidence, isRentalProperty, handleSubmit } = useImmobilierPropertyForm({
    asset,
    onSuccess: onUpdate,
    onClose: onBack,
  });

  const showForm = isResidence || isRentalProperty;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {asset.denomination || 'Sans dénomination'}
            </h2>
            <p className="text-muted-foreground">{asset.nature}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations du bien</CardTitle>
          <CardDescription>Gérez les détails de ce bien immobilier</CardDescription>
        </CardHeader>
        <CardContent>
          {showForm ? (
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                <PropertyGeneralSection form={form} showStatutField={isResidence} />
                <PropertyCostSection form={form} showMeublesField={isRentalProperty} />
                {isRentalProperty && (
                  <>
                    <PropertyFinancingSection form={form} />
                    <PropertyLocationSection form={form} assetNature={asset.nature} />
                  </>
                )}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={onBack}>
                    Annuler
                  </Button>
                  <Button type="submit">Enregistrer</Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                La gestion des informations pour cette catégorie sera disponible prochainement.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
