import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LogoSpinner } from '@/components/brand/LogoSpinner';
import { panelButtonClass, panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';
import { CHARGE_NATURES, PERIODICITE_OPTIONS, DETENTEUR_OPTIONS } from '@/schemas/immobilierPropertySchema';

interface ChargeFormProps {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  impactBudget?: boolean;
}

export const ChargeForm = ({ assetId, open, onOpenChange, onSuccess, impactBudget = false }: ChargeFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nature: '',
    montant: '',
    periodicite: 'Annuelle',
    debiteur: 'common'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nature || !formData.montant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const periodiciteMap: Record<string, 'mensuelle' | 'trimestrielle' | 'annuelle'> = {
        'Mensuelle': 'mensuelle',
        'Trimestrielle': 'trimestrielle',
        'Semestrielle': 'annuelle', // fallback
        'Annuelle': 'annuelle'
      };

      const debiteurMap: Record<string, 'Époux 1' | 'Époux 2' | 'Couple'> = {
        user: 'Époux 1',
        spouse: 'Époux 2',
        common: 'Couple'
      };

      // 'Semestrielle' est mappée vers 'annuelle' (non supportée par la contrainte CHECK
      // en base) : on double le montant pour stocker l'équivalent annuel correct.
      const montantAnnualise = formData.periodicite === 'Semestrielle'
        ? parseFloat(formData.montant) * 2
        : parseFloat(formData.montant);

      await assetService.createAssetCharge({
        asset_id: assetId,
        type_charge: 'Charges courantes',
        denomination: formData.nature,
        montant: montantAnnualise,
        debiteur: debiteurMap[formData.debiteur] || 'Couple',
        unite: '€',
        periodicite: periodiciteMap[formData.periodicite] || 'annuelle',
        date_debut: new Date().toISOString().split('T')[0],
        duree_type: 'Indéterminée',
        impact_budget: impactBudget,
      });

      toast({
        title: "Charge ajoutée",
        description: "La charge a été enregistrée avec succès.",
      });

      // Reset form
      setFormData({
        nature: '',
        montant: '',
        periodicite: 'Annuelle',
        debiteur: 'common'
      });
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer la charge.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/30 backdrop-blur-[6px]"
        className="workspace-panel no-scrollbar max-w-lg max-h-[90vh] overflow-y-auto rounded-[4px] sm:rounded-[4px]"
      >
        <DialogHeader className="-mx-6 border-b border-border px-6 pb-4">
          <DialogTitle className="text-[16px] font-medium leading-tight tracking-[-0.01em]">Ajouter une charge</DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Enregistrez une charge liée à ce bien immobilier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="nature">Nature de la charge *</Label>
            <Select 
              value={formData.nature} 
              onValueChange={(value) => setFormData({ ...formData, nature: value })}
            >
              <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                <SelectValue placeholder="Sélectionnez une nature" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_NATURES.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="montant">Montant *</Label>
            <div className="relative">
              <Input
                id="montant"
                className="bg-background border-border shadow-none pr-8 tabular-nums"
                type="number"
                step="0.01"
                placeholder="0"
                value={formData.montant}
                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[13px] text-muted-foreground">€</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="periodicite">Périodicité</Label>
            <Select 
              value={formData.periodicite} 
              onValueChange={(value) => setFormData({ ...formData, periodicite: value })}
            >
              <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODICITE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="debiteur">Débiteur</Label>
            <Select 
              value={formData.debiteur} 
              onValueChange={(value) => setFormData({ ...formData, debiteur: value })}
            >
              <SelectTrigger className="rounded-[2px] border-border bg-background shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DETENTEUR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="-mx-6 flex justify-end gap-2 border-t border-border px-6 pt-4">
            <Button
              type="button"
              variant="outline"
              className={panelButtonClass}
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className={panelPrimaryButtonClass}>
              {isSubmitting ? <><LogoSpinner />Enregistrement...</> : "Enregistrer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
