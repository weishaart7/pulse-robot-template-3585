import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useRevenusCapitauxMobiliers } from '@/hooks/useRevenusCapitauxMobiliers';
import { RevenusCapitauxMobiliers } from '@/services/revenusCapitauxMobiliersService';
import { RevenusCapitauxMobiliersInput } from '@/lib/fiscalite';
import { MontantEclateLigne, SingleCaseLigne, SingleMontantLigne, SousGroupe } from './DeclarationLigne';

const REVENUS_VIDE: RevenusCapitauxMobiliersInput = {
  case2dh: null, case2ch: null, case2uu: null, case2vv: null, case2ww: null,
  case2xx: null, case2yy: null, case2zz: null,
  case2dc: null, case2fu: null,
  case2tr: null, case2tt: null, case2tq: null, case2ts: null, case2tz: null, case2go: null,
  case2tu: null, case2tv: null, case2tw: null, case2tx: null, case2ty: null,
  case2cg: null, case2bh: null, case2df: null, case2dg: null, case2di: null,
  case2ca: null, case2ab: null, case2ck: null, case2ee: null,
  case2aa: null, case2al: null, case2am: null, case2an: null, case2aq: null, case2ar: null,
  case2vm: null, case2vn: null, case2vo: null, case2vp: null,
  case2vq: null, case2vr: null, case2vs: null, case2vt: null, case2vu: null,
  case2op: false,
};

interface RevenusCapitauxMobiliersFormProps {
  onSaved?: (revenus: RevenusCapitauxMobiliers) => void;
}

export const RevenusCapitauxMobiliersForm = ({ onSaved }: RevenusCapitauxMobiliersFormProps) => {
  const { data, loading, saving, saveData } = useRevenusCapitauxMobiliers();
  const [revenus, setRevenus] = useState<RevenusCapitauxMobiliersInput>(REVENUS_VIDE);
  const [revenusId, setRevenusId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (data) {
      const { id, ...input } = data;
      setRevenus(input);
      setRevenusId(id);
    }
  }, [data]);

  const update = <K extends keyof RevenusCapitauxMobiliersInput>(key: K, value: RevenusCapitauxMobiliersInput[K]) => {
    setRevenus(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const saved = await saveData({ ...revenus, id: revenusId });
    setRevenusId(saved.id);
    onSaved?.(saved);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          Chargement des revenus de capitaux mobiliers...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenus des valeurs et capitaux mobiliers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SousGroupe titre="Produits des contrats d'assurance-vie et de capitalisation de 8 ans et plus">
          <SingleMontantLigne label="Produits soumis au prélèvement libératoire" extra="versements avant le 27.9.2017" code="2DH" value={revenus.case2dh} onChange={v => update('case2dh', v)} />
          <SingleMontantLigne label="Autres produits" extra="versements avant le 27.9.2017" code="2CH" value={revenus.case2ch} onChange={v => update('case2ch', v)} />
          <SingleMontantLigne label="Total perçu à répartir" extra="versements à compter du 27.9.2017" code="2UU" value={revenus.case2uu} onChange={v => update('case2uu', v)} />
          <SingleMontantLigne label="Produits imposables à 7,5 %" extra="primes ≤ 150 000 €" code="2VV" value={revenus.case2vv} onChange={v => update('case2vv', v)} />
          <SingleMontantLigne label="Produits imposables à 12,8 %" extra="primes > 150 000 €" code="2WW" value={revenus.case2ww} onChange={v => update('case2ww', v)} />
        </SousGroupe>

        <SousGroupe titre="Produits des contrats d'assurance-vie et de capitalisation de moins de 8 ans">
          <SingleMontantLigne label="Produits soumis au prélèvement libératoire" extra="versements avant le 27.9.2017" code="2XX" value={revenus.case2xx} onChange={v => update('case2xx', v)} />
          <SingleMontantLigne label="Autres produits" extra="versements avant le 27.9.2017" code="2YY" value={revenus.case2yy} onChange={v => update('case2yy', v)} />
          <SingleMontantLigne label="Produits des versements effectués à compter du 27.9.2017" code="2ZZ" value={revenus.case2zz} onChange={v => update('case2zz', v)} />
        </SousGroupe>

        <SousGroupe titre="Vos revenus des valeurs et capitaux mobiliers ouvrant droit à abattement">
          <SingleMontantLigne label="Revenus des actions et parts" extra="abattement de 40 % si option barème" code="2DC" value={revenus.case2dc} onChange={v => update('case2dc', v)} />
          <SingleMontantLigne label="Dividendes imposables des titres non cotés détenus dans le PEA ou le PEA-PME" code="2FU" value={revenus.case2fu} onChange={v => update('case2fu', v)} />
        </SousGroupe>

        <SousGroupe titre="Vos revenus des valeurs et capitaux mobiliers n'ouvrant pas droit à abattement">
          <SingleMontantLigne label="Intérêts et autres produits de placement à revenu fixe" code="2TR" value={revenus.case2tr} onChange={v => update('case2tr', v)} />
          <SingleMontantLigne label="Intérêts des prêts participatifs et des minibons" code="2TT" value={revenus.case2tt} onChange={v => update('case2tt', v)} />
          <SingleMontantLigne label="Intérêts imposables des obligations remboursables en actions" extra="PEA-PME" code="2TQ" value={revenus.case2tq} onChange={v => update('case2tq', v)} />
          <SingleMontantLigne label="Autres revenus distribués et assimilés" code="2TS" value={revenus.case2ts} onChange={v => update('case2ts', v)} />
          <SingleMontantLigne label="Produits des plans d'épargne retraite" extra="sortie en capital" code="2TZ" value={revenus.case2tz} onChange={v => update('case2tz', v)} />
          <SingleMontantLigne
            label="Revenus réputés distribués"
            extra="et revenus de structures soumises hors de France à un régime fiscal privilégié"
            code="2GO"
            value={revenus.case2go}
            onChange={v => update('case2go', v)}
          />
          <MontantEclateLigne
            label="Pertes nettes sur prêts participatifs et minibons non imputées, à reporter sur 2026"
            items={[
              { label: '2021', code: '2TU', value: revenus.case2tu, onChange: v => update('case2tu', v) },
              { label: '2022', code: '2TV', value: revenus.case2tv, onChange: v => update('case2tv', v) },
              { label: '2023', code: '2TW', value: revenus.case2tw, onChange: v => update('case2tw', v) },
              { label: '2024', code: '2TX', value: revenus.case2tx, onChange: v => update('case2tx', v) },
              { label: '2025', code: '2TY', value: revenus.case2ty, onChange: v => update('case2ty', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Vos autres revenus des valeurs et capitaux mobiliers">
          <SingleMontantLigne label="Revenus déjà soumis aux prélèvements sociaux" extra="sans CSG déductible" code="2CG" value={revenus.case2cg} onChange={v => update('case2cg', v)} />
          <SingleMontantLigne label="Revenus déjà soumis aux prélèvements sociaux" extra="avec CSG déductible si option barème" code="2BH" value={revenus.case2bh} onChange={v => update('case2bh', v)} />
          <SingleMontantLigne label="Autres revenus déjà soumis aux prélèvements sociaux" extra="avec CSG déductible" code="2DF" value={revenus.case2df} onChange={v => update('case2df', v)} />
          <SingleMontantLigne label="Revenus déjà soumis au seul prélèvement de solidarité" extra="7,5 %" code="2DG" value={revenus.case2dg} onChange={v => update('case2dg', v)} />
          <SingleMontantLigne label="Revenus soumis au seul prélèvement de solidarité" extra="à soumettre à la CSG et à la CRDS" code="2DI" value={revenus.case2di} onChange={v => update('case2di', v)} />
          <SingleMontantLigne label="Frais et charges déductibles" extra="si option barème" code="2CA" value={revenus.case2ca} onChange={v => update('case2ca', v)} />
          <SingleMontantLigne label="Crédits d'impôt sur valeurs étrangères" code="2AB" value={revenus.case2ab} onChange={v => update('case2ab', v)} />
          <SingleMontantLigne label="Prélèvement forfaitaire non libératoire déjà versé" code="2CK" value={revenus.case2ck} onChange={v => update('case2ck', v)} />
          <SingleMontantLigne label="Autres revenus soumis à un prélèvement ou à une retenue libératoire" code="2EE" value={revenus.case2ee} onChange={v => update('case2ee', v)} />
          <MontantEclateLigne
            label="Déficits des années antérieures non encore déduits"
            items={[
              { label: '2019', code: '2AA', value: revenus.case2aa, onChange: v => update('case2aa', v) },
              { label: '2020', code: '2AL', value: revenus.case2al, onChange: v => update('case2al', v) },
              { label: '2021', code: '2AM', value: revenus.case2am, onChange: v => update('case2am', v) },
              { label: '2022', code: '2AN', value: revenus.case2an, onChange: v => update('case2an', v) },
              { label: '2023', code: '2AQ', value: revenus.case2aq, onChange: v => update('case2aq', v) },
              { label: '2024', code: '2AR', value: revenus.case2ar, onChange: v => update('case2ar', v) },
            ]}
          />
        </SousGroupe>

        <SousGroupe titre="Gains de cession des bons et contrats de capitalisation et d'assurance-vie">
          <SingleMontantLigne label="Gains soumis au prélèvement libératoire" extra="versements avant le 27.9.2017" code="2VM" value={revenus.case2vm} onChange={v => update('case2vm', v)} />
          <SingleMontantLigne label="Autres gains" extra="versements avant le 27.9.2017" code="2VN" value={revenus.case2vn} onChange={v => update('case2vn', v)} />
          <SingleMontantLigne label="Gains imposables à 7,5 %" extra="versements à compter du 27.9.2017" code="2VO" value={revenus.case2vo} onChange={v => update('case2vo', v)} />
          <SingleMontantLigne label="Gains imposables à 12,8 %" extra="versements à compter du 27.9.2017" code="2VP" value={revenus.case2vp} onChange={v => update('case2vp', v)} />
          <MontantEclateLigne
            label="Moins-values de cession non imputées, à reporter sur 2026"
            items={[
              { label: '2021', code: '2VQ', value: revenus.case2vq, onChange: v => update('case2vq', v) },
              { label: '2022', code: '2VR', value: revenus.case2vr, onChange: v => update('case2vr', v) },
              { label: '2023', code: '2VS', value: revenus.case2vs, onChange: v => update('case2vs', v) },
              { label: '2024', code: '2VT', value: revenus.case2vt, onChange: v => update('case2vt', v) },
              { label: '2025', code: '2VU', value: revenus.case2vu, onChange: v => update('case2vu', v) },
            ]}
          />
        </SousGroupe>

        <SingleCaseLigne
          label="Vous optez pour l'imposition au barème de vos revenus de capitaux mobiliers et gains de cession de valeurs mobilières"
          code="2OP"
          checked={revenus.case2op}
          onChange={v => update('case2op', v)}
        />

        <Button type="button" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
};

export default RevenusCapitauxMobiliersForm;
