import { useEffect, useState } from 'react';
import { useChargesDeductibles } from '@/hooks/useChargesDeductibles';
import { ChargesDeductibles } from '@/services/chargesDeductiblesService';
import { ChargesDeductiblesInput } from '@/lib/fiscalite';
import { DeclarantsHeader, MontantEclateLigne, MontantLigne, SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';
import { CalculMonumentsHistoriques } from './CalculMonumentsHistoriques';

const CHARGES_VIDE: ChargesDeductiblesInput = {
  case6de: null, case6el: null, case6em: null, case6gu: null, case6gi: null, case6gj: null, case6gp: null,
  case6ns: null, case6nt: null, case6rs: null, case6rt: null, case6ps: null, case6pt: null,
  case6qr: false, case6qw: false, case6os: null, case6ot: null, case6qs: null, case6qt: null,
  case6nu: null, case6ru: null, case6pu: null, case6ou: null, case6qu: null,
  case6dg: null, case6dd: null, case6ev: null, case6eu: null, case6hp: null, case6hq: null, case6hr: null,
  case6gh: null, case6fa: null, case6fb: null, case6fc: null, case6fd: null, case6fe: null, case6fl: null,
  entretienSeul6el: false, entretienSeul6em: false,
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
          <SingleMontantLigne label="CSG déductible" extra="calculée sur les revenus du patrimoine" aide="Montant de l'avis. La CSG déductible sur 2BH et 2DF est ajoutée automatiquement, comme le fait le simulateur DGFiP : avec l'option barème, 6,8 % de 2BH + 2DF dans la limite des revenus du cadre 2 imposés au barème ; sans option, 6,8 % de 2DF dans la limite des produits d'assurance-vie au barème de plein droit (2CH, 2YY, 2VN). Ne pas la reporter ici. Corriger le montant prérempli si un avis complémentaire ou un dégrèvement est intervenu, en cas de plus-values avec abattement renforcé ou fixe de 500 000 € (CSG déductible au prorata de la plus-value soumise à l'IR), ou en cas de mariage, divorce ou décès en 2025 (répartition entre déclarations, par mois entiers en cas de décès)." code="6DE" value={ch.case6de} onChange={v => update('case6de', v)} />
          <MontantEclateLigne
            label="Pension alimentaire versée à un enfant majeur"
            aide="Plafond 6 855 € par enfant, doublé (13 710 €) si vous entretenez seul un enfant chargé de famille : cochez la ligne suivante. Enfant marié ou pacsé : plafond de 6 855 € pour le jeune ménage si les beaux-parents participent, 13 710 € si vous l'entretenez seul. Enfant vivant sous votre toit sans ressources suffisantes : forfait de 4 075 € (× 2 s'il est marié ou pacsé) sans justificatif, réduit au prorata des mois d'hébergement, tout mois commencé comptant."
            items={[
              { label: '1er enfant', code: '6EL', value: ch.case6el, onChange: v => update('case6el', v) },
              { label: '2e enfant', code: '6EM', value: ch.case6em, onChange: v => update('case6em', v) },
            ]}
          />
          <SingleCaseLigne label="Enfant entretenu seul : 1er enfant" extra="hors formulaire, plafond doublé" code="6EL" checked={ch.entretienSeul6el} onChange={v => update('entretienSeul6el', v)} />
          <SingleCaseLigne label="Enfant entretenu seul : 2e enfant" extra="hors formulaire, plafond doublé" code="6EM" checked={ch.entretienSeul6em} onChange={v => update('entretienSeul6em', v)} />
          <SingleMontantLigne label="Autres pensions alimentaires versées" extra="enfants mineurs, ascendants…" aide="Ascendant dans le besoin hébergé : forfait de 4 075 € déclarable sans justificatif. Capital constitutif de rente pour un enfant mineur : capital ÷ années de service, 2 700 € par an au plus. Prestation compensatoire versée sur plus de 12 mois : assimilée à une pension. Enfant en résidence alternée : aucune pension déductible." code="6GU" value={ch.case6gu} onChange={v => update('case6gu', v)} />
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
          <SingleCaseLigne label="Vous êtes nouvellement domicilié en France en 2025" aide="Faute d'avis d'impôt, saisir en 6PS/6PT le plafond recalculé : 10 % des revenus professionnels 2025, sous déduction des cotisations 6OS/6OT et 6QS/6QT, majoré d'un plafond complémentaire égal au triple si l'expatriation n'était pas liée à une procédure judiciaire, fiscale ou douanière." code="6QW" checked={ch.case6qw} onChange={v => update('case6qw', v)} />
          <MontantLigne label="Cotisations PER déduites des BIC, BNC, BA, art. 62" aide="Déjà déduites des revenus professionnels : informatif." code1="6OS" code2="6OT" value1={ch.case6os} value2={ch.case6ot} onChange1={v => update('case6os', v)} onChange2={v => update('case6ot', v)} />
          <MontantLigne label="Autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires" aide="Déjà déduites des revenus professionnels : informatif." code1="6QS" code2="6QT" value1={ch.case6qs} value2={ch.case6qt} onChange1={v => update('case6qs', v)} onChange2={v => update('case6qt', v)} />
        </SousGroupe>

        <SousGroupe titre="Épargne retraite : personne à charge" aide="Cotisations d'un membre du foyer à charge, déduites dans la limite de son propre plafond, sans mutualisation possible.">
          <SingleMontantLigne label="Cotisations PER déductibles du revenu global" code="6NU" value={ch.case6nu} onChange={v => update('case6nu', v)} />
          <SingleMontantLigne label="Cotisations PERP, Préfon, Corem, CGOS et assimilées" code="6RU" value={ch.case6ru} onChange={v => update('case6ru', v)} />
          <SingleMontantLigne label="Plafond de déduction" code="6PU" value={ch.case6pu} onChange={v => update('case6pu', v)} />
          <SingleMontantLigne label="Cotisations PER déduites des BIC, BNC, BA, art. 62" aide="Déjà déduites des revenus professionnels : informatif." code="6OU" value={ch.case6ou} onChange={v => update('case6ou', v)} />
          <SingleMontantLigne label="Autres cotisations déduites des BIC, BNC, BA, art. 62 ou salaires" aide="Déjà déduites des revenus professionnels : informatif." code="6QU" value={ch.case6qu} onChange={v => update('case6qu', v)} />
        </SousGroupe>

        <SousGroupe titre="Autres déductions">
          <SingleMontantLigne label="Charges foncières des monuments historiques" extra="art. 156 II CGI" aide="Seule ligne à déclarer après limitation : 100 % ou 50 % selon que l'immeuble est classé, inscrit ou agréé, ouvert ou fermé au public, avec ou sans recettes, ou labellisé Fondation du patrimoine. Utilisez le calcul ci-dessous." code="6DG" value={ch.case6dg} onChange={v => update('case6dg', v)} />
          <CalculMonumentsHistoriques onReporter={v => update('case6dg', v)} />
          <SingleMontantLigne label="Autres déductions" extra="art. 156 II et 156 bis CGI" aide="Retraite mutualiste du combattant (la rente maximale de 2 009 € n'est pas un plafond de déduction), cotisations de sécurité sociale non déduites ailleurs, rachats de cotisations sans salaires ni pensions. Les cotisations et rachats PREFON, COREM et CGOS vont en 6RS." code="6DD" value={ch.case6dd} onChange={v => update('case6dd', v)} />
          <MontantEclateLigne
            label="Personnes de plus de 75 ans accueillies sous votre toit, autres qu'ascendants"
            aide="Frais d'accueil plafonnés à 4 075 € par personne. Personne née avant le 1.1.1951, vivant en permanence sous votre toit, sans droit à pension alimentaire, revenu imposable au plus 12 411,44 € (19 268,80 € pour un couple)."
            items={[
              { label: 'Nombre', code: '6EV', value: ch.case6ev, onChange: v => update('case6ev', v), unite: null },
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
