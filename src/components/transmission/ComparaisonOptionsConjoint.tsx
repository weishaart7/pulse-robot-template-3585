import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldHelp } from '@/components/ui/field-help';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { ConjointOption } from '@/lib/transmission';
import {
  loadTransmissionData,
  buildOrdreNormalBase,
  computeOrdreNormal,
  summarizeOptionConjoint,
  OrdreNormalBase,
  OptionConjointSynthese,
  TransmissionData
} from '@/utils/transmissionOrdreNormal';
import './kairos-transmission.css';

interface Props {
  options: { value: ConjointOption; label: string }[];
  selectedOption: ConjointOption | '';
}

type Colonne = { value: ConjointOption; label: string } & (
  | { synthese: OptionConjointSynthese; erreur: null }
  | { synthese: null; erreur: string }
);

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

/**
 * Compare, pour l'ordre normal (l'Utilisateur décède en premier), chaque
 * option ouverte au conjoint survivant sur les deux décès. Un appel à
 * computeChainedTransmission par option, tout le reste du contexte étant
 * identique : aucune règle fiscale propre à cet écran.
 */
export const ComparaisonOptionsConjoint: React.FC<Props> = ({ options, selectedOption }) => {
  const { user } = useAuth();
  const { passifs, loading: passifsLoading } = usePassifs();
  const { emprunts, loading: empruntsLoading } = useEmprunts();
  const [data, setData] = useState<TransmissionData | null>(null);
  const [erreurChargement, setErreurChargement] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let annule = false;
    loadTransmissionData(user.id)
      .then(d => { if (!annule) setData(d); })
      .catch(error => {
        if (import.meta.env.DEV) console.error('Erreur chargement comparaison options conjoint:', error);
        if (!annule) setErreurChargement(error instanceof Error ? error.message : 'Erreur inconnue lors du chargement.');
      });
    return () => { annule = true; };
  }, [user]);

  const calcul = useMemo((): { colonnes: Colonne[]; erreur: string | null } | null => {
    if (!data || passifsLoading || empruntsLoading) return null;
    let base: OrdreNormalBase;
    try {
      base = buildOrdreNormalBase(data, passifs, emprunts);
    } catch (error) {
      return { colonnes: [], erreur: error instanceof Error ? error.message : 'Erreur inconnue lors du calcul.' };
    }
    const colonnes = options.map((opt): Colonne => {
      try {
        return { ...opt, synthese: summarizeOptionConjoint(computeOrdreNormal(base, opt.value)), erreur: null };
      } catch (error) {
        if (import.meta.env.DEV) console.error(`Erreur calcul option ${opt.value}:`, error);
        return { ...opt, synthese: null, erreur: error instanceof Error ? error.message : 'Calcul indisponible.' };
      }
    });
    return { colonnes, erreur: null };
  }, [data, passifs, emprunts, passifsLoading, empruntsLoading, options]);

  if (options.length < 2) return null;

  const erreurGlobale = erreurChargement ?? calcul?.erreur ?? null;
  const colonnesOk = (calcul?.colonnes ?? []).filter((c): c is Colonne & { synthese: OptionConjointSynthese } => c.synthese !== null);
  // Mise en évidence factuelle, sans recommandation : l'intérêt du conjoint
  // (revenus vs capital) relève du conseil, pas du calcul.
  const minDroits = colonnesOk.length ? Math.min(...colonnesOk.map(c => c.synthese.droitsTotaux)) : null;
  const maxNetHeritiers = colonnesOk.length ? Math.max(...colonnesOk.map(c => c.synthese.netHeritiersCumule)) : null;

  const lignes: { label: string; help?: string; get: (s: OptionConjointSynthese) => number; best?: number | null; fort?: boolean }[] = [
    {
      label: '1er décès — net reçu par le conjoint',
      help: "Usufruit valorisé au barème de l'art. 669 CGI selon l'âge actuel du conjoint.",
      get: s => s.netConjoint
    },
    { label: '1er décès — net reçu par les autres héritiers', get: s => s.netAutresHeritiers1erDeces },
    { label: '1er décès — droits de succession', get: s => s.droits1erDeces },
    {
      label: '2nd décès — droits de succession',
      help: "Succession du conjoint : ses biens propres et ce qu'il a reçu en pleine propriété au 1er décès. L'usufruit s'éteint et se réunit à la nue-propriété sans taxation (art. 1133 CGI).",
      get: s => s.droits2ndDeces
    },
    { label: 'Total des droits sur les deux décès', get: s => s.droitsTotaux, best: minDroits, fort: true },
    { label: 'Frais de notaire cumulés', get: s => s.fraisNotaireTotaux },
    {
      label: 'Net cumulé reçu par les héritiers (hors conjoint)',
      help: "Net du 1er décès + net du 2nd décès, réunion de l'usufruit incluse.",
      get: s => s.netHeritiersCumule,
      best: maxNetHeritiers,
      fort: true
    }
  ];

  return (
    <Card className="bg-[var(--surface)] border-[var(--kt-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
      <CardHeader className="p-5">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-[var(--ink-400)]" />
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">
            Comparaison des options
            <FieldHelp>
              Chaque colonne simule votre décès puis celui de votre conjoint, avec cette option et toutes vos autres
              données inchangées. Hypothèses : les deux décès à la date du jour, patrimoine du conjoint conservé tel
              quel entre les deux. La meilleure valeur est mise en évidence sur les lignes en gras ; elle ne tient pas
              compte des besoins du conjoint (revenus, capital disponible).
            </FieldHelp>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {erreurGlobale ? (
          <p className="text-sm text-[var(--text-secondary)]">Comparaison indisponible : {erreurGlobale}</p>
        ) : !calcul ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--ink-900)]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  {calcul.colonnes.map(c => (
                    <TableHead
                      key={c.value}
                      className={'text-right align-bottom ' + (c.value === selectedOption ? 'text-[var(--text-primary)] font-semibold' : '')}
                    >
                      {c.label}
                      {c.value === selectedOption && <div className="text-xs font-normal text-[var(--text-secondary)]">Option retenue</div>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lignes.map(l => (
                  <TableRow key={l.label}>
                    <TableCell className={l.fort ? 'font-semibold' : ''}>
                      {l.label}
                      {l.help && <FieldHelp>{l.help}</FieldHelp>}
                    </TableCell>
                    {calcul.colonnes.map(c => {
                      if (!c.synthese) {
                        return <TableCell key={c.value} className="text-right text-xs text-[var(--text-secondary)]">—</TableCell>;
                      }
                      const v = l.get(c.synthese);
                      const isBest = l.best != null && colonnesOk.length > 1 && Math.round(v) === Math.round(l.best);
                      return (
                        <TableCell
                          key={c.value}
                          className={
                            'text-right kairos-num ' +
                            (l.fort ? 'font-semibold ' : '') +
                            (isBest ? 'text-[var(--kt-positive)]' : '')
                          }
                        >
                          {formatCurrency(v)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {calcul.colonnes.some(c => c.erreur) && (
              <ul className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                {calcul.colonnes.filter(c => c.erreur).map(c => (
                  <li key={c.value}>{c.label} : {c.erreur}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
