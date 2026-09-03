import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useRevenusSalaires } from '@/hooks/useRevenusSalaires';
import { RevenusSalaires } from '@/services/revenusSalairesService';
import { RevenusSalairesInput } from '@/lib/fiscalite';

const REVENUS_VIDE: RevenusSalairesInput = {
  case1aj: null,
  case1bj: null,
  case1aa: null,
  case1ba: null,
  case1ga: null,
  case1ha: null,
  case1gh: null,
  case1hh: null,
  case1pb: null,
  case1pc: null,
  case1ad: null,
  case1bd: null,
  case1av: false,
  case1bv: false,
  case1gb: null,
  case1hb: null,
  case1gk: false,
  case1gl: false,
  case1gf: null,
  case1hf: null,
  case1gg: null,
  case1hg: null,
  case1ap: null,
  case1bp: null,
  case1af: null,
  case1bf: null,
  case1ag: null,
  case1bg: null,
};

interface RevenusSalairesFormProps {
  onSaved?: (revenus: RevenusSalaires) => void;
}

export const RevenusSalairesForm = ({ onSaved }: RevenusSalairesFormProps) => {
  const { data, loading, saving, saveData } = useRevenusSalaires();
  const [revenus, setRevenus] = useState<RevenusSalairesInput>(REVENUS_VIDE);
  const [revenusId, setRevenusId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRevenus(input);
      setRevenusId(id);
    }
  }, [data]);

  const update = <K extends keyof RevenusSalairesInput>(key: K, value: RevenusSalairesInput[K]) => {
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
          Chargement des revenus de salaires...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Traitements et salaires</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <MontantLigne
          label="Traitements et salaires"
          extra="salaire net imposable"
          code1="1AJ" code2="1BJ"
          value1={revenus.case1aj} value2={revenus.case1bj}
          onChange1={v => update('case1aj', v)} onChange2={v => update('case1bj', v)}
        />
        <MontantLigne
          label="Revenus des salariés des particuliers employeurs"
          aide="Salaire versé par un particulier employeur : nounou, aide ménagère, jardinier, etc."
          code1="1AA" code2="1BA"
          value1={revenus.case1aa} value2={revenus.case1ba}
          onChange1={v => update('case1aa', v)} onChange2={v => update('case1ba', v)}
        />
        <MontantLigne
          label="Abattement forfaitaire"
          extra="assistants maternels/familiaux, journalistes"
          code1="1GA" code2="1HA"
          value1={revenus.case1ga} value2={revenus.case1ha}
          onChange1={v => update('case1ga', v)} onChange2={v => update('case1ha', v)}
        />
        <MontantLigne
          label="Heures supplémentaires et jours RTT exonérés"
          code1="1GH" code2="1HH"
          value1={revenus.case1gh} value2={revenus.case1hh}
          onChange1={v => update('case1gh', v)} onChange2={v => update('case1hh', v)}
        />
        <MontantLigne
          label="Pourboires exonérés"
          code1="1PB" code2="1PC"
          value1={revenus.case1pb} value2={revenus.case1pc}
          onChange1={v => update('case1pb', v)} onChange2={v => update('case1pc', v)}
        />
        <MontantLigne
          label="Primes de partage de la valeur exonérées"
          extra="ex-prime Macron"
          code1="1AD" code2="1BD"
          value1={revenus.case1ad} value2={revenus.case1bd}
          onChange1={v => update('case1ad', v)} onChange2={v => update('case1bd', v)}
        />
        <CaseLigne
          label="Majoration du seuil d'exonération"
          aide="À cocher si votre entreprise remplit les conditions d'effectif et de dispositif de partage de la valeur qui relèvent le plafond d'exonération de la prime ci-dessus."
          code1="1AV" code2="1BV"
          checked1={revenus.case1av} checked2={revenus.case1bv}
          onChange1={v => update('case1av', v)} onChange2={v => update('case1bv', v)}
        />

        <Separator />

        <MontantLigne
          label="Revenus des associés et gérants"
          extra="article 62 du CGI"
          code1="1GB" code2="1HB"
          value1={revenus.case1gb} value2={revenus.case1hb}
          onChange1={v => update('case1gb', v)} onChange2={v => update('case1hb', v)}
        />
        <MontantLigne
          label="Droits d'auteur, fonctionnaires chercheurs"
          code1="1GF" code2="1HF"
          value1={revenus.case1gf} value2={revenus.case1hf}
          onChange1={v => update('case1gf', v)} onChange2={v => update('case1hf', v)}
        />
        <MontantLigne
          label="Agents généraux d'assurance"
          extra="salaires imposables"
          code1="1GG" code2="1HG"
          value1={revenus.case1gg} value2={revenus.case1hg}
          onChange1={v => update('case1gg', v)} onChange2={v => update('case1hg', v)}
        />
        <CaseLigne
          label="Ne perçoit plus de salaires 1GB, 1GF, 1GG, 1AG"
          extra="uniquement si aucune de ces quatre catégories n'est plus perçue"
          code1="1GK" code2="1GL"
          checked1={revenus.case1gk} checked2={revenus.case1gl}
          onChange1={v => update('case1gk', v)} onChange2={v => update('case1gl', v)}
        />

        <Separator />

        <MontantLigne
          label="Autres revenus imposables"
          extra="chômage, préretraite"
          code1="1AP" code2="1BP"
          value1={revenus.case1ap} value2={revenus.case1bp}
          onChange1={v => update('case1ap', v)} onChange2={v => update('case1bp', v)}
        />
        <MontantLigne
          label="Salaires perçus par les non-résidents et salaires de source étrangère avec crédit d'impôt égal à l'impôt français"
          code1="1AF" code2="1BF"
          value1={revenus.case1af} value2={revenus.case1bf}
          onChange1={v => update('case1af', v)} onChange2={v => update('case1bf', v)}
        />
        <MontantLigne
          label="Autres salaires imposables de source étrangère"
          code1="1AG" code2="1BG"
          value1={revenus.case1ag} value2={revenus.case1bg}
          onChange1={v => update('case1ag', v)} onChange2={v => update('case1bg', v)}
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
    <div className="flex flex-wrap items-end gap-4 p-3 rounded-lg bg-muted/50">
      <div className="flex-1 min-w-[220px] space-y-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">
            {label}
            {extra && <span className="text-muted-foreground font-normal"> ({extra})</span>}
          </Label>
          {aide && <AideTooltip texte={aide} />}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Déclarant 1 · {code1}</Label>
        <Input
          type="number"
          className="w-36"
          value={value1 ?? ''}
          onChange={ev => onChange1(parse(ev.target.value))}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Déclarant 2 · {code2}</Label>
        <Input
          type="number"
          className="w-36"
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
  <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50">
    <div className="flex-1 min-w-[220px] flex items-center gap-1.5">
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

const AideTooltip = ({ texte }: { texte: string }) => (
  <Tooltip>
    <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground">
      <HelpCircle className="h-3.5 w-3.5" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs">{texte}</TooltipContent>
  </Tooltip>
);

export default RevenusSalairesForm;
