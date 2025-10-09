import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';

interface RevenuFormProps {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const RevenuForm = ({ assetId, open, onOpenChange, onSuccess }: RevenuFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nature: 'Loyers charges comprises',
    montant: '',
    periodicite: 'Mensuelle'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await assetService.createAssetRevenu({
        asset_id: assetId,
        nature: formData.nature,
        montant: parseFloat(formData.montant),
        periodicite: formData.periodicite as 'Mensuelle' | 'Trimestrielle' | 'Annuelle',
        date_debut: new Date().toISOString().split('T')[0],
      });
      
      toast({
        title: "Revenu ajouté",
        description: "Le revenu a été ajouté avec succès.",
      });
      
      onSuccess();
      onOpenChange(false);
      setFormData({
        nature: 'Loyers charges comprises',
        montant: '',
        periodicite: 'Mensuelle'
      });
    } catch (error) {
      console.error('Error creating revenu:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du revenu.",
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
          <DialogTitle>Ajouter un revenu</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nature">Nature du revenu</Label>
            <Select
              value={formData.nature}
              onValueChange={(value) => setFormData({ ...formData, nature: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Loyers charges comprises">Loyers charges comprises</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (€)</Label>
            <Input
              id="montant"
              type="number"
              step="0.01"
              value={formData.montant}
              onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
              placeholder="0.00"
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
                <SelectItem value="Mensuelle">Mensuelle</SelectItem>
                <SelectItem value="Trimestrielle">Trimestrielle</SelectItem>
                <SelectItem value="Annuelle">Annuelle</SelectItem>
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
              {isSubmitting ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
