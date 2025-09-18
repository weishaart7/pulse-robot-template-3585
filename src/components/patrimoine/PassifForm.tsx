import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PASSIF_NATURES } from '@/constants/assetTypes';
import { ArrowLeft } from 'lucide-react';
import { usePassifs } from '@/hooks/usePassifs';

interface PassifFormProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export const PassifForm = ({ onCancel, onSubmit }: PassifFormProps) => {
  const [nature, setNature] = useState('');
  const [montantDu, setMontantDu] = useState('');
  const { createPassif } = usePassifs();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPassif({
        nature,
        montant_du: parseFloat(montantDu)
      });
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