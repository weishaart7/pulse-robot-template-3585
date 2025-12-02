import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, FileText, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMatrimonialClauses } from '@/hooks/useMatrimonialClauses';
import { RegimeType } from '@/types/matrimonial';
import { SOCIETE_ACQUETS_SUB_CLAUSES } from '@/constants/matrimonialClauses';
import { AssetSelectionModal } from './matrimonial/AssetSelectionModal';
import { ClauseItem } from './matrimonial/ClauseItem';
import { PercentageInputs } from './matrimonial/PercentageInputs';

interface MatrimonialRegimeOptionsProps {
  regimeType: RegimeType;
  userProfile?: any;
  spouseProfile?: any;
}

export const MatrimonialRegimeOptions: React.FC<MatrimonialRegimeOptionsProps> = ({
  regimeType,
  userProfile,
  spouseProfile
}) => {
  const {
    clauses,
    donation,
    isSaving,
    toggleClause,
    updateClauseAssets,
    updateClausePercentages,
    updateClauseOptions,
    getClausesForRegime,
    analyzeForTransmission
  } = useMatrimonialClauses(regimeType);

  const [clauseModalOpen, setClauseModalOpen] = useState(false);
  const [assetModalOpen, setAssetModalOpen] = useState(false);
  const [currentAssetClause, setCurrentAssetClause] = useState<string>('');

  const clausesForRegime = getClausesForRegime(regimeType);
  const enabledClausesCount = Object.values(clauses).filter(c => c?.enabled).length;
  
  // Analyse pour afficher l'impact
  const transmissionAnalysis = analyzeForTransmission();

  const handleAssetSelect = (clauseName: string) => {
    setCurrentAssetClause(clauseName);
    setAssetModalOpen(true);
  };

  const handleAssetConfirm = (selectedAssets: string[]) => {
    updateClauseAssets(currentAssetClause, selectedAssets);
  };

  const renderSubClauses = (clauseName: string) => {
    if (clauseName !== 'societe_acquets' || !clauses[clauseName]?.enabled) return null;

    const subClauses = regimeType === 'participation_acquets' 
      ? SOCIETE_ACQUETS_SUB_CLAUSES 
      : SOCIETE_ACQUETS_SUB_CLAUSES.filter(c => c.key !== 'preciput_sub');

    return (
      <div className="mt-3 space-y-3 border-l-2 border-primary/20 pl-4">
        <p className="text-xs text-muted-foreground font-medium">Sous-clauses de la société d'acquêts :</p>
        {subClauses.map(subClause => (
          <div key={subClause.key} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id={subClause.key} 
                checked={clauses[subClause.key]?.enabled || false}
                onCheckedChange={() => toggleClause(subClause.key)}
              />
              <Label htmlFor={subClause.key} className="text-sm cursor-pointer">
                {subClause.label}
              </Label>
            </div>
            
            {clauses[subClause.key]?.enabled && (
              <div className="ml-6">
                {subClause.hasPercentages && (
                  <PercentageInputs 
                    partPleineProprietee={clauses[subClause.key]?.partPleineProprietee || 50}
                    partUsufruit={clauses[subClause.key]?.partUsufruit || 50}
                    onChange={(pp, usufruit) => updateClausePercentages(subClause.key, pp, usufruit)}
                  />
                )}
                {subClause.hasAssets && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleAssetSelect(subClause.key)}
                    className="text-xs mt-2"
                  >
                    Sélectionner les biens
                    {clauses[subClause.key]?.selectedAssets?.length ? 
                      ` (${clauses[subClause.key].selectedAssets!.length})` : ''}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Résumé des clauses actives */}
      {enabledClausesCount > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {enabledClausesCount} clause{enabledClausesCount > 1 ? 's' : ''} active{enabledClausesCount > 1 ? 's' : ''}
            </span>
          </div>
          
          {transmissionAnalysis.totalExcluSuccession > 0 && (
            <div className="flex items-start gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-400">Impact sur la transmission</p>
                <p className="text-amber-600 dark:text-amber-500">
                  {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                    .format(transmissionAnalysis.totalExcluSuccession)} seront exclus de la succession
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bouton pour ouvrir le modal des clauses */}
      <Dialog open={clauseModalOpen} onOpenChange={setClauseModalOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {enabledClausesCount > 0 ? 'Modifier les clauses du contrat' : 'Ajouter une clause au contrat'}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Clauses du contrat de mariage</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-4">
              {clausesForRegime.map(clause => (
                <ClauseItem
                  key={clause.key}
                  clause={clause}
                  state={clauses[clause.key]}
                  onToggle={() => toggleClause(clause.key)}
                  onAssetSelect={() => handleAssetSelect(clause.key)}
                  onPercentageChange={(pp, usufruit) => updateClausePercentages(clause.key, pp, usufruit)}
                  onOptionsChange={(options) => updateClauseOptions(clause.key, options)}
                  renderSubClauses={clause.hasSubClauses ? () => renderSubClauses(clause.key) : undefined}
                />
              ))}
            </div>
          </ScrollArea>
          
          <div className="flex justify-between items-center pt-4 border-t">
            <span className="text-xs text-muted-foreground">
              {isSaving ? 'Sauvegarde...' : 'Les modifications sont sauvegardées automatiquement'}
            </span>
            <Button onClick={() => setClauseModalOpen(false)}>
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de sélection d'actifs */}
      <AssetSelectionModal 
        title="Sélectionner les biens" 
        isOpen={assetModalOpen} 
        onClose={() => setAssetModalOpen(false)} 
        onConfirm={handleAssetConfirm} 
        preSelectedAssets={clauses[currentAssetClause]?.selectedAssets || []} 
      />
    </div>
  );
};
