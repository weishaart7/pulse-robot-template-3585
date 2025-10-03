import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PASSIF_NATURES } from '@/constants/assetTypes';
import { ArrowLeft } from 'lucide-react';
import { usePassifs } from '@/hooks/usePassifs';
import { familyService } from '@/services/familyService';

interface PassifFormProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export const PassifForm = ({ onCancel, onSubmit }: PassifFormProps) => {
  const [nature, setNature] = useState('');
  const [montantDu, setMontantDu] = useState('');
  const [detenteur, setDetenteur] = useState('');
  const [pourcentageUtilisateur, setPourcentageUtilisateur] = useState(50);
  const [pourcentageConjoint, setPourcentageConjoint] = useState(50);
  const [detenteurOptions, setDetenteurOptions] = useState<string[]>([]);
  const [familyData, setFamilyData] = useState({ hasPartner: false, userFirstName: '', partnerFirstName: '' });
  const { createPassif } = usePassifs();

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const [familyProfile, maritalStatus] = await Promise.all([
          familyService.getFamilyProfile(),
          familyService.getMaritalStatus()
        ]);

        const options: string[] = [];
        const familyInfo = { hasPartner: false, userFirstName: '', partnerFirstName: '' };
        
        if (familyProfile?.prenom) {
          options.push(familyProfile.prenom);
          familyInfo.userFirstName = familyProfile.prenom;
        }

        if (maritalStatus?.statut_couple && 
            ['marie', 'pacs', 'concubinage'].includes(maritalStatus.statut_couple.toLowerCase())) {
          familyInfo.hasPartner = true;
          
          if (maritalStatus.prenom_conjoint) {
            options.push(maritalStatus.prenom_conjoint);
            familyInfo.partnerFirstName = maritalStatus.prenom_conjoint;
          }
          
          options.push('Le couple');
        }

        setDetenteurOptions(options);
        setFamilyData(familyInfo);
      } catch (error) {
        console.error('Error loading family data:', error);
      }
    };

    loadFamilyData();
  }, []);

  const mapDetenteurToDb = (displayValue: string): string => {
    if (displayValue === familyData.userFirstName || displayValue === 'Vous') {
      return 'user';
    }
    if (displayValue === familyData.partnerFirstName || displayValue === 'Conjoint') {
      return 'spouse';
    }
    if (displayValue === 'Le couple') {
      return 'common';
    }
    return displayValue;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const passifData: any = {
        nature,
        montant_du: parseFloat(montantDu)
      };

      if (detenteur) {
        passifData.detenteur = mapDetenteurToDb(detenteur);
        
        if (detenteur === 'Le couple' && familyData.hasPartner) {
          passifData.pourcentage_utilisateur = pourcentageUtilisateur;
          passifData.pourcentage_conjoint = pourcentageConjoint;
        }
      }

      await createPassif(passifData);
      onSubmit();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Ajouter un passif</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nature">Nature</Label>
            <Select value={nature} onValueChange={setNature} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez la nature du passif" />
              </SelectTrigger>
              <SelectContent>
                {PASSIF_NATURES.map((natureOption) => (
                  <SelectItem key={natureOption} value={natureOption}>
                    {natureOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montantDu">Montant dû (€)</Label>
            <Input
              id="montantDu"
              type="number"
              value={montantDu}
              onChange={(e) => setMontantDu(e.target.value)}
              placeholder="0"
              required
            />
          </div>

          {detenteurOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="detenteur">Détenteur</Label>
              <Select value={detenteur} onValueChange={setDetenteur}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un détenteur" />
                </SelectTrigger>
                <SelectContent>
                  {detenteurOptions.map(option => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {detenteur === 'Le couple' && familyData.hasPartner && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pourcentageUtilisateur">
                  Pourcentage {familyData.userFirstName || 'vous'} (%)
                </Label>
                <Input
                  id="pourcentageUtilisateur"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={pourcentageUtilisateur}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setPourcentageUtilisateur(value);
                    setPourcentageConjoint(100 - value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pourcentageConjoint">
                  Pourcentage {familyData.partnerFirstName || 'conjoint(e)'} (%)
                </Label>
                <Input
                  id="pourcentageConjoint"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={pourcentageConjoint}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setPourcentageConjoint(value);
                    setPourcentageUtilisateur(100 - value);
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nature || !montantDu}>
              Ajouter le passif
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};