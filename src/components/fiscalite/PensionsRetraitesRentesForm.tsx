import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { usePensionsRetraitesRentes } from '@/hooks/usePensionsRetraitesRentes';
import { PensionsRetraitesRentes } from '@/services/pensionsRetraitesRentesService';
import { PensionsRetraitesRentesInput } from '@/lib/fiscalite';
import { CaseLigne, DeclarantsHeader, MontantLigne, MontantParTrancheAgeLigne } from './DeclarationLigne';

const PENSIONS_VIDE: PensionsRetraitesRentesInput = {
  case1as: null,
  case1bs: null,
  case1at: null,
  case1bt: null,
  case1ai: null,
  case1bi: null,
  case1az: null,
  case1bz: null,
  case1ao: null,
  case1bo: null,
  case1al: null,
  case1bl: null,
  case1am: null,
  case1bm: null,
  case1aw: null,
  case1bw: null,
  case1cw: null,
  case1dw: null,
  case1ar: null,
  case1br: null,
  case1cr: null,
  case1dr: null,
  case1hk: false,
  case1hl: false,
};

interface PensionsRetraitesRentesFormProps {
  onSaved?: (pensions: PensionsRetraitesRentes) => void;
}

export const PensionsRetraitesRentesForm = ({ onSaved }: PensionsRetraitesRentesFormProps) => {
  const { data, loading, saving, saveData } = usePensionsRetraitesRentes();
  const [pensions, setPensions] = useState<PensionsRetraitesRentesInput>(PENSIONS_VIDE);
  const [pensionsId, setPensionsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setPensions(input);
      setPensionsId(id);
    }
  }, [data]);

  const update = <K extends keyof PensionsRetraitesRentesInput>(key: K, value: PensionsRetraitesRentesInput[K]) => {
    setPensions(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...pensions, id: pensionsId });
    setPensionsId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement des pensions, retraites et rentes...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pensions, retraites et rentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <DeclarantsHeader />
        <MontantLigne
          label="Pensions, retraites et rentes"
          code1="1AS" code2="1BS"
          value1={pensions.case1as} value2={pensions.case1bs}
          onChange1={v => update('case1as', v)} onChange2={v => update('case1bs', v)}
        />
        <MontantLigne
          label="Pensions de retraite en capital"
          extra="taxables à 7,5 %"
          code1="1AT" code2="1BT"
          value1={pensions.case1at} value2={pensions.case1bt}
          onChange1={v => update('case1at', v)} onChange2={v => update('case1bt', v)}
        />
        <MontantLigne
          label="Pensions en capital des plans d'épargne retraite"
          code1="1AI" code2="1BI"
          value1={pensions.case1ai} value2={pensions.case1bi}
          onChange1={v => update('case1ai', v)} onChange2={v => update('case1bi', v)}
        />
        <MontantLigne
          label="Pensions d'invalidité"
          code1="1AZ" code2="1BZ"
          value1={pensions.case1az} value2={pensions.case1bz}
          onChange1={v => update('case1az', v)} onChange2={v => update('case1bz', v)}
        />
        <MontantLigne
          label="Pensions alimentaires perçues"
          code1="1AO" code2="1BO"
          value1={pensions.case1ao} value2={pensions.case1bo}
          onChange1={v => update('case1ao', v)} onChange2={v => update('case1bo', v)}
        />
        <MontantLigne
          label="Pensions perçues par les non-résidents et pensions de source étrangère avec crédit d'impôt égal à l'impôt français"
          code1="1AL" code2="1BL"
          value1={pensions.case1al} value2={pensions.case1bl}
          onChange1={v => update('case1al', v)} onChange2={v => update('case1bl', v)}
        />
        <MontantLigne
          label="Autres pensions imposables de source étrangère"
          code1="1AM" code2="1BM"
          value1={pensions.case1am} value2={pensions.case1bm}
          onChange1={v => update('case1am', v)} onChange2={v => update('case1bm', v)}
        />
        <CaseLigne
          label="Ne perçoit plus de pensions 1AO, 1AM"
          extra="uniquement si aucune de ces deux catégories n'est plus perçue"
          code1="1HK" code2="1HL"
          checked1={pensions.case1hk} checked2={pensions.case1hl}
          onChange1={v => update('case1hk', v)} onChange2={v => update('case1hl', v)}
        />

        <Separator />

        <p className="text-sm font-medium">Rentes viagères à titre onéreux</p>
        <p className="text-sm text-muted-foreground">
          Montant perçu par le foyer, ventilé par âge d'entrée en jouissance de la rente — pas par
          déclarant.
        </p>
        <MontantParTrancheAgeLigne
          label="Rentes perçues"
          tranches={[
            { ageLabel: 'Moins de 50 ans', code: '1AW', value: pensions.case1aw, onChange: v => update('case1aw', v) },
            { ageLabel: 'De 50 à 59 ans', code: '1BW', value: pensions.case1bw, onChange: v => update('case1bw', v) },
            { ageLabel: 'De 60 à 69 ans', code: '1CW', value: pensions.case1cw, onChange: v => update('case1cw', v) },
            { ageLabel: 'À partir de 70 ans', code: '1DW', value: pensions.case1dw, onChange: v => update('case1dw', v) },
          ]}
        />
        <MontantParTrancheAgeLigne
          label="Rentes perçues par les non-résidents et rentes de source étrangère"
          aide="Rentes de source étrangère avec crédit d'impôt égal à l'impôt français."
          tranches={[
            { ageLabel: 'Moins de 50 ans', code: '1AR', value: pensions.case1ar, onChange: v => update('case1ar', v) },
            { ageLabel: 'De 50 à 59 ans', code: '1BR', value: pensions.case1br, onChange: v => update('case1br', v) },
            { ageLabel: 'De 60 à 69 ans', code: '1CR', value: pensions.case1cr, onChange: v => update('case1cr', v) },
            { ageLabel: 'À partir de 70 ans', code: '1DR', value: pensions.case1dr, onChange: v => update('case1dr', v) },
          ]}
        />

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

export default PensionsRetraitesRentesForm;
