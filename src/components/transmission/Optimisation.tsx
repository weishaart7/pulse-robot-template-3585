import React, { useState, useEffect, useMemo } from 'react';
import { PanelCard, PanelCardContent, PanelCardHeader, PanelCardTitle } from '@/components/layout/panel-section';
import { Chip } from '@/components/layout/workspace-panel';
import { FieldHelp } from '@/components/ui/field-help';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { AlertCircle, Info, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { hasDDVConsentieParDefunt } from '@/utils/transmissionHelpers';
import { ComparaisonOptionsConjoint } from './ComparaisonOptionsConjoint';
import './kairos-transmission.css';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  // Valeur nette des biens existants au jour du partage (art. 860) : vide =
  // valeurs du décès simulé.
  const [valeurBiensPartage, setValeurBiensPartage] = useState<string>('');
  const [duhOpte, setDuhOpte] = useState(false);
  const [savingDuh, setSavingDuh] = useState(false);

  const loading = loadingMarital || loadingFamily;

  // Determine situation
  const isMarried = maritalData?.statut_couple?.toLowerCase().includes('marié') || maritalData?.statut_couple?.toLowerCase() === 'marie';
  // Simulation du décès de l'Utilisateur : seule la DDV qu'il a consentie joue.
  const hasDDV = hasDDVConsentieParDefunt(maritalData, 'user');

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
      const vbp = (maritalData as { valeur_biens_partage?: number | null }).valeur_biens_partage;
      setValeurBiensPartage(vbp != null ? String(vbp) : '');
      setDuhOpte(!!(maritalData as any).duh_opte);
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
      if (import.meta.env.DEV) {
        console.error('Error saving option_conjoint:', error);
      }
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
      if (import.meta.env.DEV) {
        console.error('Error saving partage_envisage:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'hypothèse de partage.",
        variant: "destructive",
      });
    } finally {
      setSavingPartage(false);
    }
  };

  const handleValeurBiensPartageSave = async () => {
    if (!user) return;
    const valeur = valeurBiensPartage.trim() === '' ? null : Number(valeurBiensPartage);
    if (valeur !== null && (Number.isNaN(valeur) || valeur < 0)) {
      toast({ title: "Erreur", description: "Saisissez un montant positif ou laissez vide.", variant: "destructive" });
      return;
    }
    try {
      setSavingPartage(true);
      const { error } = await supabase
        .from('marital_status')
        .update({ valeur_biens_partage: valeur })
        .eq('user_id', user.id);
      if (error) throw error;
      toast({ title: "Enregistré", description: "La valeur des biens au jour du partage a été enregistrée." });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving valeur_biens_partage:', error);
      }
      toast({ title: "Erreur", description: "Impossible d'enregistrer la valeur au partage.", variant: "destructive" });
    } finally {
      setSavingPartage(false);
    }
  };

  // Droit d'usage et d'habitation (DUH, C. civ. art. 764-766, référentiel
  // §5.9) : option successorale distincte du droit de jouissance temporaire
  // (art. 763, effet direct du mariage, non successoral, jamais affiché ici
  // — cf. index.ts §6ter). Optionnel, 1 an pour se manifester, jamais tacite
  // : sans ce booléen explicite, aucune valeur n'est imputée sur la part du
  // conjoint (cf. lib/transmission/index.ts, bloc "5.9bis").
  const handleDuhOpteChange = async (checked: boolean) => {
    setDuhOpte(checked);

    if (!user) return;

    try {
      setSavingDuh(true);
      const { error } = await supabase
        .from('marital_status')
        .update({ duh_opte: checked } as any)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Enregistré",
        description: "L'option du droit d'usage et d'habitation a été enregistrée.",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error saving duh_opte:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer l'option.",
        variant: "destructive",
      });
    } finally {
      setSavingDuh(false);
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

  const options = useMemo(getOptions, [scenario, enfants.length]);

  if (loading) {
    return (
      <div className="kairos-transmission">
        <LoadingSpinner text="" />
      </div>
    );
  }

  const renderNoActionMessage = () => {
    if (scenario === 'no_marriage') {
      return (
        <div className="flex items-start gap-3 text-[var(--text-secondary)]">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <p>L'optimisation de l'option du conjoint n'est disponible que pour les personnes mariées. Votre situation actuelle ne nécessite pas ce choix.</p>
            </div>
      );
    }
    if (scenario === 'no_children') {
      return (
        <div className="flex items-start gap-3 text-[var(--text-secondary)]">
              <Info className="h-5 w-5 mt-0.5 shrink-0" />
              <p>En l'absence d'enfants, le choix de l'option du conjoint ne s'applique pas. Le conjoint hérite selon les règles légales en fonction des ascendants vivants.</p>
            </div>
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
    <div className="kairos-transmission [&>[role=alert]]:mx-8 [&>[role=alert]]:my-4 [&>[role=alert]]:w-auto [&>[role=alert]]:rounded-[2px]">
      {/* Option du conjoint survivant */}
      <PanelCard>
        <PanelCardHeader>
          <div className="flex items-center gap-2">
            <PanelCardTitle>Option du conjoint survivant</PanelCardTitle>
            {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-900)]" />}
            {selectedOption && !saving && <Check className="h-4 w-4 text-[var(--kt-positive)]" />}
          </div>
        </PanelCardHeader>
        <PanelCardContent>
          {/* Situation badges */}
          {scenarioLabels && (
            <div className="flex flex-wrap gap-2 mb-4">
              {scenarioLabels.map((label, i) => (
                <Chip key={i}>{label}</Chip>
              ))}
              <Chip tone="lagon">{enfants.length} enfant{enfants.length > 1 ? 's' : ''}</Chip>
            </div>
          )}

          {options.length > 0 ? (
            <RadioGroup
              value={selectedOption}
              onValueChange={handleOptionChange}
              className="space-y-3"
            >
              {options.map((opt) => (
                <div key={opt.value} className="flex items-start space-x-3 rounded-[var(--radius-lg)] border border-[var(--kt-border)] p-4 hover:bg-[var(--fill-hover)] transition-colors">
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
            <div className="flex items-start gap-2 mt-3 p-3 rounded-[var(--radius-md)] bg-[var(--surface-sunken)] border border-[var(--kt-border)]">
              <AlertCircle className="h-4 w-4 text-[var(--text-secondary)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                En présence d'au moins un enfant non commun, le conjoint ne peut recevoir que 1/4 en pleine propriété. L'option en usufruit n'est pas disponible.
              </p>
            </div>
          )}
        </PanelCardContent>
      </PanelCard>

      <ComparaisonOptionsConjoint options={options} selectedOption={selectedOption} />

      {/* Droit d'usage et d'habitation (DUH, C. civ. art. 764-766) */}
      {isMarried && (
        <PanelCard>
          <PanelCardHeader>
            <div className="flex items-center gap-2">
              <PanelCardTitle>
                Droit d'usage et d'habitation
                <FieldHelp>
                  Option du conjoint survivant sur le logement (C. civ. art. 764-766), distincte du droit de
                  jouissance temporaire d'un an : à exercer dans le délai légal d'un an, jamais tacite. La valeur
                  retenue (60 % de la valeur d'usufruit du logement, barème art. 669 CGI) s'impute sur la part
                  successorale du conjoint plutôt que de s'y ajouter.
                </FieldHelp>
              </PanelCardTitle>
              {savingDuh && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-900)]" />}
            </div>
          </PanelCardHeader>
          <PanelCardContent>
            <Switch
              checked={duhOpte}
              onCheckedChange={handleDuhOpteChange}
              label="Droit d'usage et d'habitation opté"
            />
          </PanelCardContent>
        </PanelCard>
      )}

      {/* Hypothèse de partage (droit de partage, art. 746 CGI) */}
      <PanelCard>
        <PanelCardHeader>
          <div className="flex items-center gap-2">
            <PanelCardTitle>
              Partage envisagé
              <FieldHelp>
                Acte de partage effectivement envisagé entre les héritiers : déclenche le droit de partage (2,5 %
                de l'actif net partagé, art. 746 CGI). Sans effet en cas de démembrement (usufruit/nue-propriété) ;
                les héritiers peuvent aussi rester en indivision indéfiniment sans jamais le payer.
              </FieldHelp>
            </PanelCardTitle>
            {savingPartage && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--ink-900)]" />}
          </div>
        </PanelCardHeader>
        <PanelCardContent>
          <Switch
            checked={partageEnvisage}
            onCheckedChange={handlePartageEnvisageChange}
            label="Partage envisagé"
          />
          <div className="mt-4">
            <Label htmlFor="valeurBiensPartage" className="flex items-center gap-1 text-sm">
              Valeur nette des biens existants au jour du partage (optionnel)
              <FieldHelp>
                Le partage se fait aux valeurs du jour du partage (C. civ. art. 860) : renseignez la valeur
                nette (actif − passif) des biens de la succession à cette date. Les rapports et indemnités de
                réduction se renseignent sur chaque donation. Vide : valeurs au jour du décès. La réserve,
                la réduction et les droits de succession restent calculés au décès.
              </FieldHelp>
            </Label>
            <Input
              id="valeurBiensPartage"
              type="number"
              min="0"
              value={valeurBiensPartage}
              onChange={(e) => setValeurBiensPartage(e.target.value)}
              onBlur={handleValeurBiensPartageSave}
              placeholder="Valeur au décès"
              className="mt-1 max-w-xs"
            />
          </div>
        </PanelCardContent>
      </PanelCard>
    </div>
  );
};
