import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DonationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DonationForm = ({ open, onOpenChange }: DonationFormProps) => {
  const [formData, setFormData] = useState({
    libelle: 'Donation appartement Rue de la Paix',
    nature: '',
    demembrement: 'aucun',
    typeDonation: '',
    droitsParDonateur: false,
    realiseePar: '',
    date: undefined as Date | undefined,
  });

  const [selectedClauses, setSelectedClauses] = useState<string[]>([]);
  const [showClauses, setShowClauses] = useState(false);

  const naturesOptions = [
    'Donation simple',
    'Dons familiaux de sommes d\'argent',
    'Don d\'argent exonéré',
    'Don d\'argent pour résidence principale (2025)',
    'Don d\'argent sous condition de remploi (2020)',
    'Donation-partage',
    'Donation graduelle',
    'Donation résiduelle',
    'Donation-partage transgénérationnelle',
    'Donation-partage conjonctive'
  ];

  const clausesOptions = [
    'Inaliénabilité : empêche de vendre le bien (temporaire, intérêt légitime)',
    'Retour conventionnel : le bien retourne au donateur si le donataire décède',
    'Dispense de rapport : la donation n\'est pas rapportée à la succession',
    'Rapport forfaitaire : fixer contractuellement une valeur figée au rapport',
    'Exclusion ou inclusion dans la communauté : déterminer si le bien reste propre',
    'Administration spéciale : désigner un administrateur autre que les parents',
    'Obligation d\'emploi : imposer une affectation précise des fonds',
    'Gestion d\'un bien démembré : prévoir sort du prix en cas de cession',
    'Usufruit réservé : le donateur conserve l\'usage du bien',
    'Usufruit successif : usufruit transmis successivement',
    'Délivrance à terme : remise du bien différée'
  ];

  const handleClauseToggle = (clause: string) => {
    setSelectedClauses(prev => 
      prev.includes(clause) 
        ? prev.filter(c => c !== clause)
        : [...prev, clause]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form data:', formData, 'Clauses:', selectedClauses);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Donations</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Libellé */}
          <div>
            <Label htmlFor="libelle">Libellé</Label>
            <Input
              id="libelle"
              value={formData.libelle}
              onChange={(e) => setFormData({ ...formData, libelle: e.target.value })}
              placeholder="Donation appartement Rue de la Paix"
            />
          </div>

          {/* Nature */}
          <div>
            <Label>Nature</Label>
            <Select value={formData.nature} onValueChange={(value) => setFormData({ ...formData, nature: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez la nature" />
              </SelectTrigger>
              <SelectContent>
                {naturesOptions.map((nature) => (
                  <SelectItem key={nature} value={nature}>
                    {nature}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Démembrement */}
          <div>
            <Label>Démembrement</Label>
            <Select value={formData.demembrement} onValueChange={(value) => setFormData({ ...formData, demembrement: value })}>
              <SelectTrigger size="lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Aucun</SelectItem>
                <SelectItem value="reserve_usufruit">Réserve d'usufruit</SelectItem>
                <SelectItem value="reserve_usufruit_reversible">Réserve d'usufruit réversible au conjoint survivant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Type de donation */}
          <div>
            <Label>Type de donation</Label>
            <Select value={formData.typeDonation} onValueChange={(value) => setFormData({ ...formData, typeDonation: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez le type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avance_part">Par avance de part successorale</SelectItem>
                <SelectItem value="hors_part">Hors part successorale</SelectItem>
                <SelectItem value="partage">Partage</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clauses insérées */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Clauses insérée(s)
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowClauses(!showClauses)}
                >
                  {showClauses ? 'Fermer' : 'Ouvrir'}
                </Button>
              </CardTitle>
            </CardHeader>
            {showClauses && (
              <CardContent className="space-y-3">
                {clausesOptions.map((clause) => (
                  <div key={clause} className="flex items-start space-x-2">
                    <Checkbox
                      id={clause}
                      checked={selectedClauses.includes(clause)}
                      onCheckedChange={() => handleClauseToggle(clause)}
                    />
                    <Label htmlFor={clause} className="text-sm leading-5">
                      {clause}
                    </Label>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>

          {/* Prise en charge des droits */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="droitsParDonateur"
              checked={formData.droitsParDonateur}
              onCheckedChange={(checked) => setFormData({ ...formData, droitsParDonateur: checked as boolean })}
            />
            <Label htmlFor="droitsParDonateur">Prise en charge des droits par le donateur</Label>
          </div>

          {/* Réalisée par */}
          <div>
            <Label>Réalisée par</Label>
            <Select value={formData.realiseePar} onValueChange={(value) => setFormData({ ...formData, realiseePar: value })}>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez qui a réalisé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epoux1">Époux 1</SelectItem>
                <SelectItem value="epoux2">Époux 2</SelectItem>
                <SelectItem value="communaute">Communauté</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.date ? format(formData.date, "PPP", { locale: fr }) : "Sélectionnez une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({ ...formData, date })}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sélection des biens donnés */}
          <Card>
            <CardHeader>
              <CardTitle>Sélection des biens donnés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Liste des biens du patrimoine avec cases à cocher (à implémenter selon les biens disponibles)
              </p>
            </CardContent>
          </Card>

          {/* Donataires */}
          <Card>
            <CardHeader>
              <CardTitle>Donataires</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Qui a reçu, lien de parenté, pourcentage reçu (à implémenter)
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit">
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};