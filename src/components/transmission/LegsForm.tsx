import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData } from '@/hooks/useFamilyData';
import { X } from 'lucide-react';

interface LegsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const LegsForm: React.FC<LegsFormProps> = ({ open, onOpenChange }) => {
  const { assets } = useAssets();
  const { familyMembers: familyLinks } = useFamilyData();

  const [formData, setFormData] = useState({
    libelle: 'Leg n°1',
    nature: '',
    typeLeg: '',
    realiseePar: '',
    testamentRealise: '',
    biensSelectionnes: [] as string[],
    clausesSelectionnees: [] as string[],
    legataires: [] as { id: string; nom: string; pourcentage: number }[]
  });

  const naturesOptions = [
    'Legs universel',
    'Legs à titre universel', 
    'Legs particulier'
  ];

  const typesLegOptions = [
    'Hors part successorale',
    'Sur part successorale'
  ];

  const realiseParOptions = [
    'Époux 1',
    'Époux 2',
    'Communauté'
  ];

  const testamentOptions = [
    'Oui',
    'Non',
    'Non et je souhaiterais être accompagné'
  ];

  const clausesOptions = [
    'Le legs à deux bénéficiaires successifs',
    'Le legs résiduel',
    'Le legs graduel',
    'Le legs avec charges',
    'Le legs en démembrement de propriété'
  ];

  const handleBienToggle = (bienId: string) => {
    setFormData(prev => ({
      ...prev,
      biensSelectionnes: prev.biensSelectionnes.includes(bienId)
        ? prev.biensSelectionnes.filter(id => id !== bienId)
        : [...prev.biensSelectionnes, bienId]
    }));
  };

  const handleClauseToggle = (clause: string) => {
    setFormData(prev => ({
      ...prev,
      clausesSelectionnees: prev.clausesSelectionnees.includes(clause)
        ? prev.clausesSelectionnees.filter(c => c !== clause)
        : [...prev.clausesSelectionnees, clause]
    }));
  };

  const handleLegataireToggle = (familyMember: any) => {
    const isSelected = formData.legataires.some(l => l.id === familyMember.id);
    
    setFormData(prev => ({
      ...prev,
      legataires: isSelected
        ? prev.legataires.filter(l => l.id !== familyMember.id)
        : [...prev.legataires, {
            id: familyMember.id,
            nom: `${familyMember.nom} ${familyMember.prenom || ''}`.trim(),
            pourcentage: 0
          }]
    }));
  };

  const handlePourcentageChange = (legataireId: string, pourcentage: number) => {
    setFormData(prev => ({
      ...prev,
      legataires: prev.legataires.map(l =>
        l.id === legataireId ? { ...l, pourcentage } : l
      )
    }));
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '0 €';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalPourcentage = formData.legataires.reduce((sum, l) => sum + l.pourcentage, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">Legs (Testament)</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle>Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="libelle">Libellé</Label>
                  <Input
                    id="libelle"
                    value={formData.libelle}
                    onChange={(e) => setFormData(prev => ({ ...prev, libelle: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Nature</Label>
                  <Select value={formData.nature} onValueChange={(value) => setFormData(prev => ({ ...prev, nature: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner la nature" />
                    </SelectTrigger>
                    <SelectContent>
                      {naturesOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Type de legs</Label>
                  <Select value={formData.typeLeg} onValueChange={(value) => setFormData(prev => ({ ...prev, typeLeg: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesLegOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Réalisée par</Label>
                  <Select value={formData.realiseePar} onValueChange={(value) => setFormData(prev => ({ ...prev, realiseePar: value }))}>
                    <SelectTrigger size="lg">
                      <SelectValue placeholder="Sélectionner qui réalise" />
                    </SelectTrigger>
                    <SelectContent>
                      {realiseParOptions.map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Avez-vous déjà réalisé votre testament ?</Label>
                <Select value={formData.testamentRealise} onValueChange={(value) => setFormData(prev => ({ ...prev, testamentRealise: value }))}>
                  <SelectTrigger size="lg" className="w-full">
                    <SelectValue placeholder="Sélectionner une réponse" />
                  </SelectTrigger>
                  <SelectContent>
                    {testamentOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sélection des biens légués */}
          <Card>
            <CardHeader>
              <CardTitle>Sélection des biens légués</CardTitle>
            </CardHeader>
            <CardContent>
              {assets.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun bien disponible dans votre patrimoine
                </p>
              ) : (
                <div className="space-y-3">
                  {assets.map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={formData.biensSelectionnes.includes(asset.id!)}
                          onCheckedChange={() => handleBienToggle(asset.id!)}
                        />
                        <div>
                          <p className="font-medium">{asset.denomination || asset.nature}</p>
                          <p className="text-sm text-muted-foreground">{asset.nature}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(asset.valeur_estimee)}</p>
                        <p className="text-sm text-muted-foreground">Valeur estimée</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clauses insérées */}
          <Card>
            <CardHeader>
              <CardTitle>Clauses insérées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clausesOptions.map((clause) => (
                  <div key={clause} className="flex items-center space-x-3">
                    <Checkbox
                      checked={formData.clausesSelectionnees.includes(clause)}
                      onCheckedChange={() => handleClauseToggle(clause)}
                    />
                    <Label className="font-medium">{clause}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Légataires */}
          <Card>
            <CardHeader>
              <CardTitle>Légataires</CardTitle>
            </CardHeader>
            <CardContent>
              {familyLinks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Aucun membre de famille disponible dans la section liens familiaux
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {familyLinks.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={formData.legataires.some(l => l.id === member.id)}
                            onCheckedChange={() => handleLegataireToggle(member)}
                          />
                          <div>
                            <p className="font-medium">{member.nom} {member.prenom}</p>
                            <p className="text-sm text-muted-foreground">{member.lien_familial}</p>
                          </div>
                        </div>
                        {formData.legataires.some(l => l.id === member.id) && (
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              className="w-20"
                              value={formData.legataires.find(l => l.id === member.id)?.pourcentage || ''}
                              onChange={(e) => handlePourcentageChange(member.id!, parseFloat(e.target.value) || 0)}
                            />
                            <span className="text-sm">%</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {formData.legataires.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className={`text-sm font-medium ${totalPourcentage > 100 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Total: {totalPourcentage.toFixed(2)}%
                        {totalPourcentage > 100 && ' (dépasse 100%)'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Separator />

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button 
              disabled={totalPourcentage > 100}
              onClick={() => {
                // TODO: Implement actual save logic when backend is ready
                // saveLeg(formData);
                onOpenChange(false);
              }}
            >
              Enregistrer le legs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};