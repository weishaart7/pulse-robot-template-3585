import { useEffect, useState } from 'react';
import { useChargesDeductibles } from '@/hooks/useChargesDeductibles';
import { ChargesDeductibles } from '@/services/chargesDeductiblesService';
import { ChargesDeductiblesInput } from '@/lib/fiscalite';
import { DeclarantsHeader, MontantEclateLigne, MontantLigne, SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

const CHARGES_VIDE: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
};

interface ChargesDeductiblesFormProps {
  onSaved?: (charges: ChargesDeductibles) => void;
}

export const ChargesDeductiblesForm = ({ onSaved }: ChargesDeductiblesFormProps) => {
  const { data, loading, saving, saveData } = useChargesDeductibles();
  const [ch, setCh] = useState<ChargesDeductiblesInput>(CHARGES_VIDE);
  const [chId, setChId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setCh(input);
      setChId(id);
    }
  }, [data]);

  const update = <K extends keyof ChargesDeductiblesInput>(key: K, value: ChargesDeductiblesInput[K]) => {
    setCh(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...ch, id: chId });
    setChId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des charges déductibles..." />;
  }

  return (
    <Cadre2042 titre="Charges déductibles"
      description="Cadre 6 de la 2042 et de la 2042-C : charges retranchées du revenu global, plafonds appliqués ici."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="CSG et pensions alimentaires">
          <SingleMontantLigne label="CSG déductible" extra="calculée sur les revenus du patrimoine" code="6DE" value={ch.case6de} onChange={v => update('case6de', v)} />
          <MontantEclateLigne
            label="Pension alimentaire versée à un enfant majeur"
            aide="Plafond 6 855 € par enfant."
            items={[
              { label: '1er enfant', code: '6EL', value: ch.case6el, onChange: v => update('case6el', v) },
              { label: '2e enfant', code: '6EM', value: ch.case6em, onChange: v => update('case6em', v) },
            ]}
          />
          <SingleMontantLigne label="Autres pensions alimentaires versées" extra="enfants mineurs, ascendants…" code="6GU" value={ch.case6gu} onChange={v => update('case6gu', v)} />
          <MontantEclateLigne
            label="Décision de justice définitive avant 2006 : enfant majeur"
            items={[
              { label: '1er enfant', code: '6GI', value: ch.case6gi, onChange: v => update('case6gi', v) },
              { label: '2e enfant', code: '6GJ', value: ch.case6gj, onChange: v => update('case6gj', v) },
            ]}
          />
          <SingleMontantLigne label="Décision de justice définitive avant 2006 : autres personnes" code="6GP" value={ch.case6gp} onChange={v => update('case6gp', v)} />
        </SousGroupe>

        <SousGroupe titre="Épargne retraite" aide="Déduction limitée au plafond figurant sur l'avis d'impôt 2025, réintégrée au revenu fiscal de référence.">
          <DeclarantsHeader />
          <MontantLigne label="Cotisations PER déductibles du revenu global" code1="6NS" code2="6NT" value1={ch.case6ns} value2={ch.case6nt} onChange1={v => update('case6ns', v)} onChange2={v => update('case6nt', v)} />
          <MontantLigne label="Cotisations PERP, Préfon, Corem, CGOS et assimilées" code1="6RS" code2="6RT" value1={ch.case6rs} value2={ch.case6rt} onChange1={v => update('case6rs', v)} onChange2={v => update('case6rt', v)} />
          <MontantLigne label="Plafond de déduction" code1="6PS" code2="6PT" value1={ch.case6ps} value2={ch.case6pt} onChange1={v => update('case6ps', v)} onChange2={v => update('case6pt', v)} />
          <SingleCaseLigne label="Vous souhaitez bénéficier du plafond de votre conjoint" code="6QR" checked={ch.case6qr} onChange={v => update('case6qr', v)} />
          <SingleCaseLigne label="Vous êtes nouvellement domicilié en France en 2025" aide="Le plafond 6PS/6PT est alors à saisir tel que recalculé, faute d'avis d'impôt." code="6QW" checked={ch.case6qw} onChange={v => update('case6qw', v)} />
          <MontantLigne label="Cotisations PER déduites des BIC, BNC, BA, art. 62" aide="Déjà déduites des revenus professionnels : informatif." code1="6OS" code2="6OT" value1={ch.case6os} value2={ch.case6ot} onChange1={v => update('case6os', v)} onChange2={v => update('case6ot', v)} />
          <MontantLigne label="Autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires" aide="Déjà déduites des revenus professionnels : informatif." code1="6QS" code2="6QT" value1={ch.case6qs} value2={ch.case6qt} onChange1={v => update('case6qs', v)} onChange2={v => update('case6qt', v)} />
        </SousGroupe>

        <SousGroupe titre="Autres déductions">
          <SingleMontantLigne label="Charges foncières des monuments historiques" extra="art. 156 II CGI" code="6DG" value={ch.case6dg} onChange={v => update('case6dg', v)} />
          <SingleMontantLigne label="Autres déductions" extra="art. 156 II et 156 bis CGI" code="6DD" value={ch.case6dd} onChange={v => update('case6dd', v)} />
          <MontantEclateLigne
            label="Personnes de plus de 75 ans accueillies sous votre toit"
            aide="Frais d'accueil plafonnés à 4 075 € par personne."
            items={[
              { label: 'Nombre', code: '6EV', value: ch.case6ev, onChange: v => update('case6ev', v) },
              { label: "Frais d'accueil", code: '6EU', value: ch.case6eu, onChange: v => update('case6eu', v) },
            ]}
          />
          <MontantEclateLigne
            label="Grosses réparations des nus-propriétaires : report des années antérieures"
            aide="Imputables sur le revenu global dans la limite de 25 000 € par an."
            items={[
              { label: '2015', code: '6HP', value: ch.case6hp, onChange: v => update('case6hp', v) },
              { label: '2016', code: '6HQ', value: ch.case6hq, onChange: v => update('case6hq', v) },
              { label: '2017', code: '6HR', value: ch.case6hr, onChange: v => update('case6hr', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Imputations diverses">
          <SingleMontantLigne label="Sommes à ajouter au revenu imposable" code="6GH" value={ch.case6gh} onChange={v => update('case6gh', v)} />
          <MontantEclateLigne
            label="Déficits globaux des années antérieures non encore déduits"
            aide="Imputés les plus anciens d'abord, avant les charges, sans amener le revenu sous 0."
            items={[
              { label: '2019', code: '6FA', value: ch.case6fa, onChange: v => update('case6fa', v) },
              { label: '2020', code: '6FB', value: ch.case6fb, onChange: v => update('case6fb', v) },
              { label: '2021', code: '6FC', value: ch.case6fc, onChange: v => update('case6fc', v) },
              { label: '2022', code: '6FD', value: ch.case6fd, onChange: v => update('case6fd', v) },
              { label: '2023', code: '6FE', value: ch.case6fe, onChange: v => update('case6fe', v) },
              { label: '2024', code: '6FL', value: ch.case6fl, onChange: v => update('case6fl', v) },
            ]}
          />
        </SousGroupe>
    </Cadre2042>
  );
};

export default ChargesDeductiblesForm;
