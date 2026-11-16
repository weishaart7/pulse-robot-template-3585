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
    </Cadre2042>
  );
};

export default ReductionsCreditsImpotForm;
