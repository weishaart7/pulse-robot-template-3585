import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { usePlusValuesGainsDivers } from '@/hooks/usePlusValuesGainsDivers';
import { PlusValuesGainsDivers } from '@/services/plusValuesGainsDiversService';
import { PlusValuesGainsDiversInput, controlerSaisiePlusValues } from '@/lib/fiscalite';
import { SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';
import { Cadre2042, Cadre2042Chargement } from './Cadre2042';

const PLUS_VALUES_VIDE: PlusValuesGainsDiversInput = {
  case3vg: null, case3sg: null, case3vh: null, case3ua: null, case3sl: null, case3va: null,
  case3vt: null, case3pi: null, case3sb: null, case3sz: null, case3we: null,
  case3an: null, case3bn: null, case3cn: false,
  case3vz: null, case3vw: null,
  case3sj: null, case3tj: null, case3tk: null, case3sk: null, case3tl: null, case3tm: null, case3pc: null, case3pe: null,
  case3vq: null, case3vr: null, case3vc: null, case3ex: null,
};

interface PlusValuesGainsDiversFormProps {
  onSaved?: (pv: PlusValuesGainsDivers) => void;
}

export const PlusValuesGainsDiversForm = ({ onSaved }: PlusValuesGainsDiversFormProps) => {
  const { data, loading, saving, saveData } = usePlusValuesGainsDivers();
  const [pv, setPv] = useState<PlusValuesGainsDiversInput>(PLUS_VALUES_VIDE);
  const [pvId, setPvId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setPv(input);
      setPvId(id);
    }
  }, [data]);

  const update = <K extends keyof PlusValuesGainsDiversInput>(key: K, value: PlusValuesGainsDiversInput[K]) => {
    setPv(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...pv, id: pvId });
    setPvId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return <Cadre2042Chargement texte="Chargement des plus-values et gains divers..." />;
  }

  return (
    <Cadre2042 titre="Plus-values et gains divers"
      description="Cadre 3 de la 2042-C : un montant par foyer. L'option barème (2OP) se coche au cadre 2 et vaut aussi pour les plus-values mobilières."
      saving={saving} onSave={handleSubmit}>
        <SousGroupe titre="Gains de cession de valeurs mobilières et assimilés">
          <SingleMontantLigne label="Plus-value avant abattement" code="3VG" value={pv.case3vg} onChange={v => update('case3vg', v)} />
          <SingleMontantLigne label="Abattement pour durée de détention de droit commun" extra="appliqué sur option barème" code="3SG" value={pv.case3sg} onChange={v => update('case3sg', v)} />
          <SingleMontantLigne label="Moins-value 2025" code="3VH" value={pv.case3vh} onChange={v => update('case3vh', v)} />
        </SousGroupe>

        <SousGroupe titre="Abattement renforcé ou départ à la retraite d'un dirigeant de PME">
          <SingleMontantLigne label="Plus-value avant abattement" code="3UA" value={pv.case3ua} onChange={v => update('case3ua', v)} />
          <SingleMontantLigne label="Abattement pour durée de détention renforcé" extra="appliqué sur option barème" code="3SL" value={pv.case3sl} onChange={v => update('case3sl', v)} />
          <SingleMontantLigne label="Abattement fixe" extra="départ à la retraite d'un dirigeant de PME" code="3VA" value={pv.case3va} onChange={v => update('case3va', v)} />
          {controlerSaisiePlusValues(pv).map(message => (
            <p key={message} className="flex items-start gap-1.5 px-2 py-1 text-xs text-citron-ink">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{message} (brochure IR 2026 p. 140-141, 154)</span>
            </p>
          ))}
        </SousGroupe>

        <SousGroupe titre="Autres gains">
          <SingleMontantLigne label="Gain sur retrait ou rachat du PEA ou du PEA-PME" extra="avant expiration de la 5e année" code="3VT" value={pv.case3vt} onChange={v => update('case3vt', v)} />
          <SingleMontantLigne label="Profits sur instruments financiers taxables à 50 %" code="3PI" value={pv.case3pi} onChange={v => update('case3pi', v)} />
          <SingleMontantLigne label="Plus-values en report dont le report a expiré en 2025" extra="art. 150-0 D bis, plus-values imposables" code="3SB" value={pv.case3sb} onChange={v => update('case3sb', v)} />
          <SingleMontantLigne label="Plus-values de cession de titres d'OPC monétaires dont le report a expiré en 2025" extra="art. 150-0 B quater" code="3SZ" value={pv.case3sz} onChange={v => update('case3sz', v)} />
          <SingleMontantLigne label="Complément de prix perçu en 2025" code="3WE" value={pv.case3we} onChange={v => update('case3we', v)} />
        </SousGroupe>

        <SousGroupe titre="BSPCE — bons de souscription de parts de créateur d'entreprise">
          <SingleMontantLigne label="Gains de cession, BSPCE attribués avant le 1.1.2018, taxés à 19 %" extra="activité depuis au moins 3 ans" code="3SJ" value={pv.case3sj} onChange={v => update('case3sj', v)} />
          <SingleMontantLigne label="Gains de cession, BSPCE du 1.1.2018 au 31.12.2024 — gain avant abattement" extra="activité depuis au moins 3 ans" code="3TJ" value={pv.case3tj} onChange={v => update('case3tj', v)} />
          <SingleMontantLigne label="Abattement fixe sur 3TJ" extra="départ à la retraite d'un dirigeant de PME" code="3TK" value={pv.case3tk} onChange={v => update('case3tk', v)} />
          <SingleMontantLigne label="Gains de cession, BSPCE jusqu'au 31.12.2024 taxables à 30 %" extra="activité depuis moins de 3 ans" code="3SK" value={pv.case3sk} onChange={v => update('case3sk', v)} />
          <SingleMontantLigne label="Gain de cession, BSPCE à compter du 1.1.2025 — gain avant abattement" code="3TL" value={pv.case3tl} onChange={v => update('case3tl', v)} />
          <SingleMontantLigne label="Abattement fixe sur 3TL" extra="départ à la retraite d'un dirigeant de PME" code="3TM" value={pv.case3tm} onChange={v => update('case3tm', v)} />
          <SingleMontantLigne label="Gain d'exercice BSPCE à compter du 1.1.2025, taxable à 12,8 %" extra="activité depuis au moins 3 ans" code="3PC" value={pv.case3pc} onChange={v => update('case3pc', v)} />
          <SingleMontantLigne label="Gain d'exercice BSPCE à compter du 1.1.2025, taxable à 30 %" extra="activité depuis moins de 3 ans" code="3PE" value={pv.case3pe} onChange={v => update('case3pe', v)} />
        </SousGroupe>

        <SousGroupe titre="Autres régimes">
          <SingleMontantLigne label="Impatriés : plus-values exonérées" extra="50 %" code="3VQ" value={pv.case3vq} onChange={v => update('case3vq', v)} />
          <SingleMontantLigne label="Impatriés : moins-values non imputables" extra="50 %" code="3VR" value={pv.case3vr} onChange={v => update('case3vr', v)} />
          <SingleMontantLigne label="Produits et plus-values exonérés provenant de structures de capital-risque" code="3VC" value={pv.case3vc} onChange={v => update('case3vc', v)} />
          <SingleMontantLigne label="Gain net exonéré sur retrait du plan d'épargne avenir climat (PEAC)" code="3EX" value={pv.case3ex} onChange={v => update('case3ex', v)} />
        </SousGroupe>

        <SousGroupe titre="Cession d'actifs numériques" aide="Report de la déclaration n° 2086.">
          <SingleMontantLigne label="Plus-value" code="3AN" value={pv.case3an} onChange={v => update('case3an', v)} />
          <SingleMontantLigne label="Moins-value" code="3BN" value={pv.case3bn} onChange={v => update('case3bn', v)} />
          <SingleCaseLigne label="Option pour l'imposition au barème des plus-values de cession d'actifs numériques" code="3CN" checked={pv.case3cn} onChange={v => update('case3cn', v)} />
        </SousGroupe>

        <SousGroupe titre="Plus-values immobilières" aide="Retenues pour le revenu fiscal de référence seulement : l'impôt a déjà été payé chez le notaire.">
          <SingleMontantLigne label="Plus-values nettes de cession d'immeubles ou de biens meubles déjà imposées à 19 %" code="3VZ" value={pv.case3vz} onChange={v => update('case3vz', v)} />
          <SingleMontantLigne label="Plus-value exonérée, première cession d'un logement autre que la résidence principale" extra="sous condition de remploi" code="3VW" value={pv.case3vw} onChange={v => update('case3vw', v)} />
        </SousGroupe>
    </Cadre2042>
  );
};

export default PlusValuesGainsDiversForm;
