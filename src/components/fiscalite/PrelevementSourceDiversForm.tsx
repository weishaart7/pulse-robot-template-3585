import { useEffect, useState } from 'react';
import { usePrelevementSourceDivers } from '@/hooks/usePrelevementSourceDivers';
import { PrelevementSourceDivers } from '@/services/prelevementSourceDiversService';
import { PRELEVEMENT_SOURCE_DIVERS_VIDE, PrelevementSourceDiversInput } from '@/lib/fiscalite';
import { MontantEclateLigne, SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

interface PrelevementSourceDiversFormProps {
  onSaved?: (ps: PrelevementSourceDivers) => void;
}

export const PrelevementSourceDiversForm = ({ onSaved }: PrelevementSourceDiversFormProps) => {
  const { data, loading, saving, saveData } = usePrelevementSourceDivers();
  const [ps, setPs] = useState<PrelevementSourceDiversInput>(PRELEVEMENT_SOURCE_DIVERS_VIDE);
  const [psId, setPsId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setPs(input);
      setPsId(id);
    }
  }, [data]);

  const update = <K extends keyof PrelevementSourceDiversInput>(key: K, value: PrelevementSourceDiversInput[K]) => {
    setPs(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...ps, id: psId });
    setPsId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement du prélèvement à la source..." />;
  }

  return (
    <Cadre2042 titre="Prélèvement à la source et divers"
      description="Cadres 8 de la 2042 et de la 2042-C : sommes déjà prélevées, revenus étrangers et exonérations de CSG-CRDS."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="Prélèvement à la source déjà payé" aide="Retranché de l'impôt calculé pour obtenir le solde à payer ou à rembourser.">
          <MontantEclateLigne
            label="Retenue à la source sur les salaires et pensions"
            items={[
              { label: 'Déclarant 1', code: '8HV', value: ps.case8hv, onChange: v => update('case8hv', v) },
              { label: 'Déclarant 2', code: '8IV', value: ps.case8iv, onChange: v => update('case8iv', v) },
              { label: '1re pers. à charge', code: '8JV', value: ps.case8jv, onChange: v => update('case8jv', v) },
              { label: '2e pers. à charge', code: '8KV', value: ps.case8kv, onChange: v => update('case8kv', v) },
            ]}
          />
          <MontantEclateLigne
            label="Acomptes d'impôt sur le revenu"
            items={[
              { label: 'Déclarant 1', code: '8HW', value: ps.case8hw, onChange: v => update('case8hw', v) },
              { label: 'Déclarant 2', code: '8IW', value: ps.case8iw, onChange: v => update('case8iw', v) },
              { label: '1re pers. à charge', code: '8JW', value: ps.case8jw, onChange: v => update('case8jw', v) },
              { label: '2e pers. à charge', code: '8KW', value: ps.case8kw, onChange: v => update('case8kw', v) },
            ]}
          />
          <MontantEclateLigne
            label="Acomptes de prélèvements sociaux"
            items={[
              { label: 'Déclarant 1', code: '8HX', value: ps.case8hx, onChange: v => update('case8hx', v) },
              { label: 'Déclarant 2', code: '8IX', value: ps.case8ix, onChange: v => update('case8ix', v) },
              { label: '1re pers. à charge', code: '8JX', value: ps.case8jx, onChange: v => update('case8jx', v) },
              { label: '2e pers. à charge', code: '8KX', value: ps.case8kx, onChange: v => update('case8kx', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Remboursement de trop-prélevé déjà obtenu">
          <MontantEclateLigne
            label="Impôt sur le revenu"
            items={[
              { label: 'Déclarant 1', code: '8HY', value: ps.case8hy, onChange: v => update('case8hy', v) },
              { label: 'Déclarant 2', code: '8IY', value: ps.case8iy, onChange: v => update('case8iy', v) },
              { label: '1re pers. à charge', code: '8JY', value: ps.case8jy, onChange: v => update('case8jy', v) },
              { label: '2e pers. à charge', code: '8KY', value: ps.case8ky, onChange: v => update('case8ky', v) },
            ]}
          />
          <MontantEclateLigne
            label="Prélèvements sociaux"
            items={[
              { label: 'Déclarant 1', code: '8HZ', value: ps.case8hz, onChange: v => update('case8hz', v) },
              { label: 'Déclarant 2', code: '8IZ', value: ps.case8iz, onChange: v => update('case8iz', v) },
              { label: '1re pers. à charge', code: '8JZ', value: ps.case8jz, onChange: v => update('case8jz', v) },
              { label: '2e pers. à charge', code: '8KZ', value: ps.case8kz, onChange: v => update('case8kz', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Acomptes et avances">
          <MontantEclateLigne
            label="Acompte de CDHR versé en 2025" aide="Informatif : la contribution différentielle sur les hauts revenus n'est pas calculée."
            items={[
              { label: 'Déclarant 1', code: '8HR', value: ps.case8hr, onChange: v => update('case8hr', v) },
              { label: 'Déclarant 2', code: '8HS', value: ps.case8hs, onChange: v => update('case8hs', v) },
            ]}
          />
          <SingleMontantLigne label="Avance de 60 % sur réductions et crédits d'impôt" extra="versée en début d'année sur votre compte" code="8EA" value={ps.case8ea} onChange={v => update('case8ea', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus de source étrangère et taux effectif">
          <SingleMontantLigne label="Revenus exonérés retenus pour le calcul du taux effectif" extra="autres que salaires, pensions et revenus fonciers" code="8TI" value={ps.case8ti} onChange={v => update('case8ti', v)} />
          <SingleMontantLigne label="Revenus de source étrangère ouvrant droit à un crédit d'impôt égal à l'impôt français" code="8TK" value={ps.case8tk} onChange={v => update('case8tk', v)} />
          <SingleMontantLigne label="Revenus de capitaux mobiliers et plus-values étrangers" extra="crédit d'impôt égal à l'impôt étranger" aide="Déjà déclarés dans leur catégorie : sert au calcul du crédit, au plus l'impôt français correspondant." code="8PL" value={ps.case8pl} onChange={v => update('case8pl', v)} />
          <SingleMontantLigne label="Impôt payé à l'étranger sur ces revenus" code="8VL" value={ps.case8vl} onChange={v => update('case8vl', v)} />
          <SingleMontantLigne label="Autres revenus nets étrangers" extra="crédit d'impôt égal à l'impôt étranger" aide="Déjà déclarés dans leur catégorie : sert au calcul du crédit, au plus l'impôt français correspondant." code="8PM" value={ps.case8pm} onChange={v => update('case8pm', v)} />
          <MontantEclateLigne
            label="Impôt payé à l'étranger sur ces autres revenus"
            items={[
              { label: 'Déclarant 1', code: '8VM', value: ps.case8vm, onChange: v => update('case8vm', v) },
              { label: 'Déclarant 2', code: '8WM', value: ps.case8wm, onChange: v => update('case8wm', v) },
              { label: 'Pers. à charge', code: '8UM', value: ps.case8um, onChange: v => update('case8um', v) },
            ]}
          />
          <SingleMontantLigne label="Non-résidents : retenue à la source prélevée en France" extra="informatif, annexe 2041 E" code="8TA" value={ps.case8ta} onChange={v => update('case8ta', v)} />
          <SingleCaseLigne label="Revenus exonérés non retenus pour le calcul du taux effectif" aide="Conventions internationales, organisations internationales, missions diplomatiques : informatif." code="8VF" checked={ps.case8vf} onChange={v => update('case8vf', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus d'activité et de remplacement soumis aux contributions sociales" aide="Revenus de source étrangère et salaire différé de l'héritier d'un exploitant agricole : CSG au taux indiqué, CRDS 0,5 %, CASA 0,3 % sur les pensions à 8,3 % et 6,6 % et les préretraites.">
          <SingleMontantLigne label="Revenus non salariaux · CSG 9,2 %" code="8TQ" value={ps.case8tq} onChange={v => update('case8tq', v)} />
          <SingleMontantLigne label="Salaires · CSG 9,2 %" code="8TR" value={ps.case8tr} onChange={v => update('case8tr', v)} />
          <SingleMontantLigne label="Allocations de préretraite · CSG 9,2 %" code="8SC" value={ps.case8sc} onChange={v => update('case8sc', v)} />
          <MontantEclateLigne
            label="Allocations de chômage"
            items={[
              { label: '6,2 %', code: '8SW', value: ps.case8sw, onChange: v => update('case8sw', v) },
              { label: '3,8 %', code: '8SX', value: ps.case8sx, onChange: v => update('case8sx', v) },
            ]}
          />
          <SingleMontantLigne label="Indemnités journalières de maladie, maternité, accident du travail · CSG 6,2 %" code="8TW" value={ps.case8tw} onChange={v => update('case8tw', v)} />
          <MontantEclateLigne
            label="Pensions de retraite et d'invalidité · CSG 8,3 %"
            items={[
              { label: 'Déclarant 1', code: '8TV', value: ps.case8tv, onChange: v => update('case8tv', v) },
              { label: 'Déclarant 2', code: '8QV', value: ps.case8qv, onChange: v => update('case8qv', v) },
            ]}
          />
          <MontantEclateLigne
            label="Pensions de retraite et d'invalidité · CSG 6,6 %"
            items={[
              { label: 'Déclarant 1', code: '8TH', value: ps.case8th, onChange: v => update('case8th', v) },
              { label: 'Déclarant 2', code: '8QH', value: ps.case8qh, onChange: v => update('case8qh', v) },
            ]}
          />
          <MontantEclateLigne
            label="Pensions de retraite et d'invalidité · CSG 3,8 %"
            items={[
              { label: 'Déclarant 1', code: '8TX', value: ps.case8tx, onChange: v => update('case8tx', v) },
              { label: 'Déclarant 2', code: '8QX', value: ps.case8qx, onChange: v => update('case8qx', v) },
            ]}
          />
          <MontantEclateLigne
            label="Pensions en capital soumises à imposition forfaitaire"
            items={[
              { label: '8,3 %', code: '8SA', value: ps.case8sa, onChange: v => update('case8sa', v) },
              { label: '6,6 %', code: '8SD', value: ps.case8sd, onChange: v => update('case8sd', v) },
              { label: '3,8 %', code: '8SB', value: ps.case8sb, onChange: v => update('case8sb', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Revenus du patrimoine exonérés de CSG et de CRDS" aide="Affiliés à un régime d'assurance maladie de l'EEE, du Royaume-Uni ou de la Suisse : seuls les montants saisis réduisent les prélèvements sociaux (le prélèvement de solidarité reste dû).">
          <SingleCaseLigne label="Affiliation hors régime français, déclarant 1" code="8SH" checked={ps.case8sh} onChange={v => update('case8sh', v)} />
          <SingleCaseLigne label="Affiliation hors régime français, déclarant 2" code="8SI" checked={ps.case8si} onChange={v => update('case8si', v)} />
          <SingleMontantLigne label="Revenus fonciers" extra="après abattement si régime micro" code="8RF" value={ps.case8rf} onChange={v => update('case8rf', v)} />
          <SingleMontantLigne label="Rentes viagères à titre onéreux" extra="montant net après abattement" code="8RV" value={ps.case8rv} onChange={v => update('case8rv', v)} />
          <SingleMontantLigne label="Revenus de capitaux mobiliers" code="8RC" value={ps.case8rc} onChange={v => update('case8rc', v)} />
          <SingleMontantLigne label="Plus-values de cession de valeurs mobilières et gains assimilés" code="8RM" value={ps.case8rm} onChange={v => update('case8rm', v)} />
        </SousGroupe>

        <SousGroupe titre="Divers">
          <SingleMontantLigne label="Reprises de réductions ou de crédits d'impôt" code="8TF" value={ps.case8tf} onChange={v => update('case8tf', v)} />
          <SingleMontantLigne label="Plus-values en report d'imposition non expiré" extra="informatif" code="8UT" value={ps.case8ut} onChange={v => update('case8ut', v)} />
          <SingleCaseLigne label="Contrats de capitalisation ou d'assurance-vie souscrits à l'étranger" aide="Joindre la déclaration n° 3916-3916 bis." code="8TT" checked={ps.case8tt} onChange={v => update('case8tt', v)} />
          <SingleCaseLigne label="Comptes ouverts, détenus, utilisés ou clos à l'étranger" aide="Joindre la déclaration n° 3916-3916 bis." code="8UU" checked={ps.case8uu} onChange={v => update('case8uu', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default PrelevementSourceDiversForm;
