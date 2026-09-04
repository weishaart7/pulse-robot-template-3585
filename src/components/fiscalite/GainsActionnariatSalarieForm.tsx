import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle, Loader2 } from 'lucide-react';
import { useGainsActionnariatSalarie } from '@/hooks/useGainsActionnariatSalarie';
import { GainsActionnariatSalarie } from '@/services/gainsActionnariatSalarieService';
import { GainsActionnariatSalarieInput } from '@/lib/fiscalite';

const GAINS_VIDE: GainsActionnariatSalarieInput = {
  case1tp: null,
  case1up: null,
  case1tt: null,
  case1ut: null,
  case1tz: null,
  case1uz: null,
  case1wz: null,
  case1vz: null,
  case1nx: null,
  case1ox: null,
  case1ny: null,
  case1oy: null,
  case3vd: null,
  case3vi: null,
  case3vf: null,
  case3vj: null,
  case3vk: null,
  case3vn: null,
};

interface GainsActionnariatSalarieFormProps {
  onSaved?: (gains: GainsActionnariatSalarie) => void;
}

export const GainsActionnariatSalarieForm = ({ onSaved }: GainsActionnariatSalarieFormProps) => {
  const { data, loading, saving, saveData } = useGainsActionnariatSalarie();
  const [gains, setGains] = useState<GainsActionnariatSalarieInput>(GAINS_VIDE);
  const [gainsId, setGainsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setGains(input);
      setGainsId(id);
    }
  }, [data]);

  const update = <K extends keyof GainsActionnariatSalarieInput>(key: K, value: GainsActionnariatSalarieInput[K]) => {
    setGains(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...gains, id: gainsId });
    setGainsId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement des gains d'actionnariat salarié...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gains d'actionnariat salarié</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="hidden lg:grid grid-cols-[1fr_8rem_8rem] gap-4 px-3 text-xs font-medium text-muted-foreground">
          <span />
          <span className="text-center">Déclarant 1</span>
          <span className="text-center">Déclarant 2</span>
        </div>
        <MontantLigne
          label="Rabais excédentaire sur options sur titres"
          aide="Part de la décote sur le prix d'achat d'une option qui dépasse le seuil autorisé (5 %), imposée comme un salaire."
          code1="1TP" code2="1UP"
          value1={gains.case1tp} value2={gains.case1up}
          onChange1={v => update('case1tp', v)} onChange2={v => update('case1up', v)}
        />
        <MontantLigne
          label="Gains de levée d'options / actions gratuites attribuées à compter du 28.9.2012"
          extra="cas général, ou fraction > 300 000 € pour une attribution après le 31.12.2016"
          code1="1TT" code2="1UT"
          value1={gains.case1tt} value2={gains.case1ut}
          onChange1={v => update('case1tt', v)} onChange2={v => update('case1ut', v)}
        />

        <SousGroupe titre="Actions gratuites attribuées du 8.8.2015 au 30.12.2016, ou après le 31.12.2016 pour leur fraction ≤ 300 000 €">
          <SingleMontantLigne
            label="Gain imposable après abattement"
            code="1TZ"
            value={gains.case1tz}
            onChange={v => update('case1tz', v)}
          />
          <SingleMontantLigne
            label="Abattement pour durée de détention"
            code="1UZ"
            value={gains.case1uz}
            onChange={v => update('case1uz', v)}
          />
          <SingleMontantLigne
            label="Abattement de 50 %"
            code="1WZ"
            value={gains.case1wz}
            onChange={v => update('case1wz', v)}
          />
          <SingleMontantLigne
            label="Abattement fixe (départ à la retraite d'un dirigeant de PME)"
            code="1VZ"
            value={gains.case1vz}
            onChange={v => update('case1vz', v)}
          />
        </SousGroupe>

        <MontantLigne
          label="Gains et distributions de parts ou actions de carried-interest"
          aide="Part de plus-value perçue par les gestionnaires de fonds d'investissement en rémunération de leur performance."
          code1="1NX" code2="1OX"
          value1={gains.case1nx} value2={gains.case1ox}
          onChange1={v => update('case1nx', v)} onChange2={v => update('case1ox', v)}
        />
        <MontantLigne
          label="Carried-interest soumis à la contribution salariale de 30 %"
          code1="1NY" code2="1OY"
          value1={gains.case1ny} value2={gains.case1oy}
          onChange1={v => update('case1ny', v)} onChange2={v => update('case1oy', v)}
        />

        <Separator />

        <SousGroupe
          titre="Gains de levée d'options / actions gratuites attribuées avant le 28.9.2012"
          aide="Le taux applicable dépend de la date d'attribution et de la durée de conservation des titres — un seul des trois montants est normalement renseigné."
        >
          <div className="flex flex-wrap gap-4">
            <SingleMontantLigne label="Gains taxables à 18 %" code="3VD" value={gains.case3vd} onChange={v => update('case3vd', v)} />
            <SingleMontantLigne label="Gains taxables à 30 %" code="3VI" value={gains.case3vi} onChange={v => update('case3vi', v)} />
            <SingleMontantLigne label="Gains taxables à 41 %" code="3VF" value={gains.case3vf} onChange={v => update('case3vf', v)} />
          </div>
        </SousGroupe>

        <MontantLigne
          label="Gains imposables sur option, catégorie des salaires"
          code1="3VJ" code2="3VK"
          value1={gains.case3vj} value2={gains.case3vk}
          onChange1={v => update('case3vj', v)} onChange2={v => update('case3vk', v)}
        />
        <SingleMontantLigne
          label="Gains soumis à la contribution salariale de 10 %"
          code="3VN"
          value={gains.case3vn}
          onChange={v => update('case3vn', v)}
        />

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

interface SousGroupeProps {
  titre: string;
  aide?: string;
  children: React.ReactNode;
}

const SousGroupe = ({ titre, aide, children }: SousGroupeProps) => (
  <div className="space-y-3 p-3 rounded-lg border border-border">
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-medium">{titre}</p>
      {aide && <AideTooltip texte={aide} />}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

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

interface SingleMontantLigneProps {
  label: string;
  extra?: string;
  aide?: string;
  code: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

const SingleMontantLigne = ({ label, extra, aide, code, value, onChange }: SingleMontantLigneProps) => {
  const parse = (raw: string): number | null => (raw === '' ? null : Number(raw));

  return (
    <div className="flex flex-wrap items-end gap-4 p-3 rounded-lg bg-muted/50">
      <div className="flex-1 min-w-[180px] space-y-1">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm">
            {label}
            {extra && <span className="text-muted-foreground font-normal"> ({extra})</span>}
          </Label>
          {aide && <AideTooltip texte={aide} />}
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{code}</Label>
        <Input
          id={`case-${code}`}
          type="number"
          className="w-36"
          value={value ?? ''}
          onChange={ev => onChange(parse(ev.target.value))}
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

export default GainsActionnariatSalarieForm;
