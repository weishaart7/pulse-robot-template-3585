import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyData, useMaritalStatus } from '@/hooks/useFamilyData';
import { useToast } from '@/hooks/use-toast';

interface MatrimonialRegimeOptionsProps {
  regimeType: 'communaute_reduite' | 'communaute_meubles' | 'communaute_universelle' | 'separation_biens' | 'participation_acquets';
  userProfile?: any;
  spouseProfile?: any;
}

interface ClauseState {
  [key: string]: {
    enabled: boolean;
    selectedAssets?: string[];
    partPleineProprietee?: number;
    partUsufruit?: number;
    options?: any;
  };
}

interface DonationState {
  enFaveurUtilisateur: boolean;
  enFaveurConjoint: boolean;
}

const AssetSelectionModal: React.FC<{
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedAssets: string[]) => void;
  preSelectedAssets?: string[];
}> = ({ title, isOpen, onClose, onConfirm, preSelectedAssets = [] }) => {
  const { assets } = useAssets();
  const [selectedAssets, setSelectedAssets] = useState<string[]>(preSelectedAssets);

  const handleAssetToggle = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedAssets);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sélectionnez les biens à inclure dans cette clause :
          </p>
          {assets && assets.length > 0 ? (
            <div className="space-y-2">
              {assets.map((asset) => (
                <div key={asset.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={asset.id}
                    checked={selectedAssets.includes(asset.id)}
                    onCheckedChange={() => handleAssetToggle(asset.id)}
                  />
                  <Label htmlFor={asset.id} className="flex-1">
                    {asset.denomination} - {asset.nature} ({asset.valeur_estimee?.toLocaleString()}€)
                  </Label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Aucun bien trouvé. Veuillez d'abord ajouter des biens dans la section Patrimoine.
            </p>
          )}
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={handleConfirm}>
              Confirmer la sélection
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PercentageInputs: React.FC<{
  partPleineProprietee: number;
  partUsufruit: number;
  onChange: (partPP: number, partUsufruit: number) => void;
}> = ({ partPleineProprietee, partUsufruit, onChange }) => {
  const handlePPChange = (value: string) => {
    const pp = parseInt(value) || 0;
    const usufruit = Math.max(0, 100 - pp);
    onChange(pp, usufruit);
  };

  const handleUsufruitChange = (value: string) => {
    const usufruit = parseInt(value) || 0;
    const pp = Math.max(0, 100 - usufruit);
    onChange(pp, usufruit);
  };

  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <Label htmlFor="part-pp">Part en pleine propriété (%)</Label>
        <Input
          id="part-pp"
          type="number"
          min="0"
          max="100"
          value={partPleineProprietee}
          onChange={(e) => handlePPChange(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="part-usufruit">Part en usufruit (%)</Label>
        <Input
          id="part-usufruit"
          type="number"
          min="0"
          max="100"
          value={partUsufruit}
          onChange={(e) => handleUsufruitChange(e.target.value)}
        />
      </div>
      <div className="col-span-2 text-sm text-muted-foreground">
        Total: {partPleineProprietee + partUsufruit}% {partPleineProprietee + partUsufruit !== 100 && (
          <span className="text-destructive">(doit être égal à 100%)</span>
        )}
      </div>
    </div>
  );
};

export const MatrimonialRegimeOptions: React.FC<MatrimonialRegimeOptionsProps> = ({
  regimeType,
  userProfile,
  spouseProfile
}) => {
  const { toast } = useToast();
  const { data: maritalData, saveData } = useMaritalStatus();
  const [clauseModalOpen, setClauseModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [currentAssetModal, setCurrentAssetModal] = useState<string>('');
  const [clauses, setClauses] = useState<ClauseState>({});
  const [donation, setDonation] = useState<DonationState>({
    enFaveurUtilisateur: false,
    enFaveurConjoint: false
  });

  // Charger les données existantes
  useEffect(() => {
    if (maritalData) {
      const dataAny = maritalData as any;
      if (dataAny.clauses_contrat) {
        try {
          const parsedClauses = typeof dataAny.clauses_contrat === 'string' 
            ? JSON.parse(dataAny.clauses_contrat) 
            : dataAny.clauses_contrat;
          setClauses(parsedClauses);
        } catch (error) {
          console.error('Erreur de parsing clauses:', error);
        }
      }
      if (dataAny.donation_dernier_vivant) {
        try {
          const parsedDonation = typeof dataAny.donation_dernier_vivant === 'string' 
            ? JSON.parse(dataAny.donation_dernier_vivant) 
            : dataAny.donation_dernier_vivant;
          setDonation(parsedDonation);
        } catch (error) {
          console.error('Erreur de parsing donation:', error);
        }
      }
    }
  }, [maritalData]);

  // Fonction pour sauvegarder les données
  const saveClausesData = async (newClauses: ClauseState, newDonation: DonationState) => {
    try {
      const dataToSave = {
        clauses_contrat: JSON.stringify(newClauses),
        donation_dernier_vivant: JSON.stringify(newDonation),
      };
      await saveData(dataToSave as any);
      toast({
        title: "Succès",
        description: "Les clauses ont été sauvegardées avec succès.",
      });
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde.",
        variant: "destructive",
      });
    }
  };

  const handleClauseToggle = (clauseName: string) => {
    const newClauses = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        enabled: !clauses[clauseName]?.enabled,
        partPleineProprietee: clauses[clauseName]?.partPleineProprietee || 50,
        partUsufruit: clauses[clauseName]?.partUsufruit || 50
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  };

  const handleAssetSelection = (clauseName: string) => {
    setCurrentAssetModal(clauseName);
    setAssetModalOpen(true);
  };

  const handleAssetConfirm = (selectedAssets: string[]) => {
    const newClauses = {
      ...clauses,
      [currentAssetModal]: {
        ...clauses[currentAssetModal],
        selectedAssets
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  };

  const handlePercentageChange = (clauseName: string, partPP: number, partUsufruit: number) => {
    const newClauses = {
      ...clauses,
      [clauseName]: {
        ...clauses[clauseName],
        partPleineProprietee: partPP,
        partUsufruit: partUsufruit
      }
    };
    setClauses(newClauses);
    saveClausesData(newClauses, donation);
  };

  const getClausesForRegime = () => {
    switch (regimeType) {
      case 'communaute_reduite':
        return [
          { key: 'mise_en_communaute', label: 'Clause de mise en communauté', hasAssets: true },
          { key: 'reprise_apports', label: 'Clause de reprise des apports (dite « clause alsacienne ») (uniquement cas de divorce)' },
          { key: 'preciput', label: 'Clause de préciput', hasAssets: true, hasOptions: true },
          { key: 'attribution_integrale', label: 'Clause d\'attribution intégrale (uniquement cas de décès)', hasPercentages: true },
          { key: 'partage_inegal', label: 'Clause de partage inégal', hasPercentages: true },
          { key: 'stipulation_bien_propre', label: 'La clause de stipulation de bien propre', hasAssets: true },
          { key: 'modification_recompenses', label: 'La clause modifiant le montant des récompenses et des créances entre époux' },
          { key: 'prelevement_biens_communs', label: 'La clause de prélèvement des biens communs moyennant indemnité' },
          { key: 'prelevement_indemnisation', label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)' }
        ];
      
      case 'communaute_meubles':
        return [
          { key: 'preciput', label: 'Clause de préciput', hasAssets: true },
          { key: 'mise_en_communaute', label: 'Clause de mise en communauté', hasAssets: true },
          { key: 'reprise_apports', label: 'Clause de reprise des apports (clause alsacienne) (uniquement cas de divorce)' },
          { key: 'attribution_integrale', label: 'Clause d\'attribution intégrale (uniquement cas de décès)', hasPercentages: true },
          { key: 'partage_inegal', label: 'Clause de partage inégal', hasPercentages: true },
          { key: 'exclusion_bien_communaute', label: 'Exclusion d\'un bien de la communauté', hasAssets: true },
          { key: 'stipulation_bien_propre', label: 'La clause de stipulation de bien propre', hasAssets: true },
          { key: 'prelevement_biens_communs', label: 'La clause de prélèvement des biens communs moyennant indemnité' },
          { key: 'prelevement_indemnisation', label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)' }
        ];
      
      case 'communaute_universelle':
        return [
          { key: 'attribution_integrale_survivant', label: 'Clause d\'attribution intégrale au survivant' },
          { key: 'preciput', label: 'Clause de préciput', hasAssets: true },
          { key: 'exclusion_certains_biens', label: 'Exclusion de certains biens', hasAssets: true },
          { key: 'reprise_apports', label: 'Clause de reprise des apports' }
        ];
      
      case 'separation_biens':
        return [
          { key: 'societe_acquets', label: 'Société d\'acquêts', hasAssets: true, hasSubClauses: true },
          { key: 'contribution_charges', label: 'Clause aménageant la contribution aux charges du mariage' },
          { key: 'amenagement_indivision', label: 'Aménagement de l\'indivision' },
          { key: 'maintien_indivision', label: 'Clause de maintien dans l\'indivision (À regarder)' },
          { key: 'exclusion_reprise', label: 'Clause d\'exclusion de reprise' },
          { key: 'prelevement_indemnisation', label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)' }
        ];
      
      case 'participation_acquets':
        return [
          { key: 'societe_acquets', label: 'Société d\'acquêts', hasAssets: true, hasSubClauses: true },
          { key: 'evaluation_biens', label: 'La clause d\'évaluation des biens' },
          { key: 'simplification_preuve', label: 'La clause de simplification de la preuve de la consistance des patrimoines des époux' },
          { key: 'exclusion_biens_professionnels', label: 'La clause d\'exclusion des biens professionnels du calcul de la créance de participation' },
          { key: 'plafonnement_creance', label: 'La clause de plafonnement de la créance de participation' },
          { key: 'attribution_preferentielle', label: 'Clause d\'attribution préférentielle' },
          { key: 'partage_inegal_acquets', label: 'Clause de partage inégal des acquêts' },
          { key: 'renonciation', label: 'Clause de renonciation (À regarder)' },
          { key: 'indexation', label: 'Clause d\'indexation (À regarder)' },
          { key: 'prelevement_indemnisation', label: 'La clause de prélèvement moyennant indemnisation (dite « clause commerciale »)' }
        ];
      
      default:
        return [];
    }
  };

  const renderSubClauses = (clauseName: string) => {
    if (clauseName === 'societe_acquets' && clauses[clauseName]?.enabled) {
      return (
        <div className="ml-6 mt-4 space-y-4 border-l-2 border-muted pl-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="partage_inegal_sub"
                checked={clauses['partage_inegal_sub']?.enabled || false}
                onCheckedChange={() => handleClauseToggle('partage_inegal_sub')}
              />
              <Label htmlFor="partage_inegal_sub">
                Clause de partage inégal (% en PP et % en usufruit)
              </Label>
            </div>
            {clauses['partage_inegal_sub']?.enabled && (
              <PercentageInputs
                partPleineProprietee={clauses['partage_inegal_sub']?.partPleineProprietee || 50}
                partUsufruit={clauses['partage_inegal_sub']?.partUsufruit || 50}
                onChange={(pp, usufruit) => handlePercentageChange('partage_inegal_sub', pp, usufruit)}
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="attribution_integrale_sub"
                checked={clauses['attribution_integrale_sub']?.enabled || false}
                onCheckedChange={() => handleClauseToggle('attribution_integrale_sub')}
              />
              <Label htmlFor="attribution_integrale_sub">
                Clause d'attribution intégrale (% en PP et % en usufruit)
              </Label>
            </div>
            {clauses['attribution_integrale_sub']?.enabled && (
              <PercentageInputs
                partPleineProprietee={clauses['attribution_integrale_sub']?.partPleineProprietee || 50}
                partUsufruit={clauses['attribution_integrale_sub']?.partUsufruit || 50}
                onChange={(pp, usufruit) => handlePercentageChange('attribution_integrale_sub', pp, usufruit)}
              />
            )}
          </div>

          {regimeType === 'participation_acquets' && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="preciput_sub"
                  checked={clauses['preciput_sub']?.enabled || false}
                  onCheckedChange={() => handleClauseToggle('preciput_sub')}
                />
                <Label htmlFor="preciput_sub">Clause de préciput</Label>
              </div>
              {clauses['preciput_sub']?.enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAssetSelection('preciput_sub')}
                  className="ml-6"
                >
                  Sélectionner les biens
                  {clauses['preciput_sub']?.selectedAssets?.length > 0 && 
                    ` (${clauses['preciput_sub'].selectedAssets.length} sélectionné${clauses['preciput_sub'].selectedAssets.length > 1 ? 's' : ''})`
                  }
                </Button>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const clausesForRegime = getClausesForRegime();

  return (
    <div className="space-y-6">
      {/* Bouton pour ajouter des clauses */}
      <div>
        <Dialog open={clauseModalOpen} onOpenChange={setClauseModalOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une clause dans le contrat de mariage
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Clauses du contrat de mariage</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {clausesForRegime.map((clause) => (
                <div key={clause.key} className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={clause.key}
                      checked={clauses[clause.key]?.enabled || false}
                      onCheckedChange={() => handleClauseToggle(clause.key)}
                    />
                    <Label htmlFor={clause.key} className="flex-1">
                      {clause.label}
                    </Label>
                  </div>

                  {clauses[clause.key]?.enabled && (
                    <div className="ml-6 space-y-4">
                      {clause.hasAssets && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssetSelection(clause.key)}
                        >
                          Sélectionner les biens
                          {clauses[clause.key]?.selectedAssets?.length > 0 && 
                            ` (${clauses[clause.key].selectedAssets.length} sélectionné${clauses[clause.key].selectedAssets.length > 1 ? 's' : ''})`
                          }
                        </Button>
                      )}

                      {clause.hasOptions && clause.key === 'preciput' && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${clause.key}_pleine_propriete`}
                              checked={clauses[clause.key]?.options?.pleineProprietee || false}
                              onCheckedChange={(checked) => {
                                const newClauses = {
                                  ...clauses,
                                  [clause.key]: {
                                    ...clauses[clause.key],
                                    options: {
                                      ...clauses[clause.key]?.options,
                                      pleineProprietee: checked
                                    }
                                  }
                                };
                                setClauses(newClauses);
                                saveClausesData(newClauses, donation);
                              }}
                            />
                            <Label htmlFor={`${clause.key}_pleine_propriete`}>En pleine propriété</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`${clause.key}_usufruit`}
                              checked={clauses[clause.key]?.options?.usufruit || false}
                              onCheckedChange={(checked) => {
                                const newClauses = {
                                  ...clauses,
                                  [clause.key]: {
                                    ...clauses[clause.key],
                                    options: {
                                      ...clauses[clause.key]?.options,
                                      usufruit: checked
                                    }
                                  }
                                };
                                setClauses(newClauses);
                                saveClausesData(newClauses, donation);
                              }}
                            />
                            <Label htmlFor={`${clause.key}_usufruit`}>En usufruit</Label>
                          </div>
                        </div>
                      )}

                      {clause.hasPercentages && (
                        <PercentageInputs
                          partPleineProprietee={clauses[clause.key]?.partPleineProprietee || 50}
                          partUsufruit={clauses[clause.key]?.partUsufruit || 50}
                          onChange={(pp, usufruit) => handlePercentageChange(clause.key, pp, usufruit)}
                        />
                      )}

                      {clause.hasSubClauses && renderSubClauses(clause.key)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setClauseModalOpen(false)}>
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Donation au dernier vivant */}
      <Card>
        <CardHeader>
          <CardTitle>Donation au dernier vivant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userProfile && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="donation_utilisateur"
                checked={donation.enFaveurUtilisateur}
                onCheckedChange={(checked) => {
                  const newDonation = { ...donation, enFaveurUtilisateur: checked as boolean };
                  setDonation(newDonation);
                  saveClausesData(clauses, newDonation);
                }}
              />
              <Label htmlFor="donation_utilisateur">
                En faveur de : {userProfile.prenom} {userProfile.nom}
              </Label>
            </div>
          )}
          
          {spouseProfile && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="donation_conjoint"
                checked={donation.enFaveurConjoint}
                onCheckedChange={(checked) => {
                  const newDonation = { ...donation, enFaveurConjoint: checked as boolean };
                  setDonation(newDonation);
                  saveClausesData(clauses, newDonation);
                }}
              />
              <Label htmlFor="donation_conjoint">
                En faveur de : {spouseProfile.prenom} {spouseProfile.nom}
              </Label>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de sélection d'actifs */}
      <AssetSelectionModal
        title="Sélectionner les biens"
        isOpen={assetModalOpen}
        onClose={() => setAssetModalOpen(false)}
        onConfirm={handleAssetConfirm}
        preSelectedAssets={clauses[currentAssetModal]?.selectedAssets || []}
      />
    </div>
  );
};