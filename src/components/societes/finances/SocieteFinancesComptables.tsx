import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, TrendingUp, Wallet, PiggyBank, Building2, Calendar } from 'lucide-react';

interface SocieteFormData {
  chiffre_affaires?: number;
  resultat_net?: number;
  tresorerie_disponible?: number;
  compte_courant_associes?: number;
  reserves?: number;
  date_dernier_bilan?: string;
}

interface SocieteFinancesComptablesProps {
  formData: SocieteFormData;
  onFieldChange: (field: keyof SocieteFormData, value: any) => void;
}

const numericFields = ['chiffre_affaires', 'resultat_net', 'tresorerie_disponible', 'compte_courant_associes', 'reserves'] as const;

export const SocieteFinancesComptables: React.FC<SocieteFinancesComptablesProps> = ({
  formData,
  onFieldChange,
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Initialize local state from formData
  useEffect(() => {
    const values: Record<string, string> = {};
    numericFields.forEach(field => {
      values[field] = formData[field]?.toString() ?? '';
    });
    setInputValues(values);
  }, [formData.chiffre_affaires, formData.resultat_net, formData.tresorerie_disponible, formData.compte_courant_associes, formData.reserves]);

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleNumberChange = (field: keyof SocieteFormData, value: string) => {
    // Always update local display immediately
    setInputValues(prev => ({ ...prev, [field]: value }));
    
    // Only propagate valid numbers to parent
    const sanitized = value.replace(',', '.');
    const numValue = parseFloat(sanitized);
    
    if (!isNaN(numValue)) {
      onFieldChange(field, numValue);
    } else if (value === '') {
      onFieldChange(field, undefined);
    }
    // For '-' or other partial inputs, don't propagate yet
  };

  const handleBlur = (field: keyof SocieteFormData) => {
    const value = inputValues[field] || '';
    const sanitized = value.replace(',', '.');
    const numValue = parseFloat(sanitized);
    
    if (isNaN(numValue) || value === '-') {
      // Reset to formData value or empty
      setInputValues(prev => ({ ...prev, [field]: formData[field]?.toString() ?? '' }));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Données comptables
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Chiffre d'affaires */}
          <div className="space-y-2">
            <Label htmlFor="chiffre_affaires" className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Chiffre d'affaires annuel
            </Label>
            <div className="relative">
              <Input
                id="chiffre_affaires"
                type="text"
                placeholder="0"
                value={inputValues.chiffre_affaires ?? ''}
                onChange={(e) => handleNumberChange('chiffre_affaires', e.target.value)}
                onBlur={() => handleBlur('chiffre_affaires')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>

          {/* Résultat net */}
          <div className="space-y-2">
            <Label htmlFor="resultat_net" className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Résultat net
            </Label>
            <div className="relative">
              <Input
                id="resultat_net"
                type="text"
                placeholder="0"
                value={inputValues.resultat_net ?? ''}
                onChange={(e) => handleNumberChange('resultat_net', e.target.value)}
                onBlur={() => handleBlur('resultat_net')}
                className={`pr-8 ${formData.resultat_net !== undefined && formData.resultat_net !== null && formData.resultat_net < 0 ? 'border-destructive focus-visible:ring-destructive' : ''}`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>

          {/* Trésorerie */}
          <div className="space-y-2">
            <Label htmlFor="tresorerie_disponible" className="flex items-center gap-2 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Trésorerie disponible
            </Label>
            <div className="relative">
              <Input
                id="tresorerie_disponible"
                type="text"
                placeholder="0"
                value={inputValues.tresorerie_disponible ?? ''}
                onChange={(e) => handleNumberChange('tresorerie_disponible', e.target.value)}
                onBlur={() => handleBlur('tresorerie_disponible')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>

          {/* Compte courant associés */}
          <div className="space-y-2">
            <Label htmlFor="compte_courant_associes" className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Compte courant d'associés
            </Label>
            <div className="relative">
              <Input
                id="compte_courant_associes"
                type="text"
                placeholder="0"
                value={inputValues.compte_courant_associes ?? ''}
                onChange={(e) => handleNumberChange('compte_courant_associes', e.target.value)}
                onBlur={() => handleBlur('compte_courant_associes')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>

          {/* Réserves */}
          <div className="space-y-2">
            <Label htmlFor="reserves" className="flex items-center gap-2 text-sm">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              Réserves
            </Label>
            <div className="relative">
              <Input
                id="reserves"
                type="text"
                placeholder="0"
                value={inputValues.reserves ?? ''}
                onChange={(e) => handleNumberChange('reserves', e.target.value)}
                onBlur={() => handleBlur('reserves')}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
            </div>
          </div>

          {/* Date dernier bilan */}
          <div className="space-y-2">
            <Label htmlFor="date_dernier_bilan" className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Date dernier bilan
            </Label>
            <Input
              id="date_dernier_bilan"
              type="date"
              value={formData.date_dernier_bilan || ''}
              onChange={(e) => onFieldChange('date_dernier_bilan', e.target.value)}
            />
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">CA Annuel</p>
            <p className="text-sm font-semibold">{formatCurrency(formData.chiffre_affaires)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Résultat</p>
            <p className={`text-sm font-semibold ${(formData.resultat_net || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(formData.resultat_net)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Trésorerie</p>
            <p className="text-sm font-semibold">{formatCurrency(formData.tresorerie_disponible)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">CCA</p>
            <p className="text-sm font-semibold">{formatCurrency(formData.compte_courant_associes)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
