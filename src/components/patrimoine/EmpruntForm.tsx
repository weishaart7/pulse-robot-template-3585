import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMPRUNT_NATURES } from '@/constants/assetTypes';
import { ArrowLeft } from 'lucide-react';

interface EmpruntFormProps {
  onCancel: () => void;
  onSubmit: () => void;
}

export const EmpruntForm = ({ onCancel, onSubmit }: EmpruntFormProps) => {
  const [nature, setNature] = useState('');
  const [libelle, setLibelle] = useState('');
  const [capitalRestantDu, setCapitalRestantDu] = useState('');
  const [interets, setInterets] = useState('');
  const [mensualites, setMensualites] = useState('');
  const [dureeRestante, setDureeRestante] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement emprunt creation logic
    console.log('Emprunt data:', {
      nature,
      libelle,
      capitalRestantDu,
      interets,
      mensualites,
      dureeRestante
    });
    onSubmit();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>Ajouter un emprunt</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nature">Nature de l'emprunt</Label>
            <Select value={nature} onValueChange={setNature} required>
              <SelectTrigger>
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
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit" disabled={!nature}>
              Ajouter l'emprunt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};