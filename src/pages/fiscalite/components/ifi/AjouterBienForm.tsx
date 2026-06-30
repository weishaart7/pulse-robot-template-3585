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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useIFIImmeubleBatis, useIFIImmeublesNonBatis, useIFIBiensDetenusIndirectement, useIFIBiensProfessionnelsExoneres } from '@/hooks/useIFI';
import { useToast } from '@/hooks/use-toast';

interface AjouterBienFormProps {
  onClose: () => void;
  onBienAdded?: () => void;
}

const CATEGORIES_NON_BATIS = [
  'Bois, forêt ou parts de GF',
  'Bien rural loué à long terme',
  'Terrain',
  'Parts de GFA et de GAF',
  "Parts de société d'épargne forestière",
  'Autre immeuble non bâti',
];

const CATEGORIES_INDIRECT = [
  'SCI',
  'SCPI',
  'Assurance-vie',
  'Bons ou contrat de capitalisation',
  'Compte-titres',
  'Autres droits sociaux et valeurs mobilières',
];

const FONCTIONS_DIRIGEANT = [
  'Gérant minoritaire statutaire',
  'Président',
  'Directeur général',
  'Directeur général délégué',
  'Président du conseil de surveillance',
  'Membre du directoire',
  'Autres',
];

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
    // Pour immeubles non bâtis
    dateBail: undefined as Date | undefined,
    dureeBail: '',
    abattementBoisForets: false,
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
    activiteEntreprise: '',
    exerciceType: '',
    fonctionExercee: '',
    typeDetention: '',
    qualiteDetenteur: '',
    pourcentageDetention: '',
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
      } else if (categorie === 'immeubles-non-batis') {
        await createImmeubleNonBati({
          categorie: formData.typologie,
          designation: formData.designation,
          nature: formData.nature,
          date_acquisition: formData.dateAcquisition ? formData.dateAcquisition.toISOString().split('T')[0] : null,
          prix_acquisition: formData.prixAcquisition ? parseFloat(formData.prixAcquisition) : null,
          adresse_rue: formData.adresseRue,
          adresse_code_postal: formData.adresseCodePostal,
          adresse_ville: formData.adresseVille,
          adresse_pays: formData.adressePays,
          superficie_terrain: formData.superficieTerrain ? parseFloat(formData.superficieTerrain) : null,
          date_bail: formData.dateBail ? formData.dateBail.toISOString().split('T')[0] : null,
          duree_bail: formData.dureeBail,
          bien_mixte: formData.bienMixte,
          fraction_taxable: formData.fractionTaxable ? parseFloat(formData.fractionTaxable) : null,
          bien_en_indivision: formData.bienIndivision,
          pourcentage_indivision: formData.pourcentageIndivision ? parseFloat(formData.pourcentageIndivision) : null,
          nature_droits_detenus: formData.natureDroits,
          valeur_totale: formData.valeurTotale ? parseFloat(formData.valeurTotale) : null,
          abattement_bois_forets: formData.abattementBoisForets,
        });
      } else if (categorie === 'biens-detenus-indirectement') {
        await createBienIndirect({
          categorie: formData.typologie,
          designation: formData.designation,
          denomination_societe: formData.denominationSociete,
          siren: formData.siren,
          adresse_rue: formData.adresseRue,
          adresse_code_postal: formData.adresseCodePostal,
          adresse_ville: formData.adresseVille,
          adresse_pays: formData.adressePays,
          pourcentage_capital: formData.pourcentageCapital ? parseFloat(formData.pourcentageCapital) : null,
          bien_en_indivision: formData.bienIndivision,
          pourcentage_indivision: formData.pourcentageIndivision ? parseFloat(formData.pourcentageIndivision) : null,
          nature_droits_detenus: formData.natureDroits,
          valeur_venale_parts: formData.valeurVenaleParts ? parseFloat(formData.valeurVenaleParts) : null,
          valeur_bien: formData.valeurBien ? parseFloat(formData.valeurBien) : null,
        });
      } else if (categorie === 'biens-professionnels-exoneres') {
        await createBienProfessionnel({
          designation: formData.designation,
          valeur: formData.valeur ? parseFloat(formData.valeur) : null,
          exoneration_activite_principale: formData.exonerationActivite,
          exoneration_fonction_droits: formData.exonerationFonction,
          denomination_societe: formData.denominationSociete,
          siren: formData.siren,
          adresse_rue: formData.adresseRue,
          adresse_code_postal: formData.adresseCodePostal,
          adresse_ville: formData.adresseVille,
          adresse_pays: formData.adressePays,
          activite_entreprise: formData.activiteEntreprise,
          exercice_entreprise_individuelle: formData.exerciceType === 'entreprise-individuelle',
          exercice_societe_personne: formData.exerciceType === 'societe-personne',
          exercice_gerant_majoritaire_sarl: formData.exerciceType === 'gerant-majoritaire',
          exercice_gerant_commandite: formData.exerciceType === 'gerant-commandite',
          fonction_exercee: formData.fonctionExercee,
          pourcentage_capital_detenu: formData.pourcentageCapital ? parseFloat(formData.pourcentageCapital) : null,
          detention_directe: formData.typeDetention === 'directement',
          detention_societe_interposee: formData.typeDetention === 'intermediaire',
          detenteur_redevable: formData.qualiteDetenteur === 'redevable',
          detenteur_groupe_familial: formData.qualiteDetenteur === 'groupe-familial',
          pourcentage_detention: formData.pourcentageDetention ? parseFloat(formData.pourcentageDetention) : null,
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

  const renderImmeubleNonBatiFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="typologieNonBati">Catégorie</Label>
          <Select value={formData.typologie} onValueChange={(value) => handleInputChange('typologie', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES_NON_BATIS.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="designationNonBati">Désignation</Label>
          <Input
            id="designationNonBati"
            value={formData.designation}
            onChange={(e) => handleInputChange('designation', e.target.value)}
            placeholder="Libellé du bien"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="natureNonBati">Nature</Label>
          <Select value={formData.nature} onValueChange={(value) => handleInputChange('nature', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une nature" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bois et forêts">Bois et forêts</SelectItem>
              <SelectItem value="Parts de GF (Groupement Forestier)">Parts de GF (Groupement Forestier)</SelectItem>
              <SelectItem value="Autres">Autres</SelectItem>
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
          <Label htmlFor="prixAcquisitionNonBati">Prix d'acquisition (€)</Label>
          <Input
            id="prixAcquisitionNonBati"
            type="number"
            value={formData.prixAcquisition}
            onChange={(e) => handleInputChange('prixAcquisition', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="valeurTotaleNonBati">Valeur totale (€)</Label>
          <Input
            id="valeurTotaleNonBati"
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="superficieTerrainNonBati">Superficie terrain (m²)</Label>
          <Input
            id="superficieTerrainNonBati"
            type="number"
            value={formData.superficieTerrain}
            onChange={(e) => handleInputChange('superficieTerrain', e.target.value)}
            placeholder="0"
          />
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
              {formData.dateBail ? format(formData.dateBail, "dd/MM/yyyy") : "Sélectionner une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={formData.dateBail}
              onSelect={(date) => handleInputChange('dateBail', date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="bienMixteNonBati"
            checked={formData.bienMixte}
            onCheckedChange={(checked) => handleInputChange('bienMixte', checked)}
          />
          <Label htmlFor="bienMixteNonBati">Bien mixte</Label>
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
            id="bienIndivisionNonBati"
            checked={formData.bienIndivision}
            onCheckedChange={(checked) => handleInputChange('bienIndivision', checked)}
          />
          <Label htmlFor="bienIndivisionNonBati">Bien en indivision</Label>
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id="abattementBoisForets"
            checked={formData.abattementBoisForets}
            onCheckedChange={(checked) => handleInputChange('abattementBoisForets', checked)}
          />
          <Label htmlFor="abattementBoisForets">Abattement bois et forêts (75 %)</Label>
        </div>
      </div>

      <div>
        <Label htmlFor="natureDroitsNonBati">Nature des droits détenus</Label>
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

  const renderBienIndirectFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="typologieIndirect">Catégorie</Label>
          <Select value={formData.typologie} onValueChange={(value) => handleInputChange('typologie', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES_INDIRECT.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="designationIndirect">Désignation</Label>
          <Input
            id="designationIndirect"
            value={formData.designation}
            onChange={(e) => handleInputChange('designation', e.target.value)}
            placeholder="Libellé du bien"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="pourcentageCapital">Pourcentage du capital détenu (%)</Label>
          <Input
            id="pourcentageCapital"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.pourcentageCapital}
            onChange={(e) => handleInputChange('pourcentageCapital', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="natureDroitsIndirect">Nature des droits détenus</Label>
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
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="bienIndivisionIndirect"
          checked={formData.bienIndivision}
          onCheckedChange={(checked) => handleInputChange('bienIndivision', checked)}
        />
        <Label htmlFor="bienIndivisionIndirect">Bien en indivision</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="valeurVenaleParts">Valeur vénale des parts (€)</Label>
          <Input
            id="valeurVenaleParts"
            type="number"
            value={formData.valeurVenaleParts}
            onChange={(e) => handleInputChange('valeurVenaleParts', e.target.value)}
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="valeurBien">Valeur du bien (€)</Label>
          <Input
            id="valeurBien"
            type="number"
            value={formData.valeurBien}
            onChange={(e) => handleInputChange('valeurBien', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>
    </>
  );

  const renderBienProfessionnelFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="designationProfessionnel">Désignation</Label>
          <Input
            id="designationProfessionnel"
            value={formData.designation}
            onChange={(e) => handleInputChange('designation', e.target.value)}
            placeholder="Libellé du bien"
          />
        </div>
        <div>
          <Label htmlFor="valeurProfessionnel">Valeur (€)</Label>
          <Input
            id="valeurProfessionnel"
            type="number"
            value={formData.valeur}
            onChange={(e) => handleInputChange('valeur', e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div>
        <Label>Exonération liée à :</Label>
        <RadioGroup
          value={formData.exonerationActivite ? 'activite' : formData.exonerationFonction ? 'fonction' : ''}
          onValueChange={(value) => {
            handleInputChange('exonerationActivite', value === 'activite');
            handleInputChange('exonerationFonction', value === 'fonction');
          }}
          className="mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="activite" id="exonerationActiviteRadio" />
            <Label htmlFor="exonerationActiviteRadio" className="text-sm">
              l'exercice d'une activité professionnelle à titre principal
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fonction" id="exonerationFonctionRadio" />
            <Label htmlFor="exonerationFonctionRadio" className="text-sm">
              la fonction et la possession de droits sociaux
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium">Société ou organisme</h4>
        <div className="grid grid-cols-2 gap-4">
          <Input
            placeholder="Dénomination de la société ou organisme"
            value={formData.denominationSociete}
            onChange={(e) => handleInputChange('denominationSociete', e.target.value)}
          />
          <Input
            placeholder="SIREN"
            value={formData.siren}
            onChange={(e) => handleInputChange('siren', e.target.value)}
            maxLength={9}
          />
        </div>
        <Input
          placeholder="Adresse complète"
          value={formData.adresseRue}
          onChange={(e) => handleInputChange('adresseRue', e.target.value)}
        />
        <Input
          placeholder="Activité de l'entreprise"
          value={formData.activiteEntreprise}
          onChange={(e) => handleInputChange('activiteEntreprise', e.target.value)}
        />
      </div>

      {formData.exonerationActivite && (
        <div>
          <Label>Vous exercez cette activité :</Label>
          <RadioGroup
            value={formData.exerciceType}
            onValueChange={(value) => handleInputChange('exerciceType', value)}
            className="mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="entreprise-individuelle" id="entreprise-individuelle" />
              <Label htmlFor="entreprise-individuelle" className="text-sm">dans une entreprise individuelle</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="societe-personne" id="societe-personne" />
              <Label htmlFor="societe-personne" className="text-sm">dans une société de personne</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gerant-majoritaire" id="gerant-majoritaire" />
              <Label htmlFor="gerant-majoritaire" className="text-sm">en tant que gérant majoritaire de SARL</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gerant-commandite" id="gerant-commandite" />
              <Label htmlFor="gerant-commandite" className="text-sm">en tant que gérant dans une société en commandite par actions</Label>
            </div>
          </RadioGroup>
        </div>
      )}

      {formData.exonerationFonction && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="fonctionExercee">Fonction exercée</Label>
            <Select value={formData.fonctionExercee} onValueChange={(value) => handleInputChange('fonctionExercee', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une fonction" />
              </SelectTrigger>
              <SelectContent>
                {FONCTIONS_DIRIGEANT.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium">Type de détention</Label>
            <RadioGroup
              value={formData.typeDetention}
              onValueChange={(value) => handleInputChange('typeDetention', value)}
              className="mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="directement" id="directement" />
                <Label htmlFor="directement" className="text-sm">Directement</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="intermediaire" id="intermediaire" />
                <Label htmlFor="intermediaire" className="text-sm">Par l'intermédiaire d'une société interposée</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">Qualité du détenteur</Label>
            <RadioGroup
              value={formData.qualiteDetenteur}
              onValueChange={(value) => handleInputChange('qualiteDetenteur', value)}
              className="mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="redevable" id="redevable" />
                <Label htmlFor="redevable" className="text-sm">Redevable</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="groupe-familial" id="groupe-familial" />
                <Label htmlFor="groupe-familial" className="text-sm">Groupe familial</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pourcentageCapitalProfessionnel">Pourcentage du capital détenu (%)</Label>
              <Input
                id="pourcentageCapitalProfessionnel"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.pourcentageCapital}
                onChange={(e) => handleInputChange('pourcentageCapital', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="pourcentageDetention">Pourcentage de détention (%)</Label>
              <Input
                id="pourcentageDetention"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.pourcentageDetention}
                onChange={(e) => handleInputChange('pourcentageDetention', e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}
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

      {categorie === 'immeubles-non-batis' && (
        <Card>
          <CardHeader>
            <CardTitle>Immeuble non bâti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderImmeubleNonBatiFields()}
          </CardContent>
        </Card>
      )}

      {categorie === 'biens-detenus-indirectement' && (
        <Card>
          <CardHeader>
            <CardTitle>Bien détenu indirectement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderBienIndirectFields()}
          </CardContent>
        </Card>
      )}

      {categorie === 'biens-professionnels-exoneres' && (
        <Card>
          <CardHeader>
            <CardTitle>Bien professionnel exonéré</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderBienProfessionnelFields()}
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
