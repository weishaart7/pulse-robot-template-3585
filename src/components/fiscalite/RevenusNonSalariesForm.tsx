import { useEffect, useState } from 'react';
import { useRevenusNonSalaries } from '@/hooks/useRevenusNonSalaries';
import { RevenusNonSalaries } from '@/services/revenusNonSalariesService';
import { calculerRevenusNonSalaries, RevenusNonSalariesInput } from '@/lib/fiscalite';
import { DeclarantsHeader, MontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

const NON_SALARIES_VIDE: RevenusNonSalariesInput = {
  case5ta: null, case5ua: null, case5tb: null, case5ub: null, case5te: null, case5ue: null,
  case5ko: null, case5lo: null, case5kp: null, case5lp: null, case5no: null, case5oo: null,
  case5np: null, case5op: null, case5ng: null, case5og: null, case5nh: null, case5oh: null,
  case5ni: null, case5oi: null, case5nj: null, case5oj: null, case5nk: null, case5ok: null,
  case5nl: null, case5ol: null, case5hq: null, case5iq: null, case5ku: null, case5lu: null,
  case5hy: null, case5iy: null,
};

const TEXTE_ALERTE = {
  ventes_au_dela_du_seuil: 'Ventes au-delà de 188 700 € pour un déclarant : le régime micro ne s\'applique plus.',
  services_au_dela_du_seuil: 'Prestations de services et BNC au-delà de 77 700 € pour un déclarant : le régime micro ne s\'applique plus.',
  meubles_au_dela_du_seuil: 'Locations meublées non professionnelles au-delà de 77 700 € pour le foyer : régime réel obligatoire.',
  meubles_non_classes_au_dela_du_seuil: 'Meublés de tourisme non classés au-delà de 15 000 € pour le foyer : régime réel obligatoire.',
} as const;

interface RevenusNonSalariesFormProps {
  onSaved?: (rns: RevenusNonSalaries) => void;
}

export const RevenusNonSalariesForm = ({ onSaved }: RevenusNonSalariesFormProps) => {
  const { data, loading, saving, saveData } = useRevenusNonSalaries();
  const [rns, setRns] = useState<RevenusNonSalariesInput>(NON_SALARIES_VIDE);
  const [rnsId, setRnsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRns(input);
      setRnsId(id);
    }
  }, [data]);

  const update = <K extends keyof RevenusNonSalariesInput>(key: K, value: RevenusNonSalariesInput[K]) => {
    setRns(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...rns, id: rnsId });
    setRnsId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des revenus non salariés..." />;
  }

  const { alertes } = calculerRevenusNonSalaries(rns);

  return (
    <Cadre2042 titre="Revenus des professions non salariées"
      description="Cadre 5 (2042-C-PRO), régimes micro : recettes brutes, sans déduire l'abattement, calculé ici (minimum 305 €)."
      saving={saving} onSave={handleSubmit}>
        <DeclarantsHeader />
        {alertes.map(a => (
          <p key={a} className="py-2 text-[13px] text-muted-foreground">{TEXTE_ALERTE[a]}</p>
        ))}

        <SousGroupe titre="Micro-entrepreneur ayant opté pour le versement libératoire" aide="Impôt déjà payé : ces revenus ne sont retenus que pour le taux effectif et le revenu fiscal de référence.">
          <MontantLigne label="Ventes de marchandises et assimilées" extra="chiffre d'affaires 2025, abattement 71 %" code1="5TA" code2="5UA" value1={rns.case5ta} value2={rns.case5ua} onChange1={v => update('case5ta', v)} onChange2={v => update('case5ua', v)} />
          <MontantLigne label="Prestations de services et locations meublées" extra="chiffre d'affaires 2025, abattement 50 %" code1="5TB" code2="5UB" value1={rns.case5tb} value2={rns.case5ub} onChange1={v => update('case5tb', v)} onChange2={v => update('case5ub', v)} />
          <MontantLigne label="Revenus non commerciaux" extra="recettes 2025, abattement 34 %" code1="5TE" code2="5UE" value1={rns.case5te} value2={rns.case5ue} onChange1={v => update('case5te', v)} onChange2={v => update('case5ue', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus industriels et commerciaux professionnels — micro-BIC">
          <MontantLigne label="Ventes de marchandises et assimilées" extra="abattement 71 %" code1="5KO" code2="5LO" value1={rns.case5ko} value2={rns.case5lo} onChange1={v => update('case5ko', v)} onChange2={v => update('case5lo', v)} />
          <MontantLigne label="Prestations de services et locations meublées professionnelles" extra="abattement 50 %" code1="5KP" code2="5LP" value1={rns.case5kp} value2={rns.case5lp} onChange1={v => update('case5kp', v)} onChange2={v => update('case5lp', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus industriels et commerciaux non professionnels — micro-BIC" aide="Autres que les locations meublées non professionnelles.">
          <MontantLigne label="Ventes de marchandises et assimilées" extra="abattement 71 %" code1="5NO" code2="5OO" value1={rns.case5no} value2={rns.case5oo} onChange1={v => update('case5no', v)} onChange2={v => update('case5oo', v)} />
          <MontantLigne label="Prestations de services" extra="abattement 50 %" code1="5NP" code2="5OP" value1={rns.case5np} value2={rns.case5op} onChange1={v => update('case5np', v)} onChange2={v => update('case5op', v)} />
        </SousGroupe>

        <SousGroupe titre="Locations meublées non professionnelles — micro-BIC" aide="Prélèvements sociaux calculés d'office par la DGFiP, sauf pour les locations soumises aux cotisations sociales.">
          <MontantLigne label="Chambres d'hôtes et meublés de tourisme classés" extra="abattement 50 %" code1="5NG" code2="5OG" value1={rns.case5ng} value2={rns.case5og} onChange1={v => update('case5ng', v)} onChange2={v => update('case5og', v)} />
          <MontantLigne label="Meublés de tourisme non classés" extra="abattement 30 %" code1="5NH" code2="5OH" value1={rns.case5nh} value2={rns.case5oh} onChange1={v => update('case5nh', v)} onChange2={v => update('case5oh', v)} />
          <MontantLigne label="Autres locations meublées" extra="abattement 50 %" code1="5NI" code2="5OI" value1={rns.case5ni} value2={rns.case5oi} onChange1={v => update('case5ni', v)} onChange2={v => update('case5oi', v)} />
          <MontantLigne label="Soumises aux cotisations sociales : chambres d'hôtes et meublés de tourisme classés" extra="abattement 50 %" code1="5NJ" code2="5OJ" value1={rns.case5nj} value2={rns.case5oj} onChange1={v => update('case5nj', v)} onChange2={v => update('case5oj', v)} />
          <MontantLigne label="Soumises aux cotisations sociales : meublés de tourisme non classés" extra="abattement 30 %" code1="5NK" code2="5OK" value1={rns.case5nk} value2={rns.case5ok} onChange1={v => update('case5nk', v)} onChange2={v => update('case5ok', v)} />
          <MontantLigne label="Soumises aux cotisations sociales : autres locations meublées" extra="abattement 50 %" code1="5NL" code2="5OL" value1={rns.case5nl} value2={rns.case5ol} onChange1={v => update('case5nl', v)} onChange2={v => update('case5ol', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus non commerciaux — micro-BNC">
          <MontantLigne label="Professionnels : recettes brutes" extra="abattement 34 %" code1="5HQ" code2="5IQ" value1={rns.case5hq} value2={rns.case5iq} onChange1={v => update('case5hq', v)} onChange2={v => update('case5iq', v)} />
          <MontantLigne label="Non professionnels : recettes brutes" extra="abattement 34 %" code1="5KU" code2="5LU" value1={rns.case5ku} value2={rns.case5lu} onChange1={v => update('case5ku', v)} onChange2={v => update('case5lu', v)} />
        </SousGroupe>

        <SousGroupe titre="BA, BIC, BNC à imposer aux prélèvements sociaux" aide="Revenus non professionnels non soumis aux cotisations sociales, hors locations meublées : montant net après abattement (micro-BIC 71 % ou 50 %, micro-BNC 34 %).">
          <MontantLigne label="Revenus nets" code1="5HY" code2="5IY" value1={rns.case5hy} value2={rns.case5iy} onChange1={v => update('case5hy', v)} onChange2={v => update('case5iy', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default RevenusNonSalariesForm;
