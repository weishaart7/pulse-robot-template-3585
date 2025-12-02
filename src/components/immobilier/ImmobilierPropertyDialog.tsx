import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Asset } from '@/services/assetService';
import { useImmobilierPropertyForm } from '@/hooks/useImmobilierPropertyForm';
import { PropertyGeneralSection } from './property/PropertyGeneralSection';
import { PropertyCostSection } from './property/PropertyCostSection';
import { PropertyFinancingSection } from './property/PropertyFinancingSection';
import { PropertyLocationSection } from './property/PropertyLocationSection';

interface ImmobilierPropertyDialogProps {
  asset: Asset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export const ImmobilierPropertyDialog: React.FC<ImmobilierPropertyDialogProps> = ({
  asset,
  open,
  onOpenChange,
  onUpdate,
}) => {
  const { form, isResidence, isRentalProperty, handleSubmit } = useImmobilierPropertyForm({
    asset,
    onSuccess: onUpdate,
    onClose: () => onOpenChange(false),
  });

  if (!asset) return null;

  const showForm = isResidence || isRentalProperty;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les informations - {asset.denomination || 'Sans dénomination'}</DialogTitle>
          <DialogDescription>Catégorie: {asset.nature}</DialogDescription>
        </DialogHeader>

        {showForm ? (
          <Form {...form}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <PropertyGeneralSection 
                form={form} 
                showStatutField={isResidence} 
              />
              
              <PropertyCostSection 
                form={form} 
                showMeublesField={isRentalProperty} 
              />

              {isRentalProperty && (
                <>
                  <PropertyFinancingSection form={form} />
                  <PropertyLocationSection form={form} assetNature={asset.nature} />
                </>
              )}

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit">
                  Enregistrer
                </Button>
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
      </DialogContent>
    </Dialog>
  );
};
