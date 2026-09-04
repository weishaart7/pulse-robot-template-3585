import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRevenusExoneresTauxEffectif } from '@/hooks/useRevenusExoneresTauxEffectif';
import { RevenusExoneresTauxEffectif } from '@/services/revenusExoneresTauxEffectifService';
import { RevenusExoneresTauxEffectifInput } from '@/lib/fiscalite';
import { CaseLigne, DeclarantsHeader, MontantLigne, TexteLigne } from './DeclarationLigne';

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

        <DeclarantsHeader />

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

export default RevenusExoneresTauxEffectifForm;
