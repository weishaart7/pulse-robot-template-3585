import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LigneMonumentHistorique, SITUATIONS_MONUMENT_HISTORIQUE, SituationMonumentHistorique,
  montantDeductibleLigneMonumentHistorique, montantDeductibleMonumentsHistoriques,
} from '@/lib/fiscalite';
import { CaseMontant } from './DeclarationLigne';

const formatEuros = (v: number) => `${v.toLocaleString('fr-FR')} €`;
const LIGNE_VIDE: LigneMonumentHistorique = { situation: 'sans_recettes_autres_ouvert', montant: null, subvention: null };

/** Calcul d'appoint du montant 6DG, non enregistré : seul le résultat est reporté dans la case. */
export const CalculMonumentsHistoriques = ({ onReporter }: { onReporter: (montant: number) => void }) => {
  const [ouvert, setOuvert] = useState(false);
  const [lignes, setLignes] = useState<LigneMonumentHistorique[]>([LIGNE_VIDE]);
  const total = montantDeductibleMonumentsHistoriques(lignes);

  const modifier = (i: number, patch: Partial<LigneMonumentHistorique>) =>
    setLignes(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  if (!ouvert) {
    return (
      <div className="border-b border-border/50 py-2">
        <button type="button" onClick={() => setOuvert(true)} className="text-[12.5px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Calculer le montant déductible des monuments historiques
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-b border-border/50 py-3">
      <p className="text-[12px] text-muted-foreground">
        Conditions : engagement de conservation de 15 ans, détention directe (ou société civile éligible), pas de copropriété non agréée.
        Si une condition n'est plus remplie, les sommes déduites les années précédentes sont à reporter en 6GH.
      </p>
      {lignes.map((ligne, i) => {
        const avecSubvention = SITUATIONS_MONUMENT_HISTORIQUE.find(s => s.value === ligne.situation)?.avecSubvention ?? false;
        return (
          <div key={i} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_6rem_1.5rem]">
            <Select value={ligne.situation} onValueChange={v => modifier(i, { situation: v as SituationMonumentHistorique })}>
              <SelectTrigger className="h-9 rounded-[2px] text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SITUATIONS_MONUMENT_HISTORIQUE.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <CaseMontant code={`MH${i + 1}`} value={ligne.montant} onChange={v => modifier(i, { montant: v })} ariaLabel={`Montant, ligne ${i + 1}`} />
            {avecSubvention
              ? <CaseMontant code={`SUB${i + 1}`} value={ligne.subvention} onChange={v => modifier(i, { subvention: v })} ariaLabel={`Subvention, ligne ${i + 1}`} />
              : <span className="hidden sm:block" />}
            <span className="text-right text-[13px] tabular-nums">{formatEuros(montantDeductibleLigneMonumentHistorique(ligne))}</span>
            <button type="button" aria-label="Supprimer la ligne" onClick={() => setLignes(prev => prev.filter((_, j) => j !== i))}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={lignes.length === 1}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <button type="button" onClick={() => setLignes(prev => [...prev, LIGNE_VIDE])} className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground">
          <Plus className="h-3.5 w-3.5" /> Ajouter une ligne
        </button>
        <div className="flex items-center gap-3 text-[13px]">
          <span>Déductible : <span className="font-medium tabular-nums">{formatEuros(total)}</span></span>
          <button type="button" onClick={() => { onReporter(total); setOuvert(false); }}
            className="rounded-[2px] border border-border px-2.5 py-1 text-[12.5px] hover:bg-muted">
            Reporter en 6DG
          </button>
          <button type="button" onClick={() => setOuvert(false)} className="text-[12.5px] text-muted-foreground hover:text-foreground">Fermer</button>
        </div>
      </div>
    </div>
  );
};
