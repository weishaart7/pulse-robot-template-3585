import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

interface ImmeublesBatisFormData {
  categorie: string;
  designation: string;
  nature: string;
  dateAcquisition: string;
  prixAcquisition: number;
  adresse: string;
  codePostal: string;
  ville: string;
  pays: string;
  superficieTerrain: number;
  surfaceHabitable: number;
  surfaceUtile: number;
  nombrePieces: number;
  bienMixte: boolean;
  fractionTaxable?: number;
  bienIndivision: boolean;
  pourcentageIndivision?: number;
  natureDroits: string;
  valeurTotale: number;
}

interface ImmeublesBatisFormProps {
  onSubmit: (data: ImmeublesBatisFormData) => void;
}

const ImmeublesBatisForm = ({ onSubmit }: ImmeublesBatisFormProps) => {
  const [formData, setFormData] = useState<ImmeublesBatisFormData>({
    categorie: '',
    designation: '',
    nature: 'Maison individuelle',
    dateAcquisition: '',
    prixAcquisition: 0,
    adresse: '',
    codePostal: '',
    ville: '',
    pays: 'France',
    superficieTerrain: 0,
    surfaceHabitable: 0,
    surfaceUtile: 0,
    nombrePieces: 0,
    bienMixte: false,
    bienIndivision: false,
    natureDroits: 'Pleine-propriété',
    valeurTotale: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getValeurDeclaree = () => {
    if (formData.categorie === 'Résidence principale') {
      return formData.valeurTotale * 0.7; // Abattement de 30%
    }
    return formData.valeurTotale;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Catégorie */}
        <div className="space-y-2">
          <Label htmlFor="categorie">Catégorie</Label>
          <Select value={formData.categorie} onValueChange={(value) => setFormData(prev => ({ ...prev, categorie: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Résidence principale">Résidence principale</SelectItem>
              <SelectItem value="Résidence secondaire">Résidence secondaire</SelectItem>
              <SelectItem value="Immeuble locatif">Immeuble locatif</SelectItem>
              <SelectItem value="Monument historique">Monument historique</SelectItem>
              <SelectItem value="Autre immeuble bâti">Autre immeuble bâti</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Désignation */}
        <div className="space-y-2">
          <Label htmlFor="designation">Désignation (libellé)</Label>
          <Input
            id="designation"
            value={formData.designation}
            onChange={(e) => setFormData(prev => ({ ...prev, designation: e.target.value }))}
            placeholder="Ex: Appartement Paris 15ème"
          />
        </div>

        {/* Nature */}
        <div className="space-y-2">
          <Label htmlFor="nature">Nature</Label>
          <Select value={formData.nature} onValueChange={(value) => setFormData(prev => ({ ...prev, nature: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Appartement dans un immeuble collectif">Appartement dans un immeuble collectif</SelectItem>
              <SelectItem value="Immeuble collectif de rapport">Immeuble collectif de rapport</SelectItem>
              <SelectItem value="Maison individuelle">Maison individuelle</SelectItem>
              <SelectItem value="Hôtel particulier">Hôtel particulier</SelectItem>
              <SelectItem value="Château">Château</SelectItem>
              <SelectItem value="Manoir">Manoir</SelectItem>
              <SelectItem value="Moulin">Moulin</SelectItem>
              <SelectItem value="Boutique">Boutique</SelectItem>
              <SelectItem value="Bureau">Bureau</SelectItem>
              <SelectItem value="Atelier">Atelier</SelectItem>
              <SelectItem value="Hangar">Hangar</SelectItem>
              <SelectItem value="Piscine">Piscine</SelectItem>
              <SelectItem value="Court de tennis">Court de tennis</SelectItem>
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date d'acquisition */}
        <div className="space-y-2">
          <Label htmlFor="dateAcquisition">Date d'acquisition</Label>
          <Input
            id="dateAcquisition"
            type="date"
            value={formData.dateAcquisition}
            onChange={(e) => setFormData(prev => ({ ...prev, dateAcquisition: e.target.value }))}
          />
        </div>

        {/* Prix d'acquisition */}
        <div className="space-y-2">
          <Label htmlFor="prixAcquisition">Prix d'acquisition (€)</Label>
          <Input
            id="prixAcquisition"
            type="number"
            value={formData.prixAcquisition || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, prixAcquisition: Number(e.target.value) }))}
          />
        </div>
      </div>

      <Separator />

      {/* Adresse */}
      <div className="space-y-4">
        <h3 className="font-medium">Adresse</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input
              id="adresse"
              value={formData.adresse}
              onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
              placeholder="123 rue de la Paix"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="codePostal">Code postal</Label>
            <Input
              id="codePostal"
              value={formData.codePostal}
              onChange={(e) => setFormData(prev => ({ ...prev, codePostal: e.target.value }))}
              placeholder="75001"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="ville">Ville</Label>
            <Input
              id="ville"
              value={formData.ville}
              onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
              placeholder="Paris"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pays">Pays</Label>
            <Input
              id="pays"
              value={formData.pays}
              onChange={(e) => setFormData(prev => ({ ...prev, pays: e.target.value }))}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Surfaces et caractéristiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="superficieTerrain">Superficie du terrain (m²)</Label>
          <Input
            id="superficieTerrain"
            type="number"
            value={formData.superficieTerrain || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, superficieTerrain: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surfaceHabitable">Surface totale habitable (m²)</Label>
          <Input
            id="surfaceHabitable"
            type="number"
            value={formData.surfaceHabitable || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, surfaceHabitable: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="surfaceUtile">Surface totale utile (m²)</Label>
          <Input
            id="surfaceUtile"
            type="number"
            value={formData.surfaceUtile || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, surfaceUtile: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombrePieces">Nombre de pièces</Label>
          <Input
            id="nombrePieces"
            type="number"
            value={formData.nombrePieces || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, nombrePieces: Number(e.target.value) }))}
          />
        </div>
      </div>

      <Separator />

      {/* Options spéciales */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="bienMixte"
            checked={formData.bienMixte}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bienMixte: !!checked }))}
          />
          <Label htmlFor="bienMixte">Bien mixte</Label>
        </div>

        {formData.bienMixte && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="fractionTaxable">Fraction taxable (%)</Label>
            <Input
              id="fractionTaxable"
              type="number"
              value={formData.fractionTaxable || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, fractionTaxable: Number(e.target.value) }))}
            />
          </div>
        )}

        <div className="flex items-center space-x-2">
          <Checkbox
            id="bienIndivision"
            checked={formData.bienIndivision}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, bienIndivision: !!checked }))}
          />
          <Label htmlFor="bienIndivision">Bien en indivision</Label>
        </div>

        {formData.bienIndivision && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="pourcentageIndivision">Pourcentage (%)</Label>
            <Input
              id="pourcentageIndivision"
              type="number"
              value={formData.pourcentageIndivision || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, pourcentageIndivision: Number(e.target.value) }))}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Nature des droits détenus */}
      <div className="space-y-2">
        <Label htmlFor="natureDroits">Nature des droits détenus</Label>
        <Select value={formData.natureDroits} onValueChange={(value) => setFormData(prev => ({ ...prev, natureDroits: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pleine-propriété">Pleine-propriété</SelectItem>
            <SelectItem value="Nue-propriété exonérée">Nue-propriété exonérée</SelectItem>
            <SelectItem value="Nue-propriété imposable">Nue-propriété imposable</SelectItem>
            <SelectItem value="Usufruit imposable">Usufruit imposable</SelectItem>
            <SelectItem value="Usufruit exonéré">Usufruit exonéré</SelectItem>
            <SelectItem value="Droit d'usage">Droit d'usage</SelectItem>
            <SelectItem value="Droit d'habitation">Droit d'habitation</SelectItem>
            <SelectItem value="Droit viager au logement">Droit viager au logement</SelectItem>
            <SelectItem value="Bail à construction">Bail à construction</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Valeur totale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="valeurTotale">Valeur totale (€)</Label>
          <Input
            id="valeurTotale"
            type="number"
            value={formData.valeurTotale || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, valeurTotale: Number(e.target.value) }))}
          />
        </div>
        {formData.categorie === 'Résidence principale' && formData.valeurTotale > 0 && (
          <div className="space-y-2">
            <Label>Valeur après abattement de 30%</Label>
            <div className="h-10 px-3 py-2 border border-input rounded-md bg-muted flex items-center">
              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(getValeurDeclaree())}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline">
          Annuler
        </Button>
        <Button type="submit">
          Ajouter le bien
        </Button>
      </div>
    </form>
  );
};

export default ImmeublesBatisForm;