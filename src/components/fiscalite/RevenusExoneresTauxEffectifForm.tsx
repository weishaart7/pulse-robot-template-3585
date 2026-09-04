import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useRevenusExoneresTauxEffectif } from '@/hooks/useRevenusExoneresTauxEffectif';
import { RevenusExoneresTauxEffectif } from '@/services/revenusExoneresTauxEffectifService';
import { RevenusExoneresTauxEffectifInput } from '@/lib/fiscalite';

const REVENUS_VIDE: RevenusExoneresTauxEffectifInput = {
  case1ac: null,
  case1bc: null,
  case1ge: false,
  case1he: false,
  case1ae: null,
  case1be: null,
  case1ah: null,
  case1bh: null,
  caseRse: null,
  caseRsf: null,
};

interface RevenusExoneresTauxEffectifFormProps {
  onSaved?: (revenus: RevenusExoneresTauxEffectif) => void;
}

export const RevenusExoneresTauxEffectifForm = ({ onSaved }: RevenusExoneresTauxEffectifFormProps) => {
  const { data, loading, saving, saveData } = useRevenusExoneresTauxEffectif();
  const [revenus, setRevenus] = useState<RevenusExoneresTauxEffectifInput>(REVENUS_VIDE);
  const [revenusId, setRevenusId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRevenus(input);
      setRevenusId(id);
    }
  }, [data]);

  const update = <K extends keyof RevenusExoneresTauxEffectifInput>(key: K, value: RevenusExoneresTauxEffectifInput[K]) => {
    setRevenus(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...revenus, id: revenusId });
    setRevenusId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement des salaires et pensions exonérés...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salaires et pensions exonérés retenus pour le calcul du taux effectif</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Salaires et pensions de source étrangère exonérés selon la convention fiscale applicable
          (après déduction de l'impôt étranger), et salaires des détachés à l'étranger exonérés en
          application de l'article 81 A du CGI. Ces montants ne sont pas imposés en France : ils
          servent uniquement à calculer le taux effectif appliqué au reste du revenu.
        </p>

        <div className="hidden lg:grid grid-cols-[1fr_8rem_8rem] gap-4 px-3 text-xs font-medium text-muted-foreground">
          <span />
          <span className="text-center">Déclarant 1</span>
          <span className="text-center">Déclarant 2</span>
        </div>

        <MontantLigne
          label="Salaires"
          code1="1AC" code2="1BC"
          value1={revenus.case1ac} value2={revenus.case1bc}
          onChange1={v => update('case1ac', v)} onChange2={v => update('case1bc', v)}
        />
        <CaseLigne
          label="Marins-pêcheurs exerçant hors des eaux territoriales françaises"
          code1="1GE" code2="1HE"
          checked1={revenus.case1ge} checked2={revenus.case1he}
          onChange1={v => update('case1ge', v)} onChange2={v => update('case1he', v)}
        />
        <MontantLigne
          label="Frais réels"
          aide="Joindre la liste détaillée des frais sur papier libre à la déclaration papier."
          code1="1AE" code2="1BE"
          value1={revenus.case1ae} value2={revenus.case1be}
          onChange1={v => update('case1ae', v)} onChange2={v => update('case1be', v)}
        />
        <MontantLigne
          label="Pensions de source étrangère"
          code1="1AH" code2="1BH"
          value1={revenus.case1ah} value2={revenus.case1bh}
          onChange1={v => update('case1ah', v)} onChange2={v => update('case1bh', v)}
        />
        <TexteLigne
          label="Pays de provenance des revenus de source étrangère"
          code1="RSE" code2="RSF"
          value1={revenus.caseRse} value2={revenus.caseRsf}
          onChange1={v => update('caseRse', v)} onChange2={v => update('caseRsf', v)}
        />

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

interface MontantLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code1: string;
  code2: string;
  value1: number | null;
  value2: number | null;
  onChange1: (value: number | null) => void;
  onChange2: (value: number | null) => void;
}

const MontantLigne = ({ label, extra, aide, code1, code2, value1, value2, onChange1, onChange2 }: MontantLigneProps) => {
  const parse = (raw: string): number | null => (raw === '' ? null : Number(raw));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_8rem_8rem] items-end gap-4 p-3 rounded-lg bg-muted/50">
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">
            {label}
            {extra && <span className="text-muted-foreground font-normal"> ({extra})</span>}
          </Label>
          {aide && <AideTooltip texte={aide} />}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground lg:hidden">Déclarant 1 · {code1}</Label>
        <Label className="text-xs text-muted-foreground hidden lg:block">{code1}</Label>
        <Input
          id={`case-${code1}`}
          type="number"
          className="w-full lg:w-28"
          value={value1 ?? ''}
          onChange={ev => onChange1(parse(ev.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground lg:hidden">Déclarant 2 · {code2}</Label>
        <Label className="text-xs text-muted-foreground hidden lg:block">{code2}</Label>
        <Input
          id={`case-${code2}`}
          type="number"
          className="w-full lg:w-28"
          value={value2 ?? ''}
          onChange={ev => onChange2(parse(ev.target.value))}
        />
      </div>
    </div>
  );
};

interface CaseLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code1: string;
  code2: string;
  checked1: boolean;
  checked2: boolean;
  onChange1: (value: boolean) => void;
  onChange2: (value: boolean) => void;
}

const CaseLigne = ({ label, extra, aide, code1, code2, checked1, checked2, onChange1, onChange2 }: CaseLigneProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_8rem_8rem] items-center gap-4 p-3 rounded-lg bg-muted/50">
    <div className="flex items-center gap-1.5">
      <Label className="text-sm font-normal">
        {label}
        {extra && <span className="text-muted-foreground"> ({extra})</span>}
      </Label>
      {aide && <AideTooltip texte={aide} />}
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id={`case-${code1}`} checked={checked1} onCheckedChange={c => onChange1(!!c)} />
      <Label htmlFor={`case-${code1}`} className="text-xs text-muted-foreground">Déclarant 1 · {code1}</Label>
    </div>
    <div className="flex items-center gap-2">
      <Checkbox id={`case-${code2}`} checked={checked2} onCheckedChange={c => onChange2(!!c)} />
      <Label htmlFor={`case-${code2}`} className="text-xs text-muted-foreground">Déclarant 2 · {code2}</Label>
    </div>
  </div>
);

interface TexteLigneProps {
  label: string;
  code1: string;
  code2: string;
  value1: string | null;
  value2: string | null;
  onChange1: (value: string | null) => void;
  onChange2: (value: string | null) => void;
}

const TexteLigne = ({ label, code1, code2, value1, value2, onChange1, onChange2 }: TexteLigneProps) => {
  const parse = (raw: string): string | null => (raw === '' ? null : raw);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_8rem_8rem] items-end gap-4 p-3 rounded-lg bg-muted/50">
      <div className="space-y-1">
        <Label className="text-sm">{label}</Label>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground lg:hidden">Déclarant 1 · {code1}</Label>
        <Label className="text-xs text-muted-foreground hidden lg:block">{code1}</Label>
        <Input
          id={`case-${code1}`}
          type="text"
          className="w-full"
          value={value1 ?? ''}
          onChange={ev => onChange1(parse(ev.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground lg:hidden">Déclarant 2 · {code2}</Label>
        <Label className="text-xs text-muted-foreground hidden lg:block">{code2}</Label>
        <Input
          id={`case-${code2}`}
          type="text"
          className="w-full"
          value={value2 ?? ''}
          onChange={ev => onChange2(parse(ev.target.value))}
        />
      </div>
    </div>
  );
};

const AideTooltip = ({ texte }: { texte: string }) => (
  <Tooltip>
    <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground">
      <HelpCircle className="h-3.5 w-3.5" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{texte}</TooltipContent>
  </Tooltip>
);

export default RevenusExoneresTauxEffectifForm;
