import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Building2 } from 'lucide-react';
import { sireneService, type SireneData } from '@/services/sireneService';
import { toast } from 'sonner';

interface SocieteFormData {
  denomination: string;
  typeSociete: string;
  dateCreation: string;
  valeurEstimee: number;
  pourcentageIFI: number;
  capitalSocial: number;
  nombreTitres: number;
  nombreSalaries: number;
  jourCloture: string;
  moisCloture: string;
  siret: string;
  rueAdresse: string;
  codePostal: string;
  commune: string;
  pays: string;
  typeActivite: string;
  regimeFiscal: string;
  valeurIFI: number;
  activite?: string;
  holding?: string;
  formeSocieteCivile?: string;
  transfertVersActifs?: boolean;
  natureActif?: string;
}

interface SocieteFormProps {
  onSubmit: (data: Omit<SocieteFormData, 'id'>) => void;
  onCancel: () => void;
  initialData?: SocieteFormData | null;
}

const TYPES_SOCIETE = [
  { value: 'micro-entrepreneur', label: 'Micro entrepreneur' },
  { value: 'entreprise-individuelle', label: 'Entreprise individuelle' },
  { value: 'earl-pluripersonnelle', label: 'EARL pluripersonnelle' },
  { value: 'earl-unipersonnelle', label: 'EARL unipersonnelle' },
  { value: 'eurl', label: 'EURL' },
  { value: 'gaec', label: 'GAEC' },
  { value: 'sa-conseil-administration', label: 'SA à conseil d\'administration' },
  { value: 'sa-directoire', label: 'SA à directoire et conseil de surveillance' },
  { value: 'sarl', label: 'SARL' },
  { value: 'sarl-familiale', label: 'SARL familiale' },
  { value: 'sas', label: 'SAS' },
  { value: 'scea-scev', label: 'SCEA/SCEV' },
  { value: 'selarl', label: 'SELARL' },
  { value: 'snc', label: 'SNC' },
  { value: 'societe-civile', label: 'Société civile' },
  { value: 'societe-civile-professionnelle', label: 'Société civile professionnelle' }
];

const ACTIVITES = {
  'micro-entrepreneur': ['Agricole', 'Industrielle et commerciale', 'Libérale'],
  'entreprise-individuelle': ['Agricole', 'Industrielle et commerciale', 'Libérale'],
  'earl-pluripersonnelle': ['Agricole'],
  'earl-unipersonnelle': ['Agricole'],
  'eurl': ['Agricole', 'Industrielle et commerciale', 'Libérale', 'Patrimoniale'],
  'gaec': ['Agricole'],
  'sa-conseil-administration': ['Agricole', 'Non agricole'],
  'sa-directoire': ['Agricole', 'Non agricole'],
  'sarl': ['Agricole', 'Industrielle et commerciale', 'Libérale', 'Patrimoniale'],
  'sarl-familiale': ['Agricole', 'Industrielle et commerciale', 'Libérale', 'Patrimoniale'],
  'sas': ['Agricole', 'Non agricole'],
  'scea-scev': ['Agricole'],
  'selarl': ['Libérale'],
  'snc': ['Industrielle & commerciale'],
  'societe-civile': ['Gestion immobilière', 'Patrimoniale'],
  'societe-civile-professionnelle': ['Libérale']
};

const REGIMES_FISCAUX = {
  'micro-entrepreneur': [],
  'entreprise-individuelle': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'earl-pluripersonnelle': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'earl-unipersonnelle': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'eurl': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'gaec': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'sa-conseil-administration': ['Impôt sur les sociétés'],
  'sa-directoire': ['Impôt sur les sociétés'],
  'sarl': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'sarl-familiale': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'sas': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'scea-scev': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'selarl': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'snc': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'societe-civile': ['Impôt sur le revenu', 'Impôt sur les sociétés'],
  'societe-civile-professionnelle': ['Impôt sur le revenu', 'Impôt sur les sociétés']
};

const FORMES_SOCIETE_CIVILE = [
  { value: 'sci', label: 'SCI' },
  { value: 'sci-familiale', label: 'SCI Familiale' },
  { value: 'sc-portefeuille', label: 'SC de Portefeuille' },
  { value: 'sc-moyens', label: 'SC de Moyens' }
];

const HOLDINGS = ['Non', 'Passive', 'Animatrice'];

export const SocieteForm = ({ onSubmit, onCancel, initialData }: SocieteFormProps) => {
  const [formData, setFormData] = useState<SocieteFormData>({
    denomination: '',
    typeSociete: '',
    dateCreation: '',
    valeurEstimee: 0,
    pourcentageIFI: 0,
    capitalSocial: 0,
    nombreTitres: 0,
    nombreSalaries: 0,
    jourCloture: '31',
    moisCloture: 'Décembre',
    siret: '',
    rueAdresse: '',
    codePostal: '',
    commune: '',
    pays: 'France',
    typeActivite: '',
    regimeFiscal: '',
    valeurIFI: 0,
    activite: '',
    holding: 'Non',
    formeSocieteCivile: '',
    transfertVersActifs: true
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SireneData[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Reset form when initialData is null (new society)
      setFormData({
        denomination: '',
        typeSociete: '',
        dateCreation: '',
        valeurEstimee: 0,
        pourcentageIFI: 0,
        capitalSocial: 0,
        nombreTitres: 0,
        nombreSalaries: 0,
        jourCloture: '31',
        moisCloture: 'Décembre',
        siret: '',
        rueAdresse: '',
        codePostal: '',
        commune: '',
        pays: 'France',
        typeActivite: '',
        regimeFiscal: '',
        valeurIFI: 0,
        activite: '',
        holding: 'Non',
        formeSocieteCivile: '',
        transfertVersActifs: true
      });
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [initialData]);

  const handleInputChange = (field: keyof SocieteFormData, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine asset nature based on holding and type
    let natureActif = '';
    if (formData.holding === 'Animatrice' || formData.holding === 'Passive') {
      natureActif = 'Parts de holding';
    } else if (formData.typeSociete === 'sarl') {
      natureActif = 'Droits sociaux';
    } else {
      natureActif = 'Autres biens professionnels';
    }
    
    onSubmit({ ...formData, natureActif });
  };

  const getDefaultRegimeFiscal = (typeSociete: string) => {
    const regimes = REGIMES_FISCAUX[typeSociete as keyof typeof REGIMES_FISCAUX] || [];
    if (regimes.includes('Impôt sur le revenu')) return 'Impôt sur le revenu';
    if (regimes.includes('Impôt sur les sociétés')) return 'Impôt sur les sociétés';
    return '';
  };

  const showHolding = (typeSociete: string) => {
    return !['micro-entrepreneur', 'sa-conseil-administration', 'sa-directoire', 'sas'].includes(typeSociete);
  };

  const isRegimeFiscalBlocked = (typeSociete: string) => {
    return ['sa-conseil-administration', 'sa-directoire'].includes(typeSociete);
  };

  const isActiviteBlocked = (typeSociete: string) => {
    return ['selarl', 'snc', 'societe-civile-professionnelle'].includes(typeSociete);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Veuillez saisir un SIREN ou une dénomination');
      return;
    }

    setIsSearching(true);
    setSearchResults([]);

    try {
      // Check if query is a SIREN (9 digits)
      const isSiren = /^\d{9}$/.test(searchQuery.trim());

      if (isSiren) {
        const result = await sireneService.searchBySiren(searchQuery.trim());
        if (result) {
          fillFormWithSireneData(result);
          toast.success('Données récupérées avec succès');
        } else {
          toast.error('Aucune entreprise trouvée avec ce SIREN');
        }
      } else {
        const results = await sireneService.searchByDenomination(searchQuery.trim());
        if (results.length > 0) {
          setSearchResults(results);
          toast.success(`${results.length} entreprise(s) trouvée(s)`);
        } else {
          toast.error('Aucune entreprise trouvée');
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setIsSearching(false);
    }
  };

  const fillFormWithSireneData = (data: SireneData) => {
    setFormData(prev => ({
      ...prev,
      denomination: data.denomination || prev.denomination,
      siret: data.siret || prev.siret,
      dateCreation: data.dateCreation || prev.dateCreation,
      rueAdresse: data.adresse || prev.rueAdresse,
      codePostal: data.codePostal || prev.codePostal,
      commune: data.commune || prev.commune,
      capitalSocial: data.capitalSocial || prev.capitalSocial,
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Rechercher une entreprise
          </CardTitle>
          <CardDescription>
            Recherchez par SIREN (9 chiffres) ou par dénomination sociale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="SIREN ou dénomination sociale"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            />
            <Button
              type="button"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Recherche...' : 'Rechercher'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((result, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fillFormWithSireneData(result)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 mt-0.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{result.denomination}</p>
                        <p className="text-sm text-muted-foreground">SIRET: {result.siret}</p>
                        {result.adresse && (
                          <p className="text-sm text-muted-foreground">
                            {result.adresse}, {result.codePostal} {result.commune}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="grid gap-4">
        <div>
          <Label htmlFor="denomination">Dénomination sociale *</Label>
          <Input
            id="denomination"
            value={formData.denomination}
            onChange={(e) => handleInputChange('denomination', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="typeSociete">Type de structure *</Label>
          <Select
            value={formData.typeSociete}
            onValueChange={(value) => {
              handleInputChange('typeSociete', value);
              handleInputChange('regimeFiscal', getDefaultRegimeFiscal(value));
              handleInputChange('activite', '');
            }}
          >
            <SelectTrigger size="lg">
              <SelectValue placeholder="Sélectionnez le type de société" />
            </SelectTrigger>
            <SelectContent>
              {TYPES_SOCIETE.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {formData.typeSociete === 'societe-civile' && (
          <div>
            <Label htmlFor="formeSocieteCivile">Forme de Société civile</Label>
            <Select
              value={formData.formeSocieteCivile}
              onValueChange={(value) => handleInputChange('formeSocieteCivile', value)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez la forme" />
              </SelectTrigger>
              <SelectContent>
                {FORMES_SOCIETE_CIVILE.map((forme) => (
                  <SelectItem key={forme.value} value={forme.value}>
                    {forme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.typeSociete && ACTIVITES[formData.typeSociete as keyof typeof ACTIVITES] && (
          <div>
            <Label htmlFor="activite">Activité</Label>
            <Select
              value={formData.activite}
              onValueChange={(value) => handleInputChange('activite', value)}
              disabled={isActiviteBlocked(formData.typeSociete)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez l'activité" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITES[formData.typeSociete as keyof typeof ACTIVITES].map((activite) => (
                  <SelectItem key={activite} value={activite}>
                    {activite}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.typeSociete && REGIMES_FISCAUX[formData.typeSociete as keyof typeof REGIMES_FISCAUX]?.length > 0 && (
          <div>
            <Label htmlFor="regimeFiscal">Régime fiscal</Label>
            <Select
              value={formData.regimeFiscal}
              onValueChange={(value) => handleInputChange('regimeFiscal', value)}
              disabled={isRegimeFiscalBlocked(formData.typeSociete)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez le régime fiscal" />
              </SelectTrigger>
              <SelectContent>
                {REGIMES_FISCAUX[formData.typeSociete as keyof typeof REGIMES_FISCAUX].map((regime) => (
                  <SelectItem key={regime} value={regime}>
                    {regime}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {formData.typeSociete && showHolding(formData.typeSociete) && (
          <div>
            <Label htmlFor="holding">Holding</Label>
            <Select
              value={formData.holding}
              onValueChange={(value) => handleInputChange('holding', value)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez le type de holding" />
              </SelectTrigger>
              <SelectContent>
                {HOLDINGS.map((holding) => (
                  <SelectItem key={holding} value={holding}>
                    {holding}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="dateCreation">Date de création</Label>
            <Input
              id="dateCreation"
              type="date"
              value={formData.dateCreation}
              onChange={(e) => handleInputChange('dateCreation', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="valeurEstimee">Valeur estimée (€)</Label>
            <Input
              id="valeurEstimee"
              type="number"
              value={formData.valeurEstimee || ''}
              onChange={(e) => handleInputChange('valeurEstimee', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pourcentageIFI">% de parts soumises à l'IFI</Label>
            <Input
              id="pourcentageIFI"
              type="number"
              min="0"
              max="100"
              value={formData.pourcentageIFI || ''}
              onChange={(e) => handleInputChange('pourcentageIFI', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="capitalSocial">Capital social (€)</Label>
            <Input
              id="capitalSocial"
              type="number"
              value={formData.capitalSocial || ''}
              onChange={(e) => handleInputChange('capitalSocial', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="nombreTitres">Nombre de titres</Label>
            <Input
              id="nombreTitres"
              type="number"
              value={formData.nombreTitres || ''}
              onChange={(e) => handleInputChange('nombreTitres', Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="nombreSalaries">Nombre de salariés</Label>
            <Input
              id="nombreSalaries"
              type="number"
              value={formData.nombreSalaries || ''}
              onChange={(e) => handleInputChange('nombreSalaries', Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label>Date de clôture d'exercice</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Select
              value={formData.jourCloture}
              onValueChange={(value) => handleInputChange('jourCloture', value)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Jour" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((jour) => (
                  <SelectItem key={jour} value={jour.toString()}>
                    {jour}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={formData.moisCloture}
              onValueChange={(value) => handleInputChange('moisCloture', value)}
            >
              <SelectTrigger size="lg">
                <SelectValue placeholder="Mois" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
                ].map((mois) => (
                  <SelectItem key={mois} value={mois}>
                    {mois}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="siret">SIRET</Label>
          <Input
            id="siret"
            value={formData.siret}
            onChange={(e) => handleInputChange('siret', e.target.value)}
          />
        </div>

        <div>
          <Label>Siège social</Label>
          <div className="space-y-2 mt-2">
            <Input
              placeholder="Rue"
              value={formData.rueAdresse}
              onChange={(e) => handleInputChange('rueAdresse', e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Code postal"
                value={formData.codePostal}
                onChange={(e) => handleInputChange('codePostal', e.target.value)}
              />
              <Input
                placeholder="Commune"
                value={formData.commune}
                onChange={(e) => handleInputChange('commune', e.target.value)}
              />
            </div>
            <Input
              placeholder="Pays"
              value={formData.pays}
              onChange={(e) => handleInputChange('pays', e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="valeurIFI">Valeur IFI (€)</Label>
          <Input
            id="valeurIFI"
            type="number"
            value={formData.valeurIFI || ''}
            onChange={(e) => handleInputChange('valeurIFI', Number(e.target.value))}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="transfertVersActifs"
            checked={formData.transfertVersActifs}
            onCheckedChange={(checked) => handleInputChange('transfertVersActifs', checked as boolean)}
          />
          <Label htmlFor="transfertVersActifs" className="cursor-pointer">
            Transférer vers la liste d'actif
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">
          {initialData ? 'Modifier' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
};