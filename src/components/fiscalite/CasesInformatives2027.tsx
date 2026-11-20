import { CASES_INFORMATIVES_2027, cleCaseInformative, TypeCaseInformative } from '@/lib/fiscalite/casesInformatives2027';
import type { CasesInformatives2042 } from '@/hooks/useCasesInformatives2042';
import { CasesCocherEclateeLigne, MontantEclateLigne, SousGroupe } from './DeclarationLigne';

const UNITES: Record<Exclude<TypeCaseInformative, 'coche'>, string | null> = {
  montant: '€', mois: 'mois', nombre: null, pourcentage: '%', taux: null,
};

/**
 * Cases du formulaire 2027 sans effet sur le calcul, en fin de cadre (revenus 2026 seulement). Enregistrées
 * avec le cadre ; voir casesInformatives2027.ts.
 */
export const CasesInformatives2027 = ({ cases }: { cases: CasesInformatives2042 }) => {
  if (!cases.actif) return null;
  const lignes = CASES_INFORMATIVES_2027.filter((l) => l.formulaire === cases.formulaire);
  const groupes = [...new Set(lignes.map((l) => l.groupe))];
  return (
    <>
      {groupes.map((groupe) => (
        <SousGroupe key={groupe} titre={`${groupe} (déclaration 2027)`} aide="Cases du formulaire 2027 sans effet sur le calcul de l'impôt : saisies pour mémoire.">
          {lignes.filter((l) => l.groupe === groupe).map((l) => {
            const items = l.cases.map(([code, colonne]) => ({ code, label: colonne, cle: cleCaseInformative(code) }));
            return l.type === 'coche' ? (
              <CasesCocherEclateeLigne key={l.libelle + items[0].code} label={l.libelle}
                items={items.map((i) => ({ ...i, checked: cases.valeurs[i.cle] === true, onChange: (v: boolean) => cases.modifier(i.cle, v) }))} />
            ) : (
              <MontantEclateLigne key={l.libelle + items[0].code} label={l.libelle}
                items={items.map((i) => ({
                  ...i, unite: UNITES[l.type],
                  value: typeof cases.valeurs[i.cle] === 'number' ? cases.valeurs[i.cle] as number : null,
                  onChange: (v: number | null) => cases.modifier(i.cle, v),
                }))} />
            );
          })}
        </SousGroupe>
      ))}
    </>
  );
};
