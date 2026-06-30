import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIFIPassifsDeductions } from '@/hooks/useIFI';
import { IFI_PASSIF_CATEGORIES } from '@/lib/ifi';

interface AjouterPassifFormProps {
  onClose: () => void;
  onPassifAdded?: () => void;
}

export const AjouterPassifForm = ({ onClose, onPassifAdded }: AjouterPassifFormProps) => {
  const { createPassif } = useIFIPassifsDeductions();
  const [categorie, setCategorie] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    designation: '',
    dateDette: undefined as Date | undefined,
    nomCreancier: '',
    montantRestantDu: '',
    detteDeductible: '',
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'montantRestantDu' && { detteDeductible: value })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    try {
      await createPassif({
        type_passif: categorie,
        designation: formData.designation,
        montant: formData.detteDeductible ? parseFloat(formData.detteDeductible) : null,
        date_creation: formData.dateDette ? formData.dateDette.toISOString().split('T')[0] : null,
        commentaire: formData.nomCreancier || null,
      });

      onPassifAdded?.();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoriesOptions = IFI_PASSIF_CATEGORIES;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="categorie">Catégorie</Label>
        <Select value={categorie} onValueChange={setCategorie}>
          <SelectTrigger>
            <SelectValue placeholder="Sélectionner une catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categoriesOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {categorie && (
        <Card>
          <CardHeader>
            <CardTitle>{categoriesOptions.find(c => c.value === categorie)?.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="designation">Désignation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => handleInputChange('designation', e.target.value)}
                placeholder="Libellé du passif"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de la dette</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dateDette && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateDette ? format(formData.dateDette, "dd/MM/yyyy") : "Sélectionner une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.dateDette}
                      onSelect={(date) => handleInputChange('dateDette', date)}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="nomCreancier">Nom du créancier</Label>
                <Input
                  id="nomCreancier"
                  value={formData.nomCreancier}
                  onChange={(e) => handleInputChange('nomCreancier', e.target.value)}
                  placeholder="Nom du créancier"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="montantRestantDu">Montant restant dû au 1er janvier 2025 (€)</Label>
                <Input
                  id="montantRestantDu"
                  type="number"
                  value={formData.montantRestantDu}
                  onChange={(e) => handleInputChange('montantRestantDu', e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="detteDeductible">Soit une dette déductible de (€)</Label>
                <Input
                  id="detteDeductible"
                  type="number"
                  value={formData.detteDeductible}
                  onChange={(e) => handleInputChange('detteDeductible', e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {categorie && (
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            Ajouter le passif
          </Button>
        </div>
      )}
    </form>
  );
};