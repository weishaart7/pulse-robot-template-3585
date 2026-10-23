import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRevenusFonciers2042 } from '@/hooks/useRevenusFonciers2042';
import { RevenusFonciers2042 } from '@/services/revenusFonciers2042Service';
import { calculerDonnees2044, chargerDonnees2044 } from '@/services/declaration2044Donnees';
import type { Declaration2044Result } from '@/lib/fiscalite/calculerDeclaration2044';
import { calculerRevenusFonciers2042, RevenusFonciers2042Input } from '@/lib/fiscalite';
import { LectureLigne, SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

/** Année des revenus de la 2044 reprise (même valeur que ANNEE_REVENUS de useFiscalOverview). */
const ANNEE_REVENUS_2044 = 2025;

const FONCIERS_VIDE: RevenusFonciers2042Input = {
  case4be: null, case4bk: null, case4bl: null, case4bn: false, case4bz: false,
  case4by: null, case4ea: null, case4eb: null,
};

const TEXTE_ALERTE = {
  micro_et_reel: "Une 2044 (régime réel) est ouverte pour 2025 : le micro-foncier ne peut pas s'y ajouter, sauf exception.",
  micro_au_dela_du_seuil: 'Au-delà de 15 000 € de recettes brutes, le régime réel (2044) est obligatoire.',
} as const;

interface RevenusFonciersFormProps {
  onSaved?: (rf: RevenusFonciers2042) => void;
}

export const RevenusFonciersForm = ({ onSaved }: RevenusFonciersFormProps) => {
  const { data, loading, saving, saveData } = useRevenusFonciers2042();
  const { isAuthenticated } = useAuth();
  const [rf, setRf] = useState<RevenusFonciers2042Input>(FONCIERS_VIDE);
  const [rfId, setRfId] = useState<string | undefined>(undefined);
  const [declaration2044, setDeclaration2044] = useState<Declaration2044Result | null>(null);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRf(input);
      setRfId(id);
    }
  }, [data]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // Sans création : seule une 2044 déjà ouverte est reprise, comme dans useFiscalOverview.
    chargerDonnees2044(ANNEE_REVENUS_2044, false)
      .then((d) => setDeclaration2044(d ? calculerDonnees2044(ANNEE_REVENUS_2044, d) : null))
      .catch((error) => { if (import.meta.env.DEV) console.error('Erreur chargement 2044:', error); });
  }, [isAuthenticated]);

  const update = <K extends keyof RevenusFonciers2042Input>(key: K, value: RevenusFonciers2042Input[K]) => {
    setRf(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...rf, id: rfId });
    setRfId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des revenus fonciers..." />;
  }

  const { alertes } = calculerRevenusFonciers2042(rf, declaration2044 ? declaration2044.case4BA : null);

  return (
    <Cadre2042 titre="Revenus fonciers"
      description="Cadre 4 de la 2042 : locations non meublées. Le régime réel se remplit dans la 2044 et se reprend ici."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="Micro-foncier">
          <SingleMontantLigne label="Recettes brutes sans abattement" extra="n'excédant pas 15 000 €" code="4BE" value={rf.case4be} onChange={v => update('case4be', v)} />
          <SingleMontantLigne label="Dont recettes de source étrangère" extra="ouvrant droit à un crédit d'impôt égal à l'impôt français" code="4BK" value={rf.case4bk} onChange={v => update('case4bk', v)} />
          {alertes.map(a => (
            <p key={a} className="py-2 text-[13px] text-muted-foreground">{TEXTE_ALERTE[a]}</p>
          ))}
        </SousGroupe>

        <SousGroupe titre="Régime réel" aide="Report du résultat de la 2044 de 2025 : à modifier dans la 2044.">
          <LectureLigne label="Revenus fonciers imposables" code="4BA" value={declaration2044?.case4BA ?? null} />
          <SingleMontantLigne label="Dont revenus de source étrangère" extra="ouvrant droit à un crédit d'impôt égal à l'impôt français" code="4BL" value={rf.case4bl} onChange={v => update('case4bl', v)} />
          <LectureLigne label="Déficit imputable sur les revenus fonciers" code="4BB" value={declaration2044?.case4BB ?? null} />
          <LectureLigne label="Déficit imputable sur le revenu global" code="4BC" value={declaration2044?.case4BC ?? null} />
          <LectureLigne label="Déficits antérieurs non encore imputés" code="4BD" value={declaration2044?.case4BD ?? null} />
          <SingleMontantLigne label="Amortissement Robien ou Borloo neuf déduit des revenus fonciers 2025" extra="investissements réalisés en 2009" code="4BY" value={rf.case4by} onChange={v => update('case4by', v)} />
        </SousGroupe>

        <SousGroupe titre="Revenus fonciers exonérés retenus pour le taux effectif">
          <SingleMontantLigne label="Régime réel : revenus fonciers exonérés" code="4EA" value={rf.case4ea} onChange={v => update('case4ea', v)} />
          <SingleMontantLigne label="Micro-foncier : recettes brutes exonérées" code="4EB" value={rf.case4eb} onChange={v => update('case4eb', v)} />
        </SousGroupe>

        <SingleCaseLigne label="Vous ne percevez plus de revenus fonciers en 2026" code="4BN" checked={rf.case4bn} onChange={v => update('case4bn', v)} />
        <SingleCaseLigne label="Vous souscrivez une déclaration n° 2044 spéciale" code="4BZ" checked={rf.case4bz} onChange={v => update('case4bz', v)} />
    </Cadre2042>
  );
};

export default RevenusFonciersForm;
