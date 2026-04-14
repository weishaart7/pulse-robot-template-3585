import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { assetService } from '@/services/assetService';
import { REVENU_NATURES, PERIODICITE_OPTIONS } from '@/schemas/immobilierPropertySchema';

interface RevenuFormProps {
  assetId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  impactBudget?: boolean;
}

export const RevenuForm = ({ assetId, open, onOpenChange, onSuccess, impactBudget = false }: RevenuFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nature: 'Loyers charges comprises',
    montant: '',
    periodicite: 'Mensuelle',
    commentaire: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.montant) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le montant.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await assetService.createAssetRevenu({
        asset_id: assetId,
        nature: formData.nature,
        montant: parseFloat(formData.montant),
        periodicite: formData.periodicite as 'Mensuelle' | 'Trimestrielle' | 'Annuelle',
        date_debut: new Date().toISOString().split('T')[0],
        commentaire: formData.commentaire || undefined,
        impact_budget: impactBudget,
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
        periodicite: 'Mensuelle',
        commentaire: ''
      });
    } catch (error) {
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
          <DialogDescription>
            Enregistrez un revenu lié à ce bien immobilier
          </DialogDescription>
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
                {REVENU_NATURES.map((nature) => (
                  <SelectItem key={nature} value={nature}>
                    {nature}
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
                {PERIODICITE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaire">Commentaire (optionnel)</Label>
            <Textarea
              id="commentaire"
              value={formData.commentaire}
              onChange={(e) => setFormData({ ...formData, commentaire: e.target.value })}
              placeholder="Informations complémentaires..."
              rows={3}
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
              {isSubmitting ? "Enregistrement..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
