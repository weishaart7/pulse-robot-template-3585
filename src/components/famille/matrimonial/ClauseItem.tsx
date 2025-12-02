import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClauseDefinition, ClauseState } from '@/types/matrimonial';
import { PercentageInputs } from './PercentageInputs';

interface ClauseItemProps {
  clause: ClauseDefinition;
  state: ClauseState | undefined;
  onToggle: () => void;
  onAssetSelect: () => void;
  onPercentageChange: (partPP: number, partUsufruit: number) => void;
  onOptionsChange: (options: any) => void;
  renderSubClauses?: () => React.ReactNode;
}

export const ClauseItem: React.FC<ClauseItemProps> = ({
  clause,
  state,
  onToggle,
  onAssetSelect,
  onPercentageChange,
  onOptionsChange,
  renderSubClauses
}) => {
  const isEnabled = state?.enabled || false;
  const selectedAssetsCount = state?.selectedAssets?.length || 0;

  return (
    <div className="space-y-3">
      <div className="flex items-start space-x-3">
        <Checkbox 
          id={clause.key} 
          checked={isEnabled}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Label htmlFor={clause.key} className="cursor-pointer leading-tight">
              {clause.label}
            </Label>
            {clause.description && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="text-sm">{clause.description}</p>
                    {clause.impactTransmission && clause.impactTransmission !== 'neutre' && (
                      <p className="text-xs text-primary mt-1">
                        Impact transmission : {
                          clause.impactTransmission === 'exclut_succession' ? 'Exclus de la succession' :
                          clause.impactTransmission === 'avantage_matrimonial' ? 'Avantage matrimonial' :
                          clause.impactTransmission === 'reduit_masse' ? 'Réduit la masse successorale' : ''
                        }
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {clause.impactTransmission && clause.impactTransmission !== 'neutre' && (
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${
              clause.impactTransmission === 'exclut_succession' ? 'bg-amber-100 text-amber-700' :
              clause.impactTransmission === 'avantage_matrimonial' ? 'bg-blue-100 text-blue-700' :
              'bg-muted text-muted-foreground'
            }`}>
              {clause.impactTransmission === 'exclut_succession' ? 'Impact fiscal' :
               clause.impactTransmission === 'avantage_matrimonial' ? 'Avantage matrimonial' : ''}
            </span>
          )}
        </div>
      </div>

      {isEnabled && (
        <div className="ml-7 space-y-3 pb-2">
          {clause.hasAssets && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAssetSelect}
              className="text-xs"
            >
              Sélectionner les biens
              {selectedAssetsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-primary/10 text-primary rounded-full text-[10px]">
                  {selectedAssetsCount}
                </span>
              )}
            </Button>
          )}

          {clause.hasOptions && clause.key === 'preciput' && (
            <div className="space-y-2 p-2 bg-muted/30 rounded-md">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`${clause.key}_pleine_propriete`} 
                  checked={state?.options?.pleineProprietee || false}
                  onCheckedChange={(checked) => onOptionsChange({ pleineProprietee: checked })}
                />
                <Label htmlFor={`${clause.key}_pleine_propriete`} className="text-sm cursor-pointer">
                  En pleine propriété
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id={`${clause.key}_usufruit`} 
                  checked={state?.options?.usufruit || false}
                  onCheckedChange={(checked) => onOptionsChange({ usufruit: checked })}
                />
                <Label htmlFor={`${clause.key}_usufruit`} className="text-sm cursor-pointer">
                  En usufruit
                </Label>
              </div>
            </div>
          )}

          {clause.hasPercentages && (
            <PercentageInputs 
              partPleineProprietee={state?.partPleineProprietee || 50}
              partUsufruit={state?.partUsufruit || 50}
              onChange={onPercentageChange}
            />
          )}

          {clause.hasSubClauses && renderSubClauses?.()}
        </div>
      )}
    </div>
  );
};
