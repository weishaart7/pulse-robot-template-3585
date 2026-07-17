import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Heart, Info, Check, Handshake } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import './kairos-transmission.css';

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
  const [saving, setSaving] = useState(false);
  const [partageEnvisage, setPartageEnvisage] = useState(false);
  const [savingPartage, setSavingPartage] = useState(false);

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

  // Load saved option from DB
  useEffect(() => {
    if (maritalData && (maritalData as any).option_conjoint) {
      setSelectedOption((maritalData as any).option_conjoint as ConjointOption);
    }
    if (maritalData) {
      setPartageEnvisage(!!maritalData.partage_envisage);
    }
  }, [maritalData]);

  // Save option to DB on change
  const handleOptionChange = async (val: string) => {
    const option = val as ConjointOption;
    setSelectedOption(option);

    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('marital_status')
        .update({ option_conjoint: option } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Enregistré",
        description: "L'option du conjoint survivant a été enregistrée.",
      });
    } catch (error) {
      console.error('Error saving option_conjoint:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'option.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Le droit de partage (2,5% de l'actif net partagé, art. 746 CGI) n'est dû
  // que si un partage est effectivement envisagé — jamais présumé par défaut
  // (cf. transmission/netBreakdown.ts::computeNetPerHeir). Sans effet en cas
  // de démembrement (usufruit/nue-propriété), quel que soit ce réglage.
  const handlePartageEnvisageChange = async (checked: boolean) => {
    setPartageEnvisage(checked);

    if (!user) return;

    try {
      setSavingPartage(true);
      const { error } = await supabase
        .from('marital_status')
        .update({ partage_envisage: checked })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Enregistré",
        description: "L'hypothèse de partage a été enregistrée.",
      });
    } catch (error) {
      console.error('Error saving partage_envisage:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'hypothèse de partage.",
        variant: "destructive",
      });
    } finally {
      setSavingPartage(false);
    }
  };

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
      <div className="kairos-transmission flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ink-900)]" />
      </div>
    );
  }

  const renderNoActionMessage = () => {
    if (scenario === 'no_marriage') {
      return (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-[var(--text-secondary)]">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <p>L'optimisation de l'option du conjoint n'est disponible que pour les personnes mariées. Votre situation actuelle ne nécessite pas ce choix.</p>
            </div>
          </CardContent>
        </Card>
      );
    }
    if (scenario === 'no_children') {
      return (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3 text-[var(--text-secondary)]">
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
    <div className="kairos-transmission space-y-6">
      {/* Option du conjoint survivant */}
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[var(--ink-400)]" />
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Option du conjoint survivant</CardTitle>
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-900)]" />}
            {selectedOption && !saving && <Check className="h-4 w-4 text-[var(--positive)]" />}
          </div>
          <CardDescription className="text-[var(--text-secondary)]">
            Choisissez l'option successorale du conjoint survivant en fonction de votre situation familiale.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-4">
          {/* Situation badges */}
          {scenarioLabels && (
            <div className="flex flex-wrap gap-2 mb-4">
              {scenarioLabels.map((label, i) => (
                <Badge key={i} className="text-xs bg-[var(--ink-050)] text-[var(--ink-700)] border-transparent rounded-[var(--radius-md)]">
                  {label}
                </Badge>
              ))}
              <Badge variant="outline" className="text-xs bg-transparent text-[var(--text-secondary)] border-[var(--border-strong)] rounded-[var(--radius-md)]">
                {enfants.length} enfant{enfants.length > 1 ? 's' : ''}
              </Badge>
            </div>
          )}

          {options.length > 0 ? (
            <RadioGroup
              value={selectedOption}
              onValueChange={handleOptionChange}
              className="space-y-3"
            >
              {options.map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 rounded-[var(--radius-lg)] border border-[var(--border)] p-4 hover:bg-[var(--fill-hover)] transition-colors">
                  <RadioGroupItem value={opt.value} id={opt.value} className="mt-0.5" />
                  <Label htmlFor={opt.value} className="flex-1 cursor-pointer space-y-1">
                    <span className="font-medium text-sm text-[var(--text-primary)]">{opt.label}</span>
                    <p className="text-xs text-[var(--text-secondary)]">{opt.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          ) : (
            renderNoActionMessage()
          )}

          {scenario === 'married_no_ddv_noncommon' && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] border border-[var(--border)]">
              <AlertCircle className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                En présence d'au moins un enfant non commun, le conjoint ne peut recevoir que 1/4 en pleine propriété. L'option en usufruit n'est pas disponible.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hypothèse de partage (droit de partage, art. 746 CGI) */}
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <div className="flex items-center gap-2">
            <Handshake className="h-5 w-5 text-[var(--ink-400)]" />
            <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Partage envisagé</CardTitle>
            {savingPartage && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-900)]" />}
          </div>
          <CardDescription className="text-[var(--text-secondary)]">
            Indiquez si un acte de partage est effectivement envisagé entre les héritiers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <Switch
            checked={partageEnvisage}
            onCheckedChange={handlePartageEnvisageChange}
            label="Partage envisagé"
            description="Déclenche le droit de partage (2,5% de l'actif net partagé, art. 746 CGI). Sans effet en cas de démembrement (usufruit/nue-propriété) : les héritiers peuvent aussi rester en indivision indéfiniment sans jamais le payer."
          />
        </CardContent>
      </Card>
    </div>
  );
};
