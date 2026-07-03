import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPRUNT_NATURES } from '@/constants/assetTypes';
import { ArrowLeft, Wallet } from 'lucide-react';
import { useEmprunts } from '@/hooks/usePassifs';
import { familyService } from '@/services/familyService';
import { mapDetenteurToDisplay, mapDetenteurToDb } from '@/lib/patrimoine/utils';

interface EmpruntFormProps {
  emprunt?: any;
  onCancel: () => void;
  onSubmit: () => void;
}

export const EmpruntForm = ({ emprunt, onCancel, onSubmit }: EmpruntFormProps) => {
  const [nature, setNature] = useState(emprunt?.nature || '');
  const [libelle, setLibelle] = useState(emprunt?.libelle || '');
  const [capitalRestantDu, setCapitalRestantDu] = useState(emprunt?.capital_restant_du?.toString() || '');
  const [interets, setInterets] = useState(emprunt?.taux_interet?.toString() || '');
  const [mensualites, setMensualites] = useState(emprunt?.mensualite?.toString() || '');
  const [dureeRestante, setDureeRestante] = useState(emprunt?.duree_restante?.toString() || '');
  const [detenteur, setDetenteur] = useState('');
  const [pourcentageUtilisateur, setPourcentageUtilisateur] = useState(emprunt?.pourcentage_utilisateur || 50);
  const [pourcentageConjoint, setPourcentageConjoint] = useState(emprunt?.pourcentage_conjoint || 50);
  const [reporterBudget, setReporterBudget] = useState<boolean>(emprunt?.reporter_budget ?? false);
  const [detenteurOptions, setDetenteurOptions] = useState<string[]>([]);
  const [familyData, setFamilyData] = useState({ hasPartner: false, userFirstName: '', partnerFirstName: '' });
  const { createEmprunt, updateEmprunt } = useEmprunts();

  useEffect(() => {
    const loadFamilyData = async () => {
      try {
        const [familyProfile, maritalStatus] = await Promise.all([
          familyService.getFamilyProfile(),
          familyService.getMaritalStatus()
        ]);

        const options: string[] = [];
        const familyInfo = { hasPartner: false, userFirstName: '', partnerFirstName: '' };
        
        // Add user's first name
        if (familyProfile?.prenom) {
          options.push(familyProfile.prenom);
          familyInfo.userFirstName = familyProfile.prenom;
        }

        // Check if user has partner (married, pacsé or concubinage)
        const hasPartner = maritalStatus?.statut_couple && 
            ['Marié(e)', 'Pacsé(e)', 'Concubinage', 'MARIE', 'PACS', 'PACSE', 'CONCUBINAGE'].includes(maritalStatus.statut_couple) &&
            maritalStatus.prenom_conjoint;

        if (hasPartner) {
          options.push(maritalStatus.prenom_conjoint);
          familyInfo.hasPartner = true;
          familyInfo.partnerFirstName = maritalStatus.prenom_conjoint;
        }

        // Always add "Le couple" option if there's a partner
        if (familyInfo.hasPartner) {
          options.push('Le couple');
        }

        setDetenteurOptions(options);
        setFamilyData(familyInfo);

        // Map detenteur from DB to display value if editing
        if (emprunt?.detenteur) {
          const displayValue = mapDetenteurToDisplay(emprunt.detenteur, familyInfo);
          setDetenteur(displayValue);
        }
      } catch (error) {
        console.error('Error loading family data:', error);
      }
    };

    loadFamilyData();
  }, [emprunt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const empruntData: any = {
        nature,
        libelle,
        capital_restant_du: capitalRestantDu ? parseFloat(capitalRestantDu) : undefined,
        taux_interet: interets ? parseFloat(interets) : undefined,
        mensualite: mensualites ? parseFloat(mensualites) : undefined,
        duree_restante: dureeRestante ? parseInt(dureeRestante) : undefined,
        reporter_budget: reporterBudget,
      };

      if (detenteur) {
        empruntData.detenteur = mapDetenteurToDb(detenteur, familyData);
        
        if (detenteur === 'Le couple' && familyData.hasPartner) {
          empruntData.pourcentage_utilisateur = pourcentageUtilisateur;
          empruntData.pourcentage_conjoint = pourcentageConjoint;
        }
      }

      if (emprunt?.id) {
        await updateEmprunt(emprunt.id, empruntData);
      } else {
        await createEmprunt(empruntData);
      }
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
          <CardTitle>{emprunt ? 'Modifier' : 'Ajouter'} un emprunt</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nature">Nature de l'emprunt</Label>
            <Select value={nature} onValueChange={setNature} required>
              <SelectTrigger size="lg">
                <SelectValue placeholder="Sélectionnez la nature de l'emprunt" />
              </SelectTrigger>
              <SelectContent>
                {EMPRUNT_NATURES.map((natureOption) => (
                  <SelectItem key={natureOption} value={natureOption}>
                    {natureOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {nature && (
            <>
              <div className="space-y-2">
                <Label htmlFor="libelle">Libellé</Label>
                <Input
                  id="libelle"
                  value={libelle}
                  onChange={(e) => setLibelle(e.target.value)}
                  placeholder="Libellé de l'emprunt"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capitalRestantDu">Capital restant dû (€)</Label>
                <Input
                  id="capitalRestantDu"
                  type="number"
                  value={capitalRestantDu}
                  onChange={(e) => setCapitalRestantDu(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interets">Intérêts (%)</Label>
                <Input
                  id="interets"
                  type="number"
                  step="0.01"
                  value={interets}
                  onChange={(e) => setInterets(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensualites">Mensualités (€)</Label>
                <Input
                  id="mensualites"
                  type="number"
                  value={mensualites}
                  onChange={(e) => setMensualites(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dureeRestante">Durée restante (en mois)</Label>
                <Input
                  id="dureeRestante"
                  type="number"
                  value={dureeRestante}
                  onChange={(e) => setDureeRestante(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                <Checkbox
                  id="reporterBudget"
                  checked={reporterBudget}
                  onCheckedChange={(c) => setReporterBudget(!!c)}
                />
                <div className="space-y-1 leading-none">
                  <Label htmlFor="reporterBudget" className="flex items-center gap-2 cursor-pointer">
                    <Wallet className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                    Reporter la mensualité dans le budget
                  </Label>
                  <p className="text-[12px] text-muted-foreground">
                    La mensualité de cet emprunt sera ajoutée automatiquement aux charges du budget mensuel.
                  </p>
                  {reporterBudget && mensualites && parseFloat(mensualites) > 0 && (
                    <p className="text-[12px] text-muted-foreground">
                      +{Math.round(parseFloat(mensualites)).toLocaleString('fr-FR')} €/mois dans votre budget
                    </p>
                  )}
                </div>
              </div>

              {detenteurOptions.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="detenteur">Détenteur</Label>
                  <Select value={detenteur} onValueChange={setDetenteur}>
                    <SelectTrigger size="lg">
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
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nature}>
              {emprunt ? 'Modifier' : 'Ajouter'} l'emprunt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};