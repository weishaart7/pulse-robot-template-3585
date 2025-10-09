import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';

interface ChargeFormProps {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CHARGE_NATURES = [
  'Taxe foncière',
  'Assurance propriétaire non occupant (PNO)',
  'Assurance GLI',
  'Frais de gestion locative',
  'Frais de comptabilité (€)'
];

export const ChargeForm = ({ assetId, open, onOpenChange, onSuccess }: ChargeFormProps) => {
  const { toast } = useToast();
  const [nature, setNature] = useState('');
  const [montant, setMontant] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nature || !montant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await assetService.createAssetCharge({
        asset_id: assetId,
        type_charge: 'Charges courantes',
        denomination: nature,
        montant: parseFloat(montant),
        debiteur: 'Couple',
        unite: '€',
        periodicite: 'annuelle',
        date_debut: new Date().toISOString().split('T')[0],
        duree_type: 'Indéterminée'
      });

      toast({
        title: "Charge ajoutée",
        description: "La charge a été enregistrée avec succès.",
      });

      // Reset form
      setNature('');
      setMontant('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error creating charge:', error);
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
            <Select value={nature} onValueChange={setNature}>
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
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
              required
            />
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
