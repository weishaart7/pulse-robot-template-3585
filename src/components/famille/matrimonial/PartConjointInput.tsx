import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PartConjointInputProps {
  partPleineProprietee: number;
  onChange: (partPP: number) => void;
  className?: string;
}

export const PartConjointInput: React.FC<PartConjointInputProps> = ({
  partPleineProprietee,
  onChange,
  className
}) => {
  const handleChange = (value: string) => {
    onChange(Math.min(100, Math.max(0, parseInt(value) || 0)));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor="part-conjoint" className="text-xs">
        Part attribuée au conjoint (%)
      </Label>
      <Input
        id="part-conjoint"
        type="number"
        min="0"
        max="100"
        value={partPleineProprietee}
        onChange={e => handleChange(e.target.value)}
        className="h-9 max-w-[140px]"
      />
    </div>
  );
};
