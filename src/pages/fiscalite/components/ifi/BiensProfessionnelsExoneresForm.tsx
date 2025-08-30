import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BiensProfessionnelsExoneresFormData {
  designation: string;
  valeur: number;
  exonerationLiee: 'activite' | 'fonction' | '';
  denominationSociete: string;
  siren: string;
  adresse: string;
  activiteEntreprise: string;
  // Pour activité professionnelle
  exerceActivite: string;
  // Pour fonction et possession
  fonctionExercee: string;
  pourcentageCapital: number;
  typeDetention: 'directement' | 'intermediaire' | '';
  qualiteDetenteur: 'redevable' | 'groupe-familial' | '';
  pourcentageDetention: number;
}

interface BiensProfessionnelsExoneresFormProps {
  onSubmit: (data: any) => void;
}

const BiensProfessionnelsExoneresForm = ({ onSubmit }: BiensProfessionnelsExoneresFormProps) => {
  const [formData, setFormData] = useState<BiensProfessionnelsExoneresFormData>({
    designation: '',
    valeur: 0,
    exonerationLiee: '',
    denominationSociete: '',
    siren: '',
    adresse: '',
    activiteEntreprise: '',
    exerceActivite: '',
    fonctionExercee: '',
    pourcentageCapital: 0,
    typeDetention: '',
    qualiteDetenteur: '',
    pourcentageDetention: 0,
  });

  const handleInputChange = (field: keyof BiensProfessionnelsExoneresFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      designation: formData.designation,
      categorie: 'Bien professionnel exonéré',
      valeurTotale: formData.valeur,
      valeurDeclaree: formData.valeur,
    });
  };

  const fonctionOptions = [
    'Gérant minoritaire statutaire',
    'Président',
    'Directeur général',
    'Directeur général délégué',
    'Président du conseil de surveillance',
    'Membre du directoire',
    'Autres',
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
              <Label htmlFor="valeur">Valeur (€) *</Label>
              <Input
                id="valeur"
                type="number"
                value={formData.valeur}
                onChange={(e) => handleInputChange('valeur', parseFloat(e.target.value) || 0)}
                placeholder="0"
                required
              />
            </div>

            <div>
              <Label>Exonération liée à :</Label>
              <RadioGroup 
                value={formData.exonerationLiee} 
                onValueChange={(value) => handleInputChange('exonerationLiee', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="activite" id="activite" />
                  <Label htmlFor="activite" className="text-sm">
                    l'exercice d'une activité professionnelle à titre principal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fonction" id="fonction" />
                  <Label htmlFor="fonction" className="text-sm">
                    la fonction et la possession de droits sociaux
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Société ou organisme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div>
              <Label htmlFor="activiteEntreprise">Activité de l'entreprise</Label>
              <Input
                id="activiteEntreprise"
                value={formData.activiteEntreprise}
                onChange={(e) => handleInputChange('activiteEntreprise', e.target.value)}
                placeholder="Description de l'activité"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {formData.exonerationLiee === 'activite' && (
        <Card>
          <CardHeader>
            <CardTitle>Activité professionnelle</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label>Vous exercez cette activité :</Label>
              <RadioGroup 
                value={formData.exerceActivite} 
                onValueChange={(value) => handleInputChange('exerceActivite', value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="entreprise-individuelle" id="entreprise-individuelle" />
                  <Label htmlFor="entreprise-individuelle" className="text-sm">
                    dans une entreprise individuelle
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="societe-personne" id="societe-personne" />
                  <Label htmlFor="societe-personne" className="text-sm">
                    dans une société de personne
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gerant-majoritaire" id="gerant-majoritaire" />
                  <Label htmlFor="gerant-majoritaire" className="text-sm">
                    en tant que gérant majoritaire de SARL
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="gerant-commandite" id="gerant-commandite" />
                  <Label htmlFor="gerant-commandite" className="text-sm">
                    en tant que gérant dans une société en commandite par actions
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>
      )}

      {formData.exonerationLiee === 'fonction' && (
        <Card>
          <CardHeader>
            <CardTitle>Fonction et possession de droits sociaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="fonctionExercee">Fonction exercée</Label>
              <Select value={formData.fonctionExercee} onValueChange={(value) => handleInputChange('fonctionExercee', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez une fonction" />
                </SelectTrigger>
                <SelectContent>
                  {fonctionOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Pourcentage du capital détenus</Label>
              <div className="space-y-4 mt-2">
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
                      <Label htmlFor="intermediaire" className="text-sm">
                        Par l'intermédiaire d'une société interposée
                      </Label>
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

                <div>
                  <Label htmlFor="pourcentageDetention">Pourcentage (%)</Label>
                  <Input
                    id="pourcentageDetention"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.pourcentageDetention}
                    onChange={(e) => handleInputChange('pourcentageDetention', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="submit">Ajouter le bien</Button>
      </div>
    </form>
  );
};

export default BiensProfessionnelsExoneresForm;