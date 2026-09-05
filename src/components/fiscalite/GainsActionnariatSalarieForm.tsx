import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useGainsActionnariatSalarie } from '@/hooks/useGainsActionnariatSalarie';
import { GainsActionnariatSalarie } from '@/services/gainsActionnariatSalarieService';
import { GainsActionnariatSalarieInput } from '@/lib/fiscalite';
import { DeclarantsHeader, MontantLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';

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
  case1ay: null,
  case1by: null,
  case1mp: null,
  case1mq: null,
  case3vd: null,
  case3vi: null,
  case3vf: null,
  case3vj: null,
  case3vk: null,
  case3vn: null,
  case0xx: null,
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
        <MontantLigne
          label="Bons de souscription de parts de créateur d'entreprise (BSPCE)"
          extra="gain d'exercice taxable en salaires, à compter du 1.1.2025"
          aide="Avantage salarial issu de l'exercice de BSPCE à compter du 1.1.2025, pour une activité exercée depuis au moins trois ans : gain taxable sur option, dans la catégorie des salaires."
          code1="1AY" code2="1BY"
          value1={gains.case1ay} value2={gains.case1by}
          onChange1={v => update('case1ay', v)} onChange2={v => update('case1by', v)}
        />
        <MontantLigne
          label="Management packages"
          extra="gains de cession sur titres souscrits par salariés/dirigeants, à compter du 15.2.2025"
          aide="Gains de cession réalisés à compter du 15.2.2025 sur des titres souscrits ou acquis par des salariés ou des dirigeants (management packages) : imposition en salaires pour la part supérieure à la limite d'imposition."
          code1="1MP" code2="1MQ"
          value1={gains.case1mp} value2={gains.case1mq}
          onChange1={v => update('case1mp', v)} onChange2={v => update('case1mq', v)}
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

        <Separator />

        <SousGroupe
          titre="Revenus exceptionnels ou différés à imposer selon le système du quotient"
          aide="Système du quotient (art. 163-0 A CGI) : atténue la progressivité de l'impôt sur un revenu exceptionnel ou différé. Coefficient fixe de 4 appliqué (revenus exceptionnels). Ne pas ré-additionner ce montant dans les autres cases du formulaire."
        >
          <SingleMontantLigne
            label="Montant total des revenus à imposer selon le système du quotient"
            code="0XX"
            value={gains.case0xx}
            onChange={v => update('case0xx', v)}
          />
        </SousGroupe>

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

export default GainsActionnariatSalarieForm;
