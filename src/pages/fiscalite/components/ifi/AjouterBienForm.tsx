import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { useIFIImmeubleBatis, useIFIImmeublesNonBatis, useIFIBiensDetenusIndirectement, useIFIBiensProfessionnelsExoneres } from '@/hooks/useIFI';
import { useToast } from '@/hooks/use-toast';

interface AjouterBienFormProps {
  onClose: () => void;
  onBienAdded?: () => void;
}

export const AjouterBienForm = ({ onClose, onBienAdded }: AjouterBienFormProps) => {
  const { toast } = useToast();
  const { createBien: createImmeubleBati } = useIFIImmeubleBatis();
  const { createBien: createImmeubleNonBati } = useIFIImmeublesNonBatis();
  const { createBien: createBienIndirect } = useIFIBiensDetenusIndirectement();
  const { createBien: createBienProfessionnel } = useIFIBiensProfessionnelsExoneres();
  const [categorie, setCategorie] = useState('');
  const [formData, setFormData] = useState({
    typologie: '',
    designation: '',
    nature: 'Maison individuelle',
    dateAcquisition: undefined as Date | undefined,
    prixAcquisition: '',
    adresseRue: '',
    adresseCodePostal: '',
    adresseVille: '',
    adressePays: 'France',
    superficieTerrain: '',
    surfaceTotaleHabitable: '',
    surfaceTotaleUtile: '',
    nombrePieces: '',
    bienMixte: false,
    fractionTaxable: '',
    bienIndivision: false,
    pourcentageIndivision: '',
    natureDroits: 'Pleine-propriété',
    valeurTotale: '',
    // Pour biens détenus indirectement
    denominationSociete: '',
    siren: '',
    pourcentageCapital: '',
    valeurVenaleParts: '',
    valeurBien: '',
    // Pour biens professionnels
    valeur: '',
    exonerationActivite: false,
    exonerationFonction: false,
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (categorie === 'immeubles-batis') {
        await createImmeubleBati({
          categorie: formData.typologie,
          designation: formData.designation,
          date_acquisition: formData.dateAcquisition ? formData.dateAcquisition.toISOString().split('T')[0] : null,
          prix_acquisition: formData.prixAcquisition ? parseFloat(formData.prixAcquisition) : null,
          adresse_rue: formData.adresseRue,
          adresse_code_postal: formData.adresseCodePostal,
          adresse_ville: formData.adresseVille,
          adresse_pays: formData.adressePays,
          superficie_terrain: formData.superficieTerrain ? parseFloat(formData.superficieTerrain) : null,
          bien_mixte: formData.bienMixte,
          fraction_taxable: formData.fractionTaxable ? parseFloat(formData.fractionTaxable) : null,
          bien_en_indivision: formData.bienIndivision,
          pourcentage_indivision: formData.pourcentageIndivision ? parseFloat(formData.pourcentageIndivision) : null,
          nature_droits_detenus: formData.natureDroits,
          valeur_totale: formData.valeurTotale ? parseFloat(formData.valeurTotale) : null
        });
      }
      
      toast({
        title: "Bien ajouté",
        description: "Le bien a été ajouté avec succès.",
      });
      
      onBienAdded?.();
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de l'ajout du bien.",
        variant: "destructive",
      });
    }
  };

  const renderImmeubleBatiFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="typologie">Typologie</Label>
          <Select value={formData.typologie} onValueChange={(value) => handleInputChange('typologie', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une typologie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="residence-principale">Résidence principale</SelectItem>
              <SelectItem value="residence-secondaire">Résidence secondaire</SelectItem>
              <SelectItem value="immeuble-locatif">Immeuble locatif</SelectItem>
              <SelectItem value="monument-historique">Monument historique</SelectItem>
              <SelectItem value="autre">Autre immeuble bâti</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="designation">Désignation</Label>
          <Input
            id="designation"
            value={formData.designation}
            onChange={(e) => handleInputChange('designation', e.target.value)}
            placeholder="Libellé du bien"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nature">Nature</Label>
          <Select value={formData.nature} onValueChange={(value) => handleInputChange('nature', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="appartement">Appartement dans un immeuble collectif</SelectItem>
              <SelectItem value="immeuble-collectif">Immeuble collectif de rapport</SelectItem>
              <SelectItem value="Maison individuelle">Maison individuelle</SelectItem>
              <SelectItem value="hotel-particulier">Hôtel particulier</SelectItem>
              <SelectItem value="chateau">Château</SelectItem>
              <SelectItem value="manoir">Manoir</SelectItem>
              <SelectItem value="moulin">Moulin</SelectItem>
              <SelectItem value="boutique">Boutique</SelectItem>
              <SelectItem value="bureau">Bureau</SelectItem>
              <SelectItem value="atelier">Atelier</SelectItem>
              <SelectItem value="hangar">Hangar</SelectItem>
              <SelectItem value="piscine">Piscine</SelectItem>
              <SelectItem value="court-tennis">Court de tennis</SelectItem>
              <SelectItem value="autre">Autre</SelectItem>
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
                {formData.dateAcquisition ? format(formData.dateAcquisition, "dd/MM/yyyy") : "Sélectionner une date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.dateAcquisition}
                onSelect={(date) => handleInputChange('dateAcquisition', date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="prixAcquisition">Prix d'acquisition (€)</Label>
          <Input
            id="prixAcquisition"
            type="number"
            value={formData.prixAcquisition}
            onChange={(e) => handleInputChange('prixAcquisition', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="valeurTotale">Valeur totale (€)</Label>
          <Input
            id="valeurTotale"
            type="number"
            value={formData.valeurTotale}
            onChange={(e) => handleInputChange('valeurTotale', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Adresse</h4>
        <div className="grid grid-cols-1 gap-4">
          <Input
            placeholder="Rue"
            value={formData.adresseRue}
            onChange={(e) => handleInputChange('adresseRue', e.target.value)}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Code postal"
              value={formData.adresseCodePostal}
              onChange={(e) => handleInputChange('adresseCodePostal', e.target.value)}
            />
            <Input
              placeholder="Ville"
              value={formData.adresseVille}
              onChange={(e) => handleInputChange('adresseVille', e.target.value)}
            />
            <Input
              placeholder="Pays"
              value={formData.adressePays}
              onChange={(e) => handleInputChange('adressePays', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div>
          <Label htmlFor="superficieTerrain">Superficie terrain (m²)</Label>
          <Input
            id="superficieTerrain"
            type="number"
            value={formData.superficieTerrain}
            onChange={(e) => handleInputChange('superficieTerrain', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="surfaceHabitable">Surface habitable (m²)</Label>
          <Input
            id="surfaceHabitable"
            type="number"
            value={formData.surfaceTotaleHabitable}
            onChange={(e) => handleInputChange('surfaceTotaleHabitable', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="surfaceUtile">Surface utile (m²)</Label>
          <Input
            id="surfaceUtile"
            type="number"
            value={formData.surfaceTotaleUtile}
            onChange={(e) => handleInputChange('surfaceTotaleUtile', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="nombrePieces">Nombre de pièces</Label>
          <Input
            id="nombrePieces"
            type="number"
            value={formData.nombrePieces}
            onChange={(e) => handleInputChange('nombrePieces', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="bienMixte"
            checked={formData.bienMixte}
            onCheckedChange={(checked) => handleInputChange('bienMixte', checked)}
          />
          <Label htmlFor="bienMixte">Bien mixte</Label>
          {formData.bienMixte && (
            <div className="ml-4">
              <Input
                type="number"
                placeholder="Fraction taxable (%)"
                value={formData.fractionTaxable}
                onChange={(e) => handleInputChange('fractionTaxable', e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="bienIndivision"
            checked={formData.bienIndivision}
            onCheckedChange={(checked) => handleInputChange('bienIndivision', checked)}
          />
          <Label htmlFor="bienIndivision">Bien en indivision</Label>
          {formData.bienIndivision && (
            <div className="ml-4">
              <Input
                type="number"
                placeholder="Pourcentage (%)"
                value={formData.pourcentageIndivision}
                onChange={(e) => handleInputChange('pourcentageIndivision', e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="natureDroits">Nature des droits détenus</Label>
        <Select value={formData.natureDroits} onValueChange={(value) => handleInputChange('natureDroits', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pleine-propriété">Pleine-propriété</SelectItem>
            <SelectItem value="nue-propriete-exoneree">Nue-propriété exonérée</SelectItem>
            <SelectItem value="nue-propriete-imposable">Nue-propriété imposable</SelectItem>
            <SelectItem value="usufruit-imposable">Usufruit imposable</SelectItem>
            <SelectItem value="usufruit-exonere">Usufruit exonéré</SelectItem>
            <SelectItem value="droit-usage">Droit d'usage</SelectItem>
            <SelectItem value="droit-habitation">Droit d'habitation</SelectItem>
            <SelectItem value="droit-viager">Droit viager au logement</SelectItem>
            <SelectItem value="bail-construction">Bail à construction</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="categorie">Catégorie</Label>
        <Select value={categorie} onValueChange={setCategorie}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immeubles-batis">Immeubles bâtis</SelectItem>
            <SelectItem value="immeubles-non-batis">Immeubles non bâtis</SelectItem>
            <SelectItem value="biens-detenus-indirectement">Biens détenus indirectement</SelectItem>
            <SelectItem value="biens-professionnels-exoneres">Biens professionnels exonérés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {categorie === 'immeubles-batis' && (
        <Card>
          <CardHeader>
            <CardTitle>Immeuble bâti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderImmeubleBatiFields()}
          </CardContent>
        </Card>
      )}

      {categorie && (
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit">
            Ajouter le bien
          </Button>
        </div>
      )}
    </form>
  );
};