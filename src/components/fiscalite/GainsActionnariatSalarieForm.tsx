import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useGainsActionnariatSalarie } from '@/hooks/useGainsActionnariatSalarie';
import { GainsActionnariatSalarie } from '@/services/gainsActionnariatSalarieService';
import { GainsActionnariatSalarieInput } from '@/lib/fiscalite';
import { AideTooltip, DeclarantsHeader, MontantLigne, SingleMontantLigne } from './DeclarationLigne';

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
      <CardContent className="space-y-2">
        <DeclarantsHeader />
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
          <div className="flex flex-wrap gap-2">
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
  <div className="space-y-2 p-2.5 rounded-md border border-border">
    <div className="flex items-center gap-1.5">
      <p className="text-sm font-medium">{titre}</p>
      {aide && <AideTooltip texte={aide} />}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);

export default GainsActionnariatSalarieForm;
