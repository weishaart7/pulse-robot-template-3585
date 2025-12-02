import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PercentageInputsProps {
  partPleineProprietee: number;
  partUsufruit: number;
  onChange: (partPP: number, partUsufruit: number) => void;
  className?: string;
}

export const PercentageInputs: React.FC<PercentageInputsProps> = ({
  partPleineProprietee,
  partUsufruit,
  onChange,
  className
}) => {
  const total = partPleineProprietee + partUsufruit;
  const isValid = total === 100;

  const handlePPChange = (value: string) => {
    const pp = Math.min(100, Math.max(0, parseInt(value) || 0));
    const usufruit = Math.max(0, 100 - pp);
    onChange(pp, usufruit);
  };

  const handleUsufruitChange = (value: string) => {
    const usufruit = Math.min(100, Math.max(0, parseInt(value) || 0));
    const pp = Math.max(0, 100 - usufruit);
    onChange(pp, usufruit);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="part-pp" className="text-xs">
            Part en pleine propriété (%)
          </Label>
          <Input 
            id="part-pp" 
            type="number" 
            min="0" 
            max="100" 
            value={partPleineProprietee} 
            onChange={e => handlePPChange(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="part-usufruit" className="text-xs">
            Part en usufruit (%)
          </Label>
          <Input 
            id="part-usufruit" 
            type="number" 
            min="0" 
            max="100" 
            value={partUsufruit} 
            onChange={e => handleUsufruitChange(e.target.value)}
            className="h-9"
          />
        </div>
      </div>
      
      <div className={cn(
        "text-xs px-2 py-1 rounded",
        isValid ? "text-muted-foreground bg-muted/50" : "text-destructive bg-destructive/10"
      )}>
        Total : {total}%
        {!isValid && <span className="ml-2">(doit être égal à 100%)</span>}
      </div>
    </div>
  );
};
