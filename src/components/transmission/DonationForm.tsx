import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';

interface Asset {
  id: string;
  denomination: string;
  nature: string;
  valeur_estimee: number;
  date_estimation: string;
  detenteur: string;
}

interface FamilyMember {
  id: string;
  nom: string;
  prenom: string;
  lien_familial: string;
}

interface Beneficiary {
  id: string;
  nom: string;
  prenom: string;
  lien_familial: string;
  pourcentage: number;
}

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
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<{id: string, valeurDonation: number}[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);

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

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, denomination, nature, valeur_estimee, date_estimation, detenteur')
        .order('denomination');

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des biens:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('family_links')
        .select('id, nom, prenom, lien_familial')
        .order('nom');

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des liens familiaux:', error);
    }
  };

  const handleAssetToggle = (assetId: string, valeurEstimee: number) => {
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.id === assetId);
      if (exists) {
        return prev.filter(a => a.id !== assetId);
      } else {
        return [...prev, { id: assetId, valeurDonation: valeurEstimee }];
      }
    });
  };

  const updateAssetDonationValue = (assetId: string, value: number) => {
    setSelectedAssets(prev => 
      prev.map(a => a.id === assetId ? { ...a, valeurDonation: value } : a)
    );
  };

  const handleBeneficiaryToggle = (member: FamilyMember) => {
    setBeneficiaries(prev => {
      const exists = prev.find(b => b.id === member.id);
      if (exists) {
        return prev.filter(b => b.id !== member.id);
      } else {
        return [...prev, { ...member, pourcentage: 0 }];
      }
    });
  };

  const updateBeneficiaryPercentage = (beneficiaryId: string, percentage: number) => {
    setBeneficiaries(prev => 
      prev.map(b => b.id === beneficiaryId ? { ...b, pourcentage: percentage } : b)
    );
  };

  useEffect(() => {
    if (open) {
      fetchAssets();
      fetchFamilyMembers();
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form data:', formData, 'Clauses:', selectedClauses, 'Selected assets:', selectedAssets, 'Beneficiaries:', beneficiaries);
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
              {loading ? (
                <p className="text-muted-foreground">Chargement des biens...</p>
              ) : assets.length === 0 ? (
                <p className="text-muted-foreground">Aucun bien disponible</p>
              ) : (
                <div className="space-y-4">
                  {assets.map((asset) => {
                    const isSelected = selectedAssets.find(a => a.id === asset.id);
                    return (
                      <div key={asset.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={asset.id}
                            checked={!!isSelected}
                            onCheckedChange={() => handleAssetToggle(asset.id, asset.valeur_estimee || 0)}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Dénomination</Label>
                                <p className="text-sm">{asset.denomination}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Nature</Label>
                                <p className="text-sm">{asset.nature}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Détenteur</Label>
                                <p className="text-sm">{asset.detenteur}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Valeur actuelle</Label>
                                <p className="text-sm">{asset.valeur_estimee?.toLocaleString('fr-FR')} €</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3">
                                <Label htmlFor={`valeur-${asset.id}`} className="text-sm font-medium">
                                  Valeur au jour de la donation
                                </Label>
                                <Input
                                  id={`valeur-${asset.id}`}
                                  type="number"
                                  value={isSelected.valeurDonation}
                                  onChange={(e) => updateAssetDonationValue(asset.id, Number(e.target.value))}
                                  placeholder="Valeur de donation"
                                  className="mt-1"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Donataires */}
          <Card>
            <CardHeader>
              <CardTitle>Donataires</CardTitle>
            </CardHeader>
            <CardContent>
              {familyMembers.length === 0 ? (
                <p className="text-muted-foreground">
                  Aucun lien familial renseigné. Ajoutez des membres de famille dans la section "Liens familiaux" pour les sélectionner comme donataires.
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez les personnes qui recevront cette donation et indiquez le pourcentage reçu par chacune.
                  </p>
                  {familyMembers.map((member) => {
                    const isSelected = beneficiaries.find(b => b.id === member.id);
                    return (
                      <div key={member.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id={`beneficiary-${member.id}`}
                            checked={!!isSelected}
                            onCheckedChange={() => handleBeneficiaryToggle(member)}
                          />
                          <div className="flex-1">
                            <div className="grid grid-cols-3 gap-4 mb-3">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Nom</Label>
                                <p className="text-sm">{member.nom}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Prénom</Label>
                                <p className="text-sm">{member.prenom || 'Non renseigné'}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Lien de parenté</Label>
                                <p className="text-sm">{member.lien_familial}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="mt-3">
                                <Label htmlFor={`percentage-${member.id}`} className="text-sm font-medium">
                                  Pourcentage reçu (%)
                                </Label>
                                <Input
                                  id={`percentage-${member.id}`}
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={isSelected.pourcentage}
                                  onChange={(e) => updateBeneficiaryPercentage(member.id, Number(e.target.value))}
                                  placeholder="Ex: 50"
                                  className="mt-1 w-32"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {beneficiaries.length > 0 && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="text-sm">
                        <span className="font-medium">Total des pourcentages : </span>
                        <span className={`${
                          beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0) === 100 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        } font-medium`}>
                          {beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0).toFixed(2)}%
                        </span>
                      </div>
                      {beneficiaries.reduce((sum, b) => sum + b.pourcentage, 0) !== 100 && (
                        <p className="text-xs text-orange-600 mt-1">
                          Le total doit être égal à 100% pour une donation complète
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
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