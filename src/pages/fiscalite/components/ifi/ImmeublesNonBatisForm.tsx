import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ImmeublesNonBatisFormData {
  designation: string;
  categorie: string;
  nature: string;
  dateAcquisition: Date | null;
  prixAcquisition: number;
  adresse: string;
  superficieTerrain: number;
  dateBail: Date | null;
  dureeBail: string;
  bienMixte: boolean;
  fractionTaxable: number;
  bienIndivision: boolean;
  pourcentageIndivision: number;
  natureDroits: string;
  valeurTotale: number;
}

interface ImmeublesNonBatisFormProps {
  onSubmit: (data: any) => void;
}

const ImmeublesNonBatisForm = ({ onSubmit }: ImmeublesNonBatisFormProps) => {
  const [formData, setFormData] = useState<ImmeublesNonBatisFormData>({
    designation: '',
    categorie: '',
    nature: '',
    dateAcquisition: null,
    prixAcquisition: 0,
    adresse: '',
    superficieTerrain: 0,
    dateBail: null,
    dureeBail: '',
    bienMixte: false,
    fractionTaxable: 0,
    bienIndivision: false,
    pourcentageIndivision: 0,
    natureDroits: 'Pleine-propriété',
    valeurTotale: 0,
  });

  const handleInputChange = (field: keyof ImmeublesNonBatisFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      designation: formData.designation,
      categorie: formData.categorie,
      valeurTotale: formData.valeurTotale,
      valeurDeclaree: formData.valeurTotale,
    });
  };

  const categoriesOptions = [
    'Bois, forêt ou parts de GF',
    'Bien rural loué à long terme',
    'Terrain',
    'Parts de GFA et de GAF',
    'Parts de société d\'épargne forestière',
    'Autre immeuble non bâti',
  ];

  const natureOptions = [
    'Bois et forêts',
    'Parts de GF (Groupement Forestier)',
    'Autres',
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
              <Label htmlFor="nature">Nature</Label>
              <Select value={formData.nature} onValueChange={(value) => handleInputChange('nature', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une nature" />
                </SelectTrigger>
                <SelectContent>
                  {natureOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date d'acquisition</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dateAcquisition && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateAcquisition ? format(formData.dateAcquisition, "PPP", { locale: fr }) : "Sélectionnez une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dateAcquisition || undefined}
                    onSelect={(date) => handleInputChange('dateAcquisition', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="prixAcquisition">Prix d'acquisition (€)</Label>
              <Input
                id="prixAcquisition"
                type="number"
                value={formData.prixAcquisition}
                onChange={(e) => handleInputChange('prixAcquisition', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Localisation et caractéristiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="adresse">Adresse</Label>
              <Input
                id="adresse"
                value={formData.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                placeholder="Adresse complète"
              />
            </div>

            <div>
              <Label htmlFor="superficieTerrain">Superficie du terrain (m²)</Label>
              <Input
                id="superficieTerrain"
                type="number"
                value={formData.superficieTerrain}
                onChange={(e) => handleInputChange('superficieTerrain', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Date du bail</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dateBail && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateBail ? format(formData.dateBail, "PPP", { locale: fr }) : "Sélectionnez une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dateBail || undefined}
                    onSelect={(date) => handleInputChange('dateBail', date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="dureeBail">Durée du bail</Label>
              <Input
                id="dureeBail"
                value={formData.dureeBail}
                onChange={(e) => handleInputChange('dureeBail', e.target.value)}
                placeholder="Ex: 9 ans"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Régime juridique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bienMixte"
                  checked={formData.bienMixte}
                  onCheckedChange={(checked) => handleInputChange('bienMixte', checked)}
                />
                <Label htmlFor="bienMixte">Bien mixte</Label>
              </div>

              {formData.bienMixte && (
                <div>
                  <Label htmlFor="fractionTaxable">Fraction taxable (%)</Label>
                  <Input
                    id="fractionTaxable"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.fractionTaxable}
                    onChange={(e) => handleInputChange('fractionTaxable', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              )}

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
            </div>

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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valorisation</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="valeurTotale">Valeur totale (€) *</Label>
            <Input
              id="valeurTotale"
              type="number"
              value={formData.valeurTotale}
              onChange={(e) => handleInputChange('valeurTotale', parseFloat(e.target.value) || 0)}
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

export default ImmeublesNonBatisForm;