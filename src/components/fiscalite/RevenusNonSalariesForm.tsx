import { useEffect, useState } from 'react';
import { useRevenusNonSalaries } from '@/hooks/useRevenusNonSalaries';
import { RevenusNonSalaries } from '@/services/revenusNonSalariesService';
import { calculerRevenusNonSalaries, REVENUS_NON_SALARIES_VIDE, RevenusNonSalariesInput } from '@/lib/fiscalite';
import { DeclarantsHeader, MontantEclateLigne, MontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';


const TEXTE_ALERTE = {
  ventes_au_dela_du_seuil: 'Ventes au-delà de 188 700 € pour un déclarant : régime micro perdu si le seuil est aussi dépassé l\'année suivante (deux années consécutives).',
  services_au_dela_du_seuil: 'Prestations de services et BNC au-delà de 77 700 € pour un déclarant : régime micro perdu si le seuil est aussi dépassé l\'année suivante (deux années consécutives).',
  meubles_au_dela_du_seuil: 'Locations meublées non professionnelles au-delà de 77 700 € pour le foyer : régime réel obligatoire si le seuil est dépassé deux années consécutives.',
  meubles_non_classes_au_dela_du_seuil: 'Meublés de tourisme non classés au-delà de 15 000 € pour le foyer : régime réel obligatoire si le seuil est dépassé deux années consécutives.',
  ba_micro_au_dela_du_seuil: 'Recettes agricoles 2025 au-delà de 120 000 € pour un déclarant : le micro-BA s\'apprécie sur la moyenne des trois années précédentes, à vérifier.',
} as const;

interface RevenusNonSalariesFormProps {
  onSaved?: (rns: RevenusNonSalaries) => void;
}

export const RevenusNonSalariesForm = ({ onSaved }: RevenusNonSalariesFormProps) => {
  const { data, loading, saving, saveData } = useRevenusNonSalaries();
  const [rns, setRns] = useState<RevenusNonSalariesInput>(REVENUS_NON_SALARIES_VIDE);
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
      description="Cadre 5 (2042-C-PRO). Micro : recettes brutes, abattement calculé ici (minimum 305 €). Réel : bénéfice ou déficit issu de la comptabilité."
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

        <SousGroupe titre="BIC professionnels — plus-values et revenus exonérés du micro-BIC">
          <MontantLigne label="Plus-values nettes à court terme" code1="5KX" code2="5LX" value1={rns.case5kx} value2={rns.case5lx} onChange1={v => update('case5kx', v)} onChange2={v => update('case5lx', v)} />
          <MontantLigne label="Moins-values nettes à court terme" code1="5KJ" code2="5LJ" value1={rns.case5kj} value2={rns.case5lj} onChange1={v => update('case5kj', v)} onChange2={v => update('case5lj', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5KQ" code2="5LQ" value1={rns.case5kq} value2={rns.case5lq} onChange1={v => update('case5kq', v)} onChange2={v => update('case5lq', v)} />
          <MontantLigne label="Moins-values nettes à long terme" code1="5KR" code2="5LR" value1={rns.case5kr} value2={rns.case5lr} onChange1={v => update('case5kr', v)} onChange2={v => update('case5lr', v)} />
          <MontantLigne label="Revenus nets exonérés (régimes zonés)" code1="5KN" code2="5LN" value1={rns.case5kn} value2={rns.case5ln} onChange1={v => update('case5kn', v)} onChange2={v => update('case5ln', v)} />
        </SousGroupe>

        <SousGroupe titre="BIC professionnels — régime du bénéfice réel">
          <MontantLigne label="Revenus imposables" code1="5KC" code2="5LC" value1={rns.case5kc} value2={rns.case5lc} onChange1={v => update('case5kc', v)} onChange2={v => update('case5lc', v)} />
          <MontantLigne label="Déficits" code1="5KF" code2="5LF" value1={rns.case5kf} value2={rns.case5lf} onChange1={v => update('case5kf', v)} onChange2={v => update('case5lf', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5KE" code2="5LE" value1={rns.case5ke} value2={rns.case5le} onChange1={v => update('case5ke', v)} onChange2={v => update('case5le', v)} />
          <MontantLigne label="Produits de brevets taxables à 10 %" code1="5UI" code2="5VI" value1={rns.case5ui} value2={rns.case5vi} onChange1={v => update('case5ui', v)} onChange2={v => update('case5vi', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5DF" code2="5EF" value1={rns.case5df} value2={rns.case5ef} onChange1={v => update('case5df', v)} onChange2={v => update('case5ef', v)} />
          <MontantLigne label="Revenus exonérés (régimes zonés)" code1="5KB" code2="5LB" value1={rns.case5kb} value2={rns.case5lb} onChange1={v => update('case5kb', v)} onChange2={v => update('case5lb', v)} />
        </SousGroupe>

        <SousGroupe titre="BIC non professionnels — plus-values et revenus exonérés du micro-BIC">
          <MontantLigne label="Plus-values nettes à court terme" code1="5NX" code2="5OX" value1={rns.case5nx} value2={rns.case5ox} onChange1={v => update('case5nx', v)} onChange2={v => update('case5ox', v)} />
          <MontantLigne label="Moins-values nettes à court terme" code1="5IU" code2="5RZ" value1={rns.case5iu} value2={rns.case5rz} onChange1={v => update('case5iu', v)} onChange2={v => update('case5rz', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5NQ" code2="5OQ" value1={rns.case5nq} value2={rns.case5oq} onChange1={v => update('case5nq', v)} onChange2={v => update('case5oq', v)} />
          <MontantLigne label="Moins-values nettes à long terme" code1="5NR" code2="5OR" value1={rns.case5nr} value2={rns.case5or} onChange1={v => update('case5nr', v)} onChange2={v => update('case5or', v)} />
          <MontantLigne label="Revenus nets exonérés (régimes zonés)" code1="5NN" code2="5ON" value1={rns.case5nn} value2={rns.case5on} onChange1={v => update('case5nn', v)} onChange2={v => update('case5on', v)} />
        </SousGroupe>

        <SousGroupe titre="BIC non professionnels — régime du bénéfice réel" aide="Déficits imputables uniquement sur les BIC non professionnels des six années suivantes.">
          <MontantLigne label="Revenus imposables" code1="5NC" code2="5OC" value1={rns.case5nc} value2={rns.case5oc} onChange1={v => update('case5nc', v)} onChange2={v => update('case5oc', v)} />
          <MontantLigne label="Déficits" code1="5NF" code2="5OF" value1={rns.case5nf} value2={rns.case5of} onChange1={v => update('case5nf', v)} onChange2={v => update('case5of', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5NE" code2="5OE" value1={rns.case5ne} value2={rns.case5oe} onChange1={v => update('case5ne', v)} onChange2={v => update('case5oe', v)} />
          <MontantLigne label="Produits de brevets taxables à 10 %" code1="5TF" code2="5UF" value1={rns.case5tf} value2={rns.case5uf} onChange1={v => update('case5tf', v)} onChange2={v => update('case5uf', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5UR" code2="5VR" value1={rns.case5ur} value2={rns.case5vr} onChange1={v => update('case5ur', v)} onChange2={v => update('case5vr', v)} />
          <MontantLigne label="Revenus exonérés (régimes zonés)" code1="5NB" code2="5OB" value1={rns.case5nb} value2={rns.case5ob} onChange1={v => update('case5nb', v)} onChange2={v => update('case5ob', v)} />
          <MontantEclateLigne
            label="Déficits des années antérieures non encore déduits"
            items={[
              { label: '2019', code: '5RN', value: rns.case5rn, onChange: v => update('case5rn', v) },
              { label: '2020', code: '5RO', value: rns.case5ro, onChange: v => update('case5ro', v) },
              { label: '2021', code: '5RP', value: rns.case5rp, onChange: v => update('case5rp', v) },
              { label: '2022', code: '5RQ', value: rns.case5rq, onChange: v => update('case5rq', v) },
              { label: '2023', code: '5RR', value: rns.case5rr, onChange: v => update('case5rr', v) },
              { label: '2024', code: '5RW', value: rns.case5rw, onChange: v => update('case5rw', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Locations meublées non professionnelles — régime du bénéfice réel" aide="Déficits imputables uniquement sur les revenus des locations meublées non professionnelles des dix années suivantes.">
          <MontantLigne label="Revenus imposables" code1="5NA" code2="5OA" value1={rns.case5na} value2={rns.case5oa} onChange1={v => update('case5na', v)} onChange2={v => update('case5oa', v)} />
          <MontantLigne label="Revenus soumis aux cotisations sociales" code1="5NM" code2="5OM" value1={rns.case5nm} value2={rns.case5om} onChange1={v => update('case5nm', v)} onChange2={v => update('case5om', v)} />
          <MontantLigne label="Déficits" code1="5NY" code2="5OY" value1={rns.case5ny} value2={rns.case5oy} onChange1={v => update('case5ny', v)} onChange2={v => update('case5oy', v)} />
          <MontantLigne label="Déficits relevant des organismes de sécurité sociale" code1="5WE" code2="5XE" value1={rns.case5we} value2={rns.case5xe} onChange1={v => update('case5we', v)} onChange2={v => update('case5xe', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5EY" code2="5FY" value1={rns.case5ey} value2={rns.case5fy} onChange1={v => update('case5ey', v)} onChange2={v => update('case5fy', v)} />
          <MontantEclateLigne
            label="Déficits des années antérieures non encore déduits"
            items={[
              { label: '2015', code: '5GA', value: rns.case5ga, onChange: v => update('case5ga', v) },
              { label: '2016', code: '5GB', value: rns.case5gb, onChange: v => update('case5gb', v) },
              { label: '2017', code: '5GC', value: rns.case5gc, onChange: v => update('case5gc', v) },
              { label: '2018', code: '5GD', value: rns.case5gd, onChange: v => update('case5gd', v) },
              { label: '2019', code: '5GE', value: rns.case5ge, onChange: v => update('case5ge', v) },
              { label: '2020', code: '5GF', value: rns.case5gf, onChange: v => update('case5gf', v) },
              { label: '2021', code: '5GG', value: rns.case5gg, onChange: v => update('case5gg', v) },
              { label: '2022', code: '5GH', value: rns.case5gh, onChange: v => update('case5gh', v) },
              { label: '2023', code: '5GI', value: rns.case5gi, onChange: v => update('case5gi', v) },
              { label: '2024', code: '5GJ', value: rns.case5gj, onChange: v => update('case5gj', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="BNC professionnels — plus-values et revenus exonérés du micro-BNC">
          <MontantLigne label="Plus-values nettes à court terme" code1="5HV" code2="5IV" value1={rns.case5hv} value2={rns.case5iv} onChange1={v => update('case5hv', v)} onChange2={v => update('case5iv', v)} />
          <MontantLigne label="Moins-values nettes à court terme" code1="5KZ" code2="5LZ" value1={rns.case5kz} value2={rns.case5lz} onChange1={v => update('case5kz', v)} onChange2={v => update('case5lz', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5HR" code2="5IR" value1={rns.case5hr} value2={rns.case5ir} onChange1={v => update('case5hr', v)} onChange2={v => update('case5ir', v)} />
          <MontantLigne label="Moins-values nettes à long terme" code1="5HS" code2="5IS" value1={rns.case5hs} value2={rns.case5is} onChange1={v => update('case5hs', v)} onChange2={v => update('case5is', v)} />
          <MontantLigne label="Revenus nets exonérés (régimes zonés)" code1="5HP" code2="5IP" value1={rns.case5hp} value2={rns.case5ip} onChange1={v => update('case5hp', v)} onChange2={v => update('case5ip', v)} />
        </SousGroupe>

        <SousGroupe titre="BNC professionnels — régime de la déclaration contrôlée">
          <MontantLigne label="Revenus imposables" code1="5QC" code2="5RC" value1={rns.case5qc} value2={rns.case5rc} onChange1={v => update('case5qc', v)} onChange2={v => update('case5rc', v)} />
          <MontantLigne label="Déficits, y compris inventeurs non professionnels" code1="5QE" code2="5RE" value1={rns.case5qe} value2={rns.case5re} onChange1={v => update('case5qe', v)} onChange2={v => update('case5re', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5QD" code2="5RD" value1={rns.case5qd} value2={rns.case5rd} onChange1={v => update('case5qd', v)} onChange2={v => update('case5rd', v)} />
          <MontantLigne label="Jeunes créateurs : abattement de 50 % (déjà déduit des revenus imposables)" code1="5QL" code2="5RL" value1={rns.case5ql} value2={rns.case5rl} onChange1={v => update('case5ql', v)} onChange2={v => update('case5rl', v)} />
          <MontantLigne label="Agents généraux d'assurances : indemnité de cessation (montant brut)" code1="5QM" code2="5RM" value1={rns.case5qm} value2={rns.case5rm} onChange1={v => update('case5qm', v)} onChange2={v => update('case5rm', v)} />
          <MontantLigne label="Produits de brevets taxables à 10 %" code1="5QA" code2="5RA" value1={rns.case5qa} value2={rns.case5ra} onChange1={v => update('case5qa', v)} onChange2={v => update('case5ra', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5XJ" code2="5YJ" value1={rns.case5xj} value2={rns.case5yj} onChange1={v => update('case5xj', v)} onChange2={v => update('case5yj', v)} />
          <MontantLigne label="Revenus exonérés (régimes zonés)" code1="5QB" code2="5RB" value1={rns.case5qb} value2={rns.case5rb} onChange1={v => update('case5qb', v)} onChange2={v => update('case5rb', v)} />
        </SousGroupe>

        <SousGroupe titre="BNC non professionnels — plus-values et revenus exonérés du micro-BNC">
          <MontantLigne label="Plus-values nettes à court terme" code1="5KY" code2="5LY" value1={rns.case5ky} value2={rns.case5ly} onChange1={v => update('case5ky', v)} onChange2={v => update('case5ly', v)} />
          <MontantLigne label="Moins-values nettes à court terme" code1="5JU" code2="5LD" value1={rns.case5ju} value2={rns.case5ld} onChange1={v => update('case5ju', v)} onChange2={v => update('case5ld', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5KV" code2="5LV" value1={rns.case5kv} value2={rns.case5lv} onChange1={v => update('case5kv', v)} onChange2={v => update('case5lv', v)} />
          <MontantLigne label="Moins-values nettes à long terme" code1="5KW" code2="5LW" value1={rns.case5kw} value2={rns.case5lw} onChange1={v => update('case5kw', v)} onChange2={v => update('case5lw', v)} />
          <MontantLigne label="Revenus nets exonérés (régimes zonés)" code1="5TH" code2="5UH" value1={rns.case5th} value2={rns.case5uh} onChange1={v => update('case5th', v)} onChange2={v => update('case5uh', v)} />
        </SousGroupe>

        <SousGroupe titre="BNC non professionnels — régime de la déclaration contrôlée" aide="Déficits imputables uniquement sur les BNC non professionnels des six années suivantes.">
          <MontantLigne label="Revenus imposables" code1="5JG" code2="5RF" value1={rns.case5jg} value2={rns.case5rf} onChange1={v => update('case5jg', v)} onChange2={v => update('case5rf', v)} />
          <MontantLigne label="Jeunes créateurs : abattement de 50 % (déjà déduit des revenus imposables)" code1="5SV" code2="5SW" value1={rns.case5sv} value2={rns.case5sw} onChange1={v => update('case5sv', v)} onChange2={v => update('case5sw', v)} />
          <MontantLigne label="Déficits" code1="5JJ" code2="5RG" value1={rns.case5jj} value2={rns.case5rg} onChange1={v => update('case5jj', v)} onChange2={v => update('case5rg', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5SO" code2="5NT" value1={rns.case5so} value2={rns.case5nt} onChange1={v => update('case5so', v)} onChange2={v => update('case5nt', v)} />
          <MontantLigne label="Inventeurs, auteurs de logiciels : produits taxables à 10 %" code1="5QJ" code2="5RJ" value1={rns.case5qj} value2={rns.case5rj} onChange1={v => update('case5qj', v)} onChange2={v => update('case5rj', v)} />
          <MontantLigne label="Inventeurs : produits à 10 % soumis aux cotisations sociales (sans PS)" code1="5TC" code2="5UC" value1={rns.case5tc} value2={rns.case5uc} onChange1={v => update('case5tc', v)} onChange2={v => update('case5uc', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5XS" code2="5YS" value1={rns.case5xs} value2={rns.case5ys} onChange1={v => update('case5xs', v)} onChange2={v => update('case5ys', v)} />
          <MontantLigne label="Revenus exonérés (régimes zonés)" code1="5HK" code2="5JK" value1={rns.case5hk} value2={rns.case5jk} onChange1={v => update('case5hk', v)} onChange2={v => update('case5jk', v)} />
          <MontantEclateLigne
            label="Déficits des années antérieures non encore déduits"
            items={[
              { label: '2019', code: '5HT', value: rns.case5ht, onChange: v => update('case5ht', v) },
              { label: '2020', code: '5IT', value: rns.case5it, onChange: v => update('case5it', v) },
              { label: '2021', code: '5JT', value: rns.case5jt, onChange: v => update('case5jt', v) },
              { label: '2022', code: '5KT', value: rns.case5kt, onChange: v => update('case5kt', v) },
              { label: '2023', code: '5LT', value: rns.case5lt, onChange: v => update('case5lt', v) },
              { label: '2024', code: '5MT', value: rns.case5mt, onChange: v => update('case5mt', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Bénéfices agricoles — régime micro-BA" aide="Recettes brutes de l'année : abattement de 87 % calculé ici, minimum 305 €. L'administration retient la moyenne des recettes 2023-2025 ; le calcul est approché sur la seule année.">
          <MontantLigne label="Recettes brutes (abattement 87 %)" code1="5XB" code2="5YB" value1={rns.case5xb} value2={rns.case5yb} onChange1={v => update('case5xb', v)} onChange2={v => update('case5yb', v)} />
          <MontantLigne label="Plus-values nettes à court terme" code1="5HW" code2="5IW" value1={rns.case5hw} value2={rns.case5iw} onChange1={v => update('case5hw', v)} onChange2={v => update('case5iw', v)} />
          <MontantLigne label="Moins-values nettes à court terme" code1="5XO" code2="5YO" value1={rns.case5xo} value2={rns.case5yo} onChange1={v => update('case5xo', v)} onChange2={v => update('case5yo', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5HX" code2="5IX" value1={rns.case5hx} value2={rns.case5ix} onChange1={v => update('case5hx', v)} onChange2={v => update('case5ix', v)} />
          <MontantLigne label="Moins-values nettes à long terme" code1="5XN" code2="5YN" value1={rns.case5xn} value2={rns.case5yn} onChange1={v => update('case5xn', v)} onChange2={v => update('case5yn', v)} />
          <MontantLigne label="Revenus nets exonérés (régimes zonés)" code1="5XA" code2="5YA" value1={rns.case5xa} value2={rns.case5ya} onChange1={v => update('case5xa', v)} onChange2={v => update('case5ya', v)} />
          <MontantLigne label="Revenu forfaitaire provenant des coupes de bois" code1="5HD" code2="5ID" value1={rns.case5hd} value2={rns.case5id} onChange1={v => update('case5hd', v)} onChange2={v => update('case5id', v)} />
        </SousGroupe>

        <SousGroupe titre="Bénéfices agricoles — régime du bénéfice réel" aide="Le déficit de l'année ne s'impute sur le revenu global que si les autres revenus nets du foyer n'excèdent pas 128 826 €.">
          <MontantLigne label="Revenus imposables" code1="5HC" code2="5IC" value1={rns.case5hc} value2={rns.case5ic} onChange1={v => update('case5hc', v)} onChange2={v => update('case5ic', v)} />
          <MontantLigne label="Fraction excédant la moyenne triennale, imposée au taux marginal" code1="5XT" code2="5XU" value1={rns.case5xt} value2={rns.case5xu} onChange1={v => update('case5xt', v)} onChange2={v => update('case5xu', v)} />
          <MontantLigne label="Déficits" code1="5HF" code2="5IF" value1={rns.case5hf} value2={rns.case5if} onChange1={v => update('case5hf', v)} onChange2={v => update('case5if', v)} />
          <MontantLigne label="Plus-values nettes à long terme" code1="5HE" code2="5IE" value1={rns.case5he} value2={rns.case5ie} onChange1={v => update('case5he', v)} onChange2={v => update('case5ie', v)} />
          <MontantLigne label="Produits de brevets taxables à 10 %" code1="5HA" code2="5IA" value1={rns.case5ha} value2={rns.case5ia} onChange1={v => update('case5ha', v)} onChange2={v => update('case5ia', v)} />
          <MontantLigne label="Revenus de source étrangère avec crédit d'impôt égal à l'impôt français" code1="5AK" code2="5BK" value1={rns.case5ak} value2={rns.case5bk} onChange1={v => update('case5ak', v)} onChange2={v => update('case5bk', v)} />
          <MontantLigne label="Revenus exonérés (régimes zonés)" code1="5HB" code2="5IB" value1={rns.case5hb} value2={rns.case5ib} onChange1={v => update('case5hb', v)} onChange2={v => update('case5ib', v)} />
          <MontantEclateLigne
            label="Déficits des années antérieures non encore déduits"
            items={[
              { label: '2019', code: '5QF', value: rns.case5qf, onChange: v => update('case5qf', v) },
              { label: '2020', code: '5QG', value: rns.case5qg, onChange: v => update('case5qg', v) },
              { label: '2021', code: '5QN', value: rns.case5qn, onChange: v => update('case5qn', v) },
              { label: '2022', code: '5QO', value: rns.case5qo, onChange: v => update('case5qo', v) },
              { label: '2023', code: '5QP', value: rns.case5qp, onChange: v => update('case5qp', v) },
              { label: '2024', code: '5QQ', value: rns.case5qq, onChange: v => update('case5qq', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="BA, BIC, BNC à imposer aux prélèvements sociaux" aide="Revenus non soumis aux cotisations sociales, hors locations meublées et plus-values à long terme : montant net après abattement (micro-BIC 71 % ou 50 %, micro-BNC 34 %, micro-BA 87 %). Plus-values exonérées départ à la retraite : prélèvements sociaux seuls.">
          <MontantLigne label="Revenus nets" code1="5HY" code2="5IY" value1={rns.case5hy} value2={rns.case5iy} onChange1={v => update('case5hy', v)} onChange2={v => update('case5iy', v)} />
          <MontantLigne label="Plus-values à long terme exonérées départ à la retraite" code1="5HG" code2="5IG" value1={rns.case5hg} value2={rns.case5ig} onChange1={v => update('case5hg', v)} onChange2={v => update('case5ig', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default RevenusNonSalariesForm;
