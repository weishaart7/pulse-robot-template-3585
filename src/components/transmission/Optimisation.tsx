import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Heart, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';

type ConjointOption = 
  | 'usufruit_total'
  | 'quart_pp'
  | 'quart_pp_3quarts_us'
  | 'qd_pp';

interface OptionChoice {
  value: ConjointOption;
  label: string;
  description: string;
}

export const Optimisation = () => {
  const { user } = useAuth();
  const { data: maritalData, loading: loadingMarital } = useMaritalStatus();
  const { data: familyLinks, loading: loadingFamily } = useFamilyLinks();
  const [selectedOption, setSelectedOption] = useState<ConjointOption | ''>('');

  const loading = loadingMarital || loadingFamily;

  // Determine situation
  const isMarried = maritalData?.statut_couple?.toLowerCase().includes('marié') || maritalData?.statut_couple?.toLowerCase() === 'marie';
  const hasDDV = !!maritalData?.donation_dernier_vivant_personne || !!maritalData?.donation_dernier_vivant_conjoint;

  const enfants = (familyLinks || []).filter(l => l.lien_familial.toLowerCase() === 'enfant');
  const hasChildren = enfants.length > 0;

  const allCommon = hasChildren && enfants.every(e => 
    !e.branche_familiale || e.branche_familiale === 'commune'
  );
  const hasNonCommon = hasChildren && !allCommon;

  // Determine which scenario applies
  const getScenario = (): 'no_marriage' | 'no_children' | 'married_no_ddv_common' | 'married_no_ddv_noncommon' | 'married_ddv' | null => {
    if (!isMarried) return 'no_marriage';
    if (!hasChildren) return 'no_children';
    if (!hasDDV && allCommon) return 'married_no_ddv_common';
    if (!hasDDV && hasNonCommon) return 'married_no_ddv_noncommon';
    if (hasDDV) return 'married_ddv';
    return null;
  };

  const scenario = getScenario();

  const getOptions = (): OptionChoice[] => {
    const nbEnfants = enfants.length;

    switch (scenario) {
      case 'married_no_ddv_common':
        return [
          { value: 'usufruit_total', label: '100% en usufruit', description: 'Le conjoint reçoit l\'usufruit de la totalité de la succession. Les enfants reçoivent la nue-propriété.' },
          { value: 'quart_pp', label: '1/4 en pleine propriété', description: 'Le conjoint reçoit 1/4 en pleine propriété. Les enfants se partagent les 3/4 restants.' },
        ];
      case 'married_no_ddv_noncommon':
        return [
          { value: 'quart_pp', label: '1/4 en pleine propriété', description: 'Seul choix possible en présence d\'enfants non communs. Le conjoint reçoit 1/4 en pleine propriété.' },
        ];
      case 'married_ddv': {
        const qdLabel = nbEnfants === 1
          ? '1/2 en pleine propriété (quotité disponible)'
          : nbEnfants === 2
            ? '1/3 en pleine propriété (quotité disponible)'
            : '1/4 en pleine propriété (quotité disponible)';
        const qdFraction = nbEnfants === 1 ? '1/2' : nbEnfants === 2 ? '1/3' : '1/4';
        return [
          { value: 'usufruit_total', label: '100% en usufruit', description: 'Le conjoint reçoit l\'usufruit de la totalité de la succession.' },
          { value: 'quart_pp_3quarts_us', label: '1/4 pleine propriété + 3/4 en usufruit', description: 'Le conjoint reçoit 1/4 en pleine propriété et 3/4 en usufruit.' },
          { value: 'qd_pp', label: qdLabel, description: `Le conjoint reçoit ${qdFraction} de la succession en pleine propriété, correspondant à la quotité disponible.` },
        ];
      }
      default:
        return [];
    }
  };

  const options = getOptions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const renderNoActionMessage = () => {
    if (scenario === 'no_marriage') {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-muted-foreground">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <p>L'optimisation de l'option du conjoint n'est disponible que pour les personnes mariées. Votre situation actuelle ne nécessite pas ce choix.</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (scenario === 'no_children') {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-muted-foreground">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <p>En l'absence d'enfants, le choix de l'option du conjoint ne s'applique pas. Le conjoint hérite selon les règles légales en fonction des ascendants vivants.</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    return null;
  };

  const getScenarioLabel = () => {
    if (!isMarried) return null;
    const parts: string[] = ['Marié(e)'];
    if (hasDDV) parts.push('Donation au dernier vivant');
    else parts.push('Sans donation au dernier vivant');
    if (allCommon) parts.push('Enfants communs');
    else if (hasNonCommon) parts.push('Enfant(s) non commun(s)');
    return parts;
  };

  const scenarioLabels = getScenarioLabel();

  return (
    <div className="space-y-6">
      {/* Option du conjoint survivant */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Option du conjoint survivant</CardTitle>
          </div>
          <CardDescription>
            Choisissez l'option successorale du conjoint survivant en fonction de votre situation familiale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Situation badges */}
          {scenarioLabels && (
            <div className="flex flex-wrap gap-2 mb-4">
              {scenarioLabels.map((label, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {label}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs">
                {enfants.length} enfant{enfants.length > 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {options.length > 0 ? (
            <RadioGroup
              value={selectedOption}
              onValueChange={(val) => setSelectedOption(val as ConjointOption)}
              className="space-y-3"
            >
              {options.map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <Label htmlFor={opt.value} className="flex-1 cursor-pointer space-y-1">
                    <span className="font-medium text-sm">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            renderNoActionMessage()
          )}

          {scenario === 'married_no_ddv_noncommon' && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-muted/50 border border-border">
              <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                En présence d'au moins un enfant non commun, le conjoint ne peut recevoir que 1/4 en pleine propriété. L'option en usufruit n'est pas disponible.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
