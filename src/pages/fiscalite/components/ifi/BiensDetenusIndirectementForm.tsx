import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BiensDetenusIndirectementFormData {
  designation: string;
  categorie: string;
  denominationSociete: string;
  siren: string;
  adresse: string;
  pourcentageCapital: number;
  bienIndivision: boolean;
  pourcentageIndivision: number;
  natureDroits: string;
  valeurVenaleParts: number;
  valeurBien: number;
}

interface BiensDetenusIndirectementFormProps {
  onSubmit: (data: any) => void;
}

const BiensDetenusIndirectementForm = ({ onSubmit }: BiensDetenusIndirectementFormProps) => {
  const [formData, setFormData] = useState<BiensDetenusIndirectementFormData>({
    designation: '',
    categorie: '',
    denominationSociete: '',
    siren: '',
    adresse: '',
    pourcentageCapital: 0,
    bienIndivision: false,
    pourcentageIndivision: 0,
    natureDroits: 'Pleine-propriété',
    valeurVenaleParts: 0,
    valeurBien: 0,
  });

  const handleInputChange = (field: keyof BiensDetenusIndirectementFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      designation: formData.designation,
      categorie: formData.categorie,
      valeurTotale: formData.valeurBien,
      valeurDeclaree: formData.valeurBien,
    });
  };

  const categoriesOptions = [
    'SCI',
    'SCPI',
    'Assurance-vie',
    'Bons ou contrat de capitalisation',
    'Compte-titres',
    'Autres droits sociaux et valeurs mobilières',
  ];

  const natureDroitsOptions = [
    'Pleine-propriété',
    'Nue-propriété exonérée',
    'Nue-propriété imposable',
    'Usufruit imposable',
    'Usufruit exonéré',
    'Droit d\'usage',
    'Droit d\'habitation',
    'Droit viager au logement',
    'Bail à construction',
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="categorie">Catégorie *</Label>
              <Select value={formData.categorie} onValueChange={(value) => handleInputChange('categorie', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categoriesOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="designation">Désignation *</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="Libellé du bien"
                required
              />
            </div>

            <div>
              <Label htmlFor="denominationSociete">Dénomination de la société ou organisme</Label>
              <Input
                id="denominationSociete"
                value={formData.denominationSociete}
                onChange={(e) => handleInputChange('denominationSociete', e.target.value)}
                placeholder="Nom de la société"
              />
            </div>

            <div>
              <Label htmlFor="siren">SIREN</Label>
              <Input
                id="siren"
                value={formData.siren}
                onChange={(e) => handleInputChange('siren', e.target.value)}
                placeholder="Numéro SIREN"
                maxLength={9}
              />
            </div>

            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                placeholder="Adresse complète"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participation et droits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pourcentageCapital">Pourcentage du capital détenu (%)</Label>
              <Input
                id="pourcentageCapital"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.pourcentageCapital}
                onChange={(e) => handleInputChange('pourcentageCapital', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bienIndivision"
                checked={formData.bienIndivision}
                onCheckedChange={(checked) => handleInputChange('bienIndivision', checked)}
              />
              <Label htmlFor="bienIndivision">Bien en indivision</Label>
            </div>

            {formData.bienIndivision && (
              <div>
                <Label htmlFor="pourcentageIndivision">Pourcentage (%)</Label>
                <Input
                  id="pourcentageIndivision"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.pourcentageIndivision}
                  onChange={(e) => handleInputChange('pourcentageIndivision', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            )}

            <div>
              <Label htmlFor="natureDroits">Nature des droits détenus</Label>
              <Select value={formData.natureDroits} onValueChange={(value) => handleInputChange('natureDroits', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {natureDroitsOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Valorisation</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="valeurVenaleParts">Valeur vénale des parts (€)</Label>
            <Input
              id="valeurVenaleParts"
              type="number"
              value={formData.valeurVenaleParts}
              onChange={(e) => handleInputChange('valeurVenaleParts', parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <div>
            <Label htmlFor="valeurBien">Valeur du bien (€) *</Label>
            <Input
              id="valeurBien"
              type="number"
              value={formData.valeurBien}
              onChange={(e) => handleInputChange('valeurBien', parseFloat(e.target.value) || 0)}
              placeholder="0"
              required
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button type="submit">Ajouter le bien</Button>
      </div>
    </form>
  );
};

export default BiensDetenusIndirectementForm;