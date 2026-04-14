import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
      
      await assetService.createAssetCharge({
        asset_id: assetId,
        type_charge: 'Charges courantes',
        denomination: formData.nature,
        montant: parseFloat(formData.montant),
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter une charge</DialogTitle>
          <DialogDescription>
            Enregistrez une charge liée à ce bien immobilier
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nature">Nature de la charge *</Label>
            <Select 
              value={formData.nature} 
              onValueChange={(value) => setFormData({ ...formData, nature: value })}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (€) *</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.montant}
              onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodicite">Périodicité</Label>
            <Select 
              value={formData.periodicite} 
              onValueChange={(value) => setFormData({ ...formData, periodicite: value })}
            >
              <SelectTrigger>
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

          <div className="space-y-2">
            <Label htmlFor="debiteur">Débiteur</Label>
            <Select 
              value={formData.debiteur} 
              onValueChange={(value) => setFormData({ ...formData, debiteur: value })}
            >
              <SelectTrigger>
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

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
