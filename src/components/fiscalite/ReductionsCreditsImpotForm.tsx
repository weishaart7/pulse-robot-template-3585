import { useEffect, useState } from 'react';
import { useReductionsCreditsImpot } from '@/hooks/useReductionsCreditsImpot';
import { ReductionsCreditsImpot } from '@/services/reductionsCreditsImpotService';
import { ReductionsCreditsImpotInput } from '@/lib/fiscalite';
import { SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

const REDUCTIONS_VIDE: ReductionsCreditsImpotInput = {
  case7ud: null, case7uq: null, case7uj: null, case7uf: null,
  case7db: null, case7dr: null, case7dl: null, case7dq: false, case7dg: false, membresPlus65Ans: null,
};

interface ReductionsCreditsImpotFormProps {
  onSaved?: (reductions: ReductionsCreditsImpot) => void;
}

export const ReductionsCreditsImpotForm = ({ onSaved }: ReductionsCreditsImpotFormProps) => {
  const { data, loading, saving, saveData } = useReductionsCreditsImpot();
  const [rc, setRc] = useState<ReductionsCreditsImpotInput>(REDUCTIONS_VIDE);
  const [rcId, setRcId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRc(input);
      setRcId(id);
    }
  }, [data]);

  const update = <K extends keyof ReductionsCreditsImpotInput>(key: K, value: ReductionsCreditsImpotInput[K]) => {
    setRc(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...rc, id: rcId });
    setRcId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des réductions et crédits d'impôt..." />;
  }

  return (
    <Cadre2042 titre="Réductions et crédits d'impôt"
      description="Cadre 7 de la 2042 : dons, services à la personne, garde, scolarité, cotisations syndicales, prestations compensatoires. Les autres réductions relèvent de la 2042-RICI, non gérée ici."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="Dons versés à des organismes établis en France" aide="Réduction non restituable. Au-delà des plafonds à 75 %, l'excédent est retenu à 66 % avec les dons 7UF, dans la limite de 20 % du revenu imposable.">
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 1.1 au 13.10.2025" extra="75 %, maximum 1 000 €" code="7UD" value={rc.case7ud} onChange={v => update('case7ud', v)} />
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 14.10 au 31.12.2025" extra="75 %, maximum 2 000 € avec 7UD" code="7UQ" value={rc.case7uq} onChange={v => update('case7uq', v)} />
          <SingleMontantLigne label="Sauvegarde du patrimoine religieux" extra="75 %, maximum 1 000 €" code="7UJ" value={rc.case7uj} onChange={v => update('case7uj', v)} />
          <SingleMontantLigne label="Autres organismes d'intérêt général, associations d'utilité publique, candidats aux élections" extra="66 %" code="7UF" value={rc.case7uf} onChange={v => update('case7uf', v)} />
          <SingleMontantLigne label="Dons et cotisations aux partis politiques" extra="66 %, maximum 15 000 € par foyer" code="7UH" value={rc.case7uh ?? null} onChange={v => update('case7uh', v)} />
        </SousGroupe>

        <SousGroupe titre="Services à la personne" aide="Crédit restituable de 50 % des dépenses nettes des aides, dans la limite du plafond.">
          <SingleMontantLigne label="Dépenses de services à la personne" code="7DB" value={rc.case7db} onChange={v => update('case7db', v)} />
          <SingleMontantLigne label="Aides perçues" extra="APA, PCH, CESU préfinancé…" code="7DR" value={rc.case7dr} onChange={v => update('case7dr', v)} />
          <SingleMontantLigne label="Ascendants de plus de 65 ans bénéficiaires de l'APA" extra="nombre" code="7DL" value={rc.case7dl} onChange={v => update('case7dl', v)} />
          <SingleMontantLigne label="Membres du foyer âgés de plus de 65 ans" extra="nombre, hors formulaire" aide="Majore le plafond de 1 500 € chacun ; les enfants et personnes à charge sont repris du Ménage." code="+65" value={rc.membresPlus65Ans} onChange={v => update('membresPlus65Ans', v)} />
          <SingleCaseLigne label="Vous avez employé directement pour la première fois en 2025 un salarié à domicile" code="7DQ" checked={rc.case7dq} onChange={v => update('case7dq', v)} />
          <SingleCaseLigne label="Vous, votre conjoint ou une personne à charge avez la carte d'invalidité ou la CMI invalidité" code="7DG" checked={rc.case7dg} onChange={v => update('case7dg', v)} />
        </SousGroupe>

        <SousGroupe titre="Frais de garde des enfants de moins de 6 ans au 1.1.2025" aide="Crédit restituable de 50 %, dans la limite de 3 500 € par enfant (1 750 € en résidence alternée). Montants nets des aides perçues.">
          <SingleMontantLigne label="1er enfant" code="7GA" value={rc.case7ga ?? null} onChange={v => update('case7ga', v)} />
          <SingleMontantLigne label="2e enfant" code="7GB" value={rc.case7gb ?? null} onChange={v => update('case7gb', v)} />
          <SingleMontantLigne label="3e enfant" code="7GC" value={rc.case7gc ?? null} onChange={v => update('case7gc', v)} />
          <SingleMontantLigne label="1er enfant en résidence alternée" code="7GE" value={rc.case7ge ?? null} onChange={v => update('case7ge', v)} />
          <SingleMontantLigne label="2e enfant en résidence alternée" code="7GF" value={rc.case7gf ?? null} onChange={v => update('case7gf', v)} />
          <SingleMontantLigne label="3e enfant en résidence alternée" code="7GG" value={rc.case7gg ?? null} onChange={v => update('case7gg', v)} />
        </SousGroupe>

        <SousGroupe titre="Enfants scolarisés" aide="Réduction de 61 € au collège, 153 € au lycée, 183 € dans le supérieur, par enfant ; moitié en résidence alternée.">
          <SingleMontantLigne label="Collège" extra="nombre" code="7EA" value={rc.case7ea ?? null} onChange={v => update('case7ea', v)} />
          <SingleMontantLigne label="Collège, résidence alternée" extra="nombre" code="7EB" value={rc.case7eb ?? null} onChange={v => update('case7eb', v)} />
          <SingleMontantLigne label="Lycée" extra="nombre" code="7EC" value={rc.case7ec ?? null} onChange={v => update('case7ec', v)} />
          <SingleMontantLigne label="Lycée, résidence alternée" extra="nombre" code="7ED" value={rc.case7ed ?? null} onChange={v => update('case7ed', v)} />
          <SingleMontantLigne label="Enseignement supérieur" extra="nombre" code="7EF" value={rc.case7ef ?? null} onChange={v => update('case7ef', v)} />
          <SingleMontantLigne label="Supérieur, résidence alternée" extra="nombre" code="7EG" value={rc.case7eg ?? null} onChange={v => update('case7eg', v)} />
        </SousGroupe>

        <SousGroupe titre="Cotisations syndicales" aide="Crédit restituable de 66 %, dans la limite de 1 % des salaires et pensions bruts du déclarant.">
          <SingleMontantLigne label="Déclarant 1" code="7AC" value={rc.case7ac ?? null} onChange={v => update('case7ac', v)} />
          <SingleMontantLigne label="Déclarant 2" code="7AE" value={rc.case7ae ?? null} onChange={v => update('case7ae', v)} />
        </SousGroupe>

        <SousGroupe titre="Prestations compensatoires" aide="Réduction de 25 % des sommes versées, retenues dans la limite de 30 500 € (au prorata si le total fixé par jugement dépasse ce montant).">
          <SingleMontantLigne label="Sommes versées en 2025" code="7WN" value={rc.case7wn ?? null} onChange={v => update('case7wn', v)} />
          <SingleMontantLigne label="Sommes totales décidées par jugement en 2025 ou capital reconstitué" code="7WO" value={rc.case7wo ?? null} onChange={v => update('case7wo', v)} />
          <SingleMontantLigne label="Capital fixé en substitution de rente" extra="sans effet sur le calcul" code="7WM" value={rc.case7wm ?? null} onChange={v => update('case7wm', v)} />
        </SousGroupe>

        <SousGroupe titre="Entreprises solidaires d'utilité sociale (ESUS)" aide="Réduction de 25 %, dans la limite de 50 000 € (100 000 € pour un couple).">
          <SingleMontantLigne label="Report des versements effectués du 9.5 au 31.12.2021" code="7DC" value={rc.case7dc ?? null} onChange={v => update('case7dc', v)} />
        </SousGroupe>

        <SousGroupe titre="Investissements outre-mer dans une entreprise (2020-2025)" aide="Montant de la réduction (crédit pour HJA). Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Réalisés en 2025, location à une entreprise exploitante, rétrocession 56 %" code="HLS" value={rc.caseHls ?? null} onChange={v => update('caseHls', v)} />
          <SingleMontantLigne label="Réalisés en 2025, rétrocession 66 %" code="HLT" value={rc.caseHlt ?? null} onChange={v => update('caseHlt', v)} />
          <SingleMontantLigne label="Réalisés en 2025, dans votre entreprise" code="HLU" value={rc.caseHlu ?? null} onChange={v => update('caseHlu', v)} />
          <SingleMontantLigne label="Réalisés en 2025, exploitation directe" code="HLW" value={rc.caseHlw ?? null} onChange={v => update('caseHlw', v)} />
          <SingleMontantLigne label="Réalisés en 2020, location à une entreprise exploitante, rétrocession 56 %" code="HGS" value={rc.caseHgs ?? null} onChange={v => update('caseHgs', v)} />
          <SingleMontantLigne label="Réalisés en 2020, rétrocession 66 %" code="HGT" value={rc.caseHgt ?? null} onChange={v => update('caseHgt', v)} />
          <SingleMontantLigne label="Réalisés en 2020, dans votre entreprise" code="HGU" value={rc.caseHgu ?? null} onChange={v => update('caseHgu', v)} />
          <SingleMontantLigne label="Réalisés en 2020, exploitation directe" code="HGW" value={rc.caseHgw ?? null} onChange={v => update('caseHgw', v)} />
          <SingleMontantLigne label="Réalisés en 2021, location à une entreprise exploitante, rétrocession 56 %" code="HHS" value={rc.caseHhs ?? null} onChange={v => update('caseHhs', v)} />
          <SingleMontantLigne label="Réalisés en 2021, rétrocession 66 %" code="HHT" value={rc.caseHht ?? null} onChange={v => update('caseHht', v)} />
          <SingleMontantLigne label="Réalisés en 2021, dans votre entreprise" code="HHU" value={rc.caseHhu ?? null} onChange={v => update('caseHhu', v)} />
          <SingleMontantLigne label="Réalisés en 2021, exploitation directe" code="HHW" value={rc.caseHhw ?? null} onChange={v => update('caseHhw', v)} />
          <SingleMontantLigne label="Réalisés en 2022, location à une entreprise exploitante, rétrocession 56 %" code="HIS" value={rc.caseHis ?? null} onChange={v => update('caseHis', v)} />
          <SingleMontantLigne label="Réalisés en 2022, rétrocession 66 %" code="HIT" value={rc.caseHit ?? null} onChange={v => update('caseHit', v)} />
          <SingleMontantLigne label="Réalisés en 2022, dans votre entreprise" code="HIU" value={rc.caseHiu ?? null} onChange={v => update('caseHiu', v)} />
          <SingleMontantLigne label="Réalisés en 2022, exploitation directe" code="HIW" value={rc.caseHiw ?? null} onChange={v => update('caseHiw', v)} />
          <SingleMontantLigne label="Réalisés en 2023, location à une entreprise exploitante, rétrocession 56 %" code="HJS" value={rc.caseHjs ?? null} onChange={v => update('caseHjs', v)} />
          <SingleMontantLigne label="Réalisés en 2023, rétrocession 66 %" code="HJT" value={rc.caseHjt ?? null} onChange={v => update('caseHjt', v)} />
          <SingleMontantLigne label="Réalisés en 2023, dans votre entreprise" code="HJU" value={rc.caseHju ?? null} onChange={v => update('caseHju', v)} />
          <SingleMontantLigne label="Réalisés en 2023, exploitation directe" code="HJW" value={rc.caseHjw ?? null} onChange={v => update('caseHjw', v)} />
          <SingleMontantLigne label="Réalisés en 2024, location à une entreprise exploitante, rétrocession 56 %" code="HKS" value={rc.caseHks ?? null} onChange={v => update('caseHks', v)} />
          <SingleMontantLigne label="Réalisés en 2024, rétrocession 66 %" code="HKT" value={rc.caseHkt ?? null} onChange={v => update('caseHkt', v)} />
          <SingleMontantLigne label="Réalisés en 2024, dans votre entreprise" code="HKU" value={rc.caseHku ?? null} onChange={v => update('caseHku', v)} />
          <SingleMontantLigne label="Réalisés en 2024, exploitation directe" code="HKW" value={rc.caseHkw ?? null} onChange={v => update('caseHkw', v)} />
          <SingleMontantLigne label="Crédit d'impôt, investissement dans une entreprise des DOM, 2025" code="HJA" value={rc.caseHja ?? null} onChange={v => update('caseHja', v)} />
        </SousGroupe>

        <SousGroupe titre="Logement social outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Logement social, investissements 2025" code="HYJ" value={rc.caseHyj ?? null} onChange={v => update('caseHyj', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2020" code="HYE" value={rc.caseHye ?? null} onChange={v => update('caseHye', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2021" code="HYF" value={rc.caseHyf ?? null} onChange={v => update('caseHyf', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2022" code="HYG" value={rc.caseHyg ?? null} onChange={v => update('caseHyg', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2023" code="HYH" value={rc.caseHyh ?? null} onChange={v => update('caseHyh', v)} />
          <SingleMontantLigne label="Report logement social, investissements 2024" code="HYI" value={rc.caseHyi ?? null} onChange={v => update('caseHyi', v)} />
        </SousGroupe>

        <SousGroupe titre="Investissements immobiliers outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément avant 2009" code="HOA" value={rc.caseHoa ?? null} onChange={v => update('caseHoa', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2009" code="HOB" value={rc.caseHob ?? null} onChange={v => update('caseHob', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2010" code="HOC" value={rc.caseHoc ?? null} onChange={v => update('caseHoc', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément avant 2009" code="HOH" value={rc.caseHoh ?? null} onChange={v => update('caseHoh', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2009" code="HOI" value={rc.caseHoi ?? null} onChange={v => update('caseHoi', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2010" code="HOJ" value={rc.caseHoj ?? null} onChange={v => update('caseHoj', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, autres investissements" code="HOK" value={rc.caseHok ?? null} onChange={v => update('caseHok', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément avant 2009 (2e ligne)" code="HOL" value={rc.caseHol ?? null} onChange={v => update('caseHol', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2009 (2e ligne)" code="HOM" value={rc.caseHom ?? null} onChange={v => update('caseHom', v)} />
          <SingleMontantLigne label="Immobilier engagé avant 2011, agrément 2010 (2e ligne)" code="HON" value={rc.caseHon ?? null} onChange={v => update('caseHon', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément avant 2009 (2e ligne)" code="HOO" value={rc.caseHoo ?? null} onChange={v => update('caseHoo', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2009 (2e ligne)" code="HOP" value={rc.caseHop ?? null} onChange={v => update('caseHop', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2010 (2e ligne)" code="HOQ" value={rc.caseHoq ?? null} onChange={v => update('caseHoq', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2011, agrément 2011" code="HOR" value={rc.caseHor ?? null} onChange={v => update('caseHor', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément avant 2009" code="HOS" value={rc.caseHos ?? null} onChange={v => update('caseHos', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2009" code="HOT" value={rc.caseHot ?? null} onChange={v => update('caseHot', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2010 (2e ligne)" code="HOU" value={rc.caseHou ?? null} onChange={v => update('caseHou', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2011 (2e ligne)" code="HOV" value={rc.caseHov ?? null} onChange={v => update('caseHov', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, autres investissements" code="HOW" value={rc.caseHow ?? null} onChange={v => update('caseHow', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2013, engagé avant 2011" code="HOD" value={rc.caseHod ?? null} onChange={v => update('caseHod', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2010" code="HOE" value={rc.caseHoe ?? null} onChange={v => update('caseHoe', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012, agrément 2011" code="HOF" value={rc.caseHof ?? null} onChange={v => update('caseHof', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2010" code="HOG" value={rc.caseHog ?? null} onChange={v => update('caseHog', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2011" code="HOX" value={rc.caseHox ?? null} onChange={v => update('caseHox', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, agrément 2012" code="HOY" value={rc.caseHoy ?? null} onChange={v => update('caseHoy', v)} />
          <SingleMontantLigne label="Immobilier engagé en 2012 ou 2013, autres investissements" code="HOZ" value={rc.caseHoz ?? null} onChange={v => update('caseHoz', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés avant 2011" code="HUA" value={rc.caseHua ?? null} onChange={v => update('caseHua', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés en 2011, agrément 2010" code="HUB" value={rc.caseHub ?? null} onChange={v => update('caseHub', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés en 2011, agrément 2011" code="HUC" value={rc.caseHuc ?? null} onChange={v => update('caseHuc', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2010" code="HUD" value={rc.caseHud ?? null} onChange={v => update('caseHud', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2011" code="HUE" value={rc.caseHue ?? null} onChange={v => update('caseHue', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, agrément 2012" code="HUF" value={rc.caseHuf ?? null} onChange={v => update('caseHuf', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2014, engagés depuis 2012, autres investissements" code="HUG" value={rc.caseHug ?? null} onChange={v => update('caseHug', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés avant 2011" code="HUH" value={rc.caseHuh ?? null} onChange={v => update('caseHuh', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés en 2011, agrément 2010" code="HUI" value={rc.caseHui ?? null} onChange={v => update('caseHui', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés en 2011, agrément 2011" code="HUJ" value={rc.caseHuj ?? null} onChange={v => update('caseHuj', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2010" code="HUK" value={rc.caseHuk ?? null} onChange={v => update('caseHuk', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2011" code="HUL" value={rc.caseHul ?? null} onChange={v => update('caseHul', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, agrément 2012" code="HUM" value={rc.caseHum ?? null} onChange={v => update('caseHum', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2015, engagés depuis 2012, autres investissements" code="HUN" value={rc.caseHun ?? null} onChange={v => update('caseHun', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés avant 2011" code="HUO" value={rc.caseHuo ?? null} onChange={v => update('caseHuo', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés en 2011, agrément 2010" code="HUP" value={rc.caseHup ?? null} onChange={v => update('caseHup', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés en 2011, agrément 2011" code="HUQ" value={rc.caseHuq ?? null} onChange={v => update('caseHuq', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2010" code="HUR" value={rc.caseHur ?? null} onChange={v => update('caseHur', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2011" code="HUS" value={rc.caseHus ?? null} onChange={v => update('caseHus', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, agrément 2012" code="HUT" value={rc.caseHut ?? null} onChange={v => update('caseHut', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2016, engagés depuis 2012, autres investissements" code="HUU" value={rc.caseHuu ?? null} onChange={v => update('caseHuu', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés avant 2011" code="HVA" value={rc.caseHva ?? null} onChange={v => update('caseHva', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés en 2011, agrément 2010" code="HVB" value={rc.caseHvb ?? null} onChange={v => update('caseHvb', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés en 2011, agrément 2011" code="HVC" value={rc.caseHvc ?? null} onChange={v => update('caseHvc', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2010" code="HVD" value={rc.caseHvd ?? null} onChange={v => update('caseHvd', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2011" code="HVE" value={rc.caseHve ?? null} onChange={v => update('caseHve', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, agrément 2012" code="HVF" value={rc.caseHvf ?? null} onChange={v => update('caseHvf', v)} />
          <SingleMontantLigne label="Immobilier réalisé en 2017, engagés depuis 2012, autres investissements" code="HVG" value={rc.caseHvg ?? null} onChange={v => update('caseHvg', v)} />
        </SousGroupe>

        <SousGroupe titre="Travaux de réhabilitation outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2021" code="HVK" value={rc.caseHvk ?? null} onChange={v => update('caseHvk', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2022" code="HVL" value={rc.caseHvl ?? null} onChange={v => update('caseHvl', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2023" code="HVM" value={rc.caseHvm ?? null} onChange={v => update('caseHvm', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2024" code="HVN" value={rc.caseHvn ?? null} onChange={v => update('caseHvn', v)} />
          <SingleMontantLigne label="Travaux de réhabilitation et confortation, 2025" code="HVO" value={rc.caseHvo ?? null} onChange={v => update('caseHvo', v)} />
        </SousGroupe>

        <SousGroupe titre="Autres cases outre-mer" aide="Montant de la réduction. Plafonds propres et plafonnement global appliqués par l'outil.">
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HQA" value={rc.caseHqa ?? null} onChange={v => update('caseHqa', v)} />
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HKC" value={rc.caseHkc ?? null} onChange={v => update('caseHkc', v)} />
          <SingleMontantLigne label="Case liée, sans effet sur le calcul" code="HLV" value={rc.caseHlv ?? null} onChange={v => update('caseHlv', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default ReductionsCreditsImpotForm;
