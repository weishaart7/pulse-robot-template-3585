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
      description="Cadre 7 de la 2042 : dons et services à la personne. Les autres réductions relèvent de la 2042-RICI, non gérée ici."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="Dons versés à des organismes établis en France" aide="Réduction non restituable. Au-delà des plafonds à 75 %, l'excédent est retenu à 66 % avec les dons 7UF, dans la limite de 20 % du revenu imposable.">
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 1.1 au 13.10.2025" extra="75 %, maximum 1 000 €" code="7UD" value={rc.case7ud} onChange={v => update('case7ud', v)} />
          <SingleMontantLigne label="Aide aux personnes en difficulté, du 14.10 au 31.12.2025" extra="75 %, maximum 2 000 € avec 7UD" code="7UQ" value={rc.case7uq} onChange={v => update('case7uq', v)} />
          <SingleMontantLigne label="Sauvegarde du patrimoine religieux" extra="75 %, maximum 1 000 €" code="7UJ" value={rc.case7uj} onChange={v => update('case7uj', v)} />
          <SingleMontantLigne label="Autres organismes d'intérêt général, associations d'utilité publique, candidats aux élections" extra="66 %" code="7UF" value={rc.case7uf} onChange={v => update('case7uf', v)} />
        </SousGroupe>

        <SousGroupe titre="Services à la personne" aide="Crédit restituable de 50 % des dépenses nettes des aides, dans la limite du plafond.">
          <SingleMontantLigne label="Dépenses de services à la personne" code="7DB" value={rc.case7db} onChange={v => update('case7db', v)} />
          <SingleMontantLigne label="Aides perçues" extra="APA, PCH, CESU préfinancé…" code="7DR" value={rc.case7dr} onChange={v => update('case7dr', v)} />
          <SingleMontantLigne label="Ascendants de plus de 65 ans bénéficiaires de l'APA" extra="nombre" code="7DL" value={rc.case7dl} onChange={v => update('case7dl', v)} />
          <SingleMontantLigne label="Membres du foyer âgés de plus de 65 ans" extra="nombre, hors formulaire" aide="Majore le plafond de 1 500 € chacun ; les enfants et personnes à charge sont repris du Ménage." code="+65" value={rc.membresPlus65Ans} onChange={v => update('membresPlus65Ans', v)} />
          <SingleCaseLigne label="Vous avez employé directement pour la première fois en 2025 un salarié à domicile" code="7DQ" checked={rc.case7dq} onChange={v => update('case7dq', v)} />
          <SingleCaseLigne label="Vous, votre conjoint ou une personne à charge avez la carte d'invalidité ou la CMI invalidité" code="7DG" checked={rc.case7dg} onChange={v => update('case7dg', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default ReductionsCreditsImpotForm;
