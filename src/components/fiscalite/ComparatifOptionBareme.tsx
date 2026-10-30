import { cn } from '@/lib/utils';
import type { ColonneComparatif, ComparaisonOptionBareme } from '@/hooks/useFiscalOverview';
import { formatEuros } from '@/pages/fiscalite/components/FiscalOverviewCard';

const LIGNES: { label: string; cle: keyof ColonneComparatif }[] = [
  { label: 'Revenu brut global', cle: 'revenuBrutGlobal' },
  { label: 'Impôt sur les revenus soumis au barème', cle: 'impotBareme' },
  { label: 'Impôt proportionnel', cle: 'impotProportionnel' },
  { label: 'Total des prélèvements sociaux', cle: 'prelevementsSociaux' },
  { label: 'Réductions et autres imputations', cle: 'reductions' },
  { label: 'Contribution exceptionnelle sur les hauts revenus', cle: 'cehr' },
];

const GRILLE = 'grid grid-cols-[minmax(0,1fr)_6.5rem_6.5rem] gap-x-4 border-b border-border/50 py-2 text-[13px] tabular-nums';

const Ligne = ({ label, pfu, bareme, fort }: { label: string; pfu: string; bareme: string; fort?: boolean }) => (
  <div className={cn(GRILLE, fort && 'font-medium')}>
    <span>{label}</span>
    <span className="text-right">{pfu}</span>
    <span className="text-right">{bareme}</span>
  </div>
);

/** Résultats comparatifs PFU / barème (2OP) recalculés en direct depuis le formulaire du cadre 2. */
export const ComparatifOptionBareme = ({ comparaison }: { comparaison: ComparaisonOptionBareme | null }) => {
  if (!comparaison) {
    return <p className="py-2.5 text-[12px] text-muted-foreground">Le choix du mode d'imposition est sans effet sur l'imposition avec les montants saisis.</p>;
  }
  const { pfu, bareme, optionActuelle, automatique } = comparaison;
  const retenu = (avecOption: boolean) => (optionActuelle === avecOption ? ' · retenu' : '');
  return (
    <div className="pt-3">
      <div className={cn(GRILLE, 'border-foreground/20 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground')}>
        <span>Résultats comparatifs</span>
        <span className="text-right">PFU{retenu(false)}</span>
        <span className="text-right">Barème{retenu(true)}</span>
      </div>
      {LIGNES.map(({ label, cle }) => (
        <Ligne key={cle} label={label} pfu={formatEuros(pfu[cle])} bareme={formatEuros(bareme[cle])} />
      ))}
      <Ligne label="Imposition revenus 2025" pfu={formatEuros(pfu.imposition)} bareme={formatEuros(bareme.imposition)} fort />
      <Ligne label="CSG déductible des revenus 2026 (si option pour le barème)" pfu="" bareme={formatEuros(comparaison.csgDeductibleAnticipee)} />
      <Ligne label="Taux marginal d'imposition anticipé pour 2026" pfu="" bareme={`${Math.round(comparaison.tmiAnticipe * 100)} %`} />
      <Ligne label="Gain fiscal" pfu="" bareme={formatEuros(comparaison.gainFiscalAnticipe)} />
      <Ligne label="Imposition à comparer" pfu={formatEuros(comparaison.impotSansOption)} bareme={formatEuros(comparaison.impotAvecOption)} fort />
      <p className="pt-2 text-[12px] text-muted-foreground">
        {automatique
          ? `Mode le plus favorable : ${optionActuelle ? "l'option pour le barème est retenue" : 'le prélèvement forfaitaire est retenu'}.`
          : `Mode choisi : ${optionActuelle ? 'barème' : 'prélèvement forfaitaire'}.`}
        {' '}Autres cadres repris tels qu'enregistrés.
      </p>
    </div>
  );
};
