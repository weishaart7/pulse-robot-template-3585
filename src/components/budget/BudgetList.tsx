import { useState, type ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Chip, PanelTitle, SummaryRow } from '@/components/layout/workspace-panel';
import { WizardConfirmDialog } from '@/components/assets/wizard/WizardConfirmDialog';
import { initialsFromFullName } from '@/lib/family/initials';
import { Revenu, Charge } from '@/services/budgetService';
import { DisplayMode } from '@/pages/budget/BudgetSection';
import { toAnnual, isActiveOn, isPonctuel, parseLocalDate, sumAnnualActive } from '@/lib/budget/periodicite';
import { categorieCharge, categorieRevenu, colorForCharge, colorForRevenu } from '@/components/budget/budgetColors';

type BudgetLine = Revenu | Charge;

interface BudgetListProps {
  kind: 'revenus' | 'charges';
  items: BudgetLine[];
  onEdit: (item: BudgetLine) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
  displayMode?: DisplayMode;
  /** Bouton d'ajout, posé dans la barre d'outils de la liste. */
  action?: ReactNode;
  /** Encadré éventuel sous l'en-tête (ex. charges d'actif en % exclues). */
  notice?: ReactNode;
}

const PERIODICITE_LABELS: Record<string, string> = {
  mensuel: 'Mensuel',
  trimestriel: 'Trimestriel',
  semestriel: 'Semestriel',
  annuel: 'Annuel',
  ponctuel: 'Ponctuel',
};

const Swatch = ({ color }: { color: string }) => (
  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[2px] ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }} />
);

const fmtPct = (n: number) => `${n.toFixed(1).replace('.', ',')} %`;

const formatDate = (d?: string) => {
  if (!d) return null;
  const [y, m] = d.split('-');
  return y && m ? `${m}/${y}` : null;
};


// Liste des revenus ou des charges en « panneau de travail » : bandeau de synthèse (total,
// composition par catégorie), puis lignes regroupées par catégorie en sections sur deux colonnes,
// sur le modèle de la liste des membres de la famille.
export const BudgetList = ({ kind, items, onEdit, onDelete, loading, displayMode = 'annuel', action, notice }: BudgetListProps) => {
  // Ligne dont la suppression attend confirmation.
  const [pendingDelete, setPendingDelete] = useState<BudgetLine | null>(null);

  if (loading) {
    return <p className="px-8 py-6 text-[13px] text-muted-foreground">Chargement…</p>;
  }

  const isRevenus = kind === 'revenus';
  const categorieOf = isRevenus ? categorieRevenu : categorieCharge;
  const colorOf = isRevenus ? colorForRevenu : colorForCharge;
  const divisor = displayMode === 'mensuel' ? 12 : 1;
  const periodLabel = displayMode === 'mensuel' ? '/mois' : '/an';

  const display = (item: BudgetLine) => toAnnual(item.montant || 0, item.periodicite) / divisor;
  const formatCurrency = (amount: number) =>
    amount.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

  // Totaux et parts sur les seules lignes actives (cf. src/lib/budget/periodicite.ts) ; les lignes
  // inactives restent listées pour rester éditables, sans part affichée.
  const totalAnnuel = sumAnnualActive(items);
  const total = totalAnnuel / divisor;
  const actives = items.filter(i => isActiveOn(i));
  const nbInactives = items.length - actives.length;
  const ponctuels = actives.filter(i => isPonctuel(i.periodicite)).reduce((s, i) => s + display(i), 0);
  const liees = actives.filter(i => i.source === 'immobilier' || i.source === 'emprunt').reduce((s, i) => s + display(i), 0);

  // Les lignes d'actif / d'emprunt sont en lecture seule dans Budget : elles se modifient à la source.
  const isReadOnly = (item: BudgetLine) => item.source === 'immobilier' || item.source === 'emprunt';
  const sourceLabel = (item: BudgetLine) => item.source === 'emprunt' ? 'Emprunt' : 'Immobilier';
  const editHint = (item: BudgetLine) => item.source === 'emprunt' ? 'Depuis Patrimoine' : 'Depuis Immobilier';
  const personne = (item: BudgetLine) => ('beneficiaire' in item ? item.beneficiaire : (item as Charge).debiteur) || '—';

  // Regroupement par catégorie, triées par montant actif décroissant.
  const groupes = Object.values(
    items.reduce<Record<string, { categorie: string; lignes: BudgetLine[]; total: number }>>((acc, item) => {
      const categorie = categorieOf(item.nature);
      acc[categorie] ??= { categorie, lignes: [], total: 0 };
      acc[categorie].lignes.push(item);
      if (isActiveOn(item)) acc[categorie].total += display(item);
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);
  groupes.forEach(g => g.lignes.sort((a, b) => display(b) - display(a)));

  const noun = isRevenus ? 'revenu' : 'charge';

  return (
    <div>
      {/* Synthèse : total et sa décomposition, puis composition par catégorie. */}
      <div className="grid grid-cols-1 divide-y divide-border border-b border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:divide-x lg:divide-y-0">
        <div className="px-8 py-6">
          <p className="text-[12px] text-muted-foreground">Total des {kind} {displayMode === 'mensuel' ? 'mensuels' : 'annuels'}</p>
          <p className="mt-2 text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums text-foreground">
            {formatCurrency(total)}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
            <Chip tone={isRevenus ? 'lagon' : 'citron'}>
              {actives.length} {noun}{actives.length > 1 ? 's' : ''} actif{!isRevenus ? 've' : ''}{actives.length > 1 ? 's' : ''}
            </Chip>
            {nbInactives > 0 && <span>{nbInactives} inactif{!isRevenus ? 've' : ''}{nbInactives > 1 ? 's' : ''}, hors total</span>}
          </p>
          <dl className="mt-5">
            <SummaryRow label="Récurrents"><span className="tabular-nums">{formatCurrency(total - ponctuels)}</span></SummaryRow>
            <SummaryRow label="Ponctuels"><span className="tabular-nums">{formatCurrency(ponctuels)}</span></SummaryRow>
            <SummaryRow label="Via les actifs">
              <span className="tabular-nums">{formatCurrency(liees)}</span>
            </SummaryRow>
          </dl>
        </div>

        <div className="px-8 py-6">
          <PanelTitle>Par catégorie</PanelTitle>
          {total === 0 ? (
            <p className="mt-3 text-[13px] text-muted-foreground">Aucun {noun} actif.</p>
          ) : (
            <>
              <div className="mt-4 flex h-2.5 w-full gap-[2px] overflow-hidden rounded-[1px]">
                {groupes.filter(g => g.total > 0).map(g => (
                  <div key={g.categorie} title={`${g.categorie} · ${fmtPct((g.total / total) * 100)}`} className="h-full" style={{ width: `${(g.total / total) * 100}%`, backgroundColor: colorOf(g.categorie) }} />
                ))}
              </div>
              <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                {groupes.filter(g => g.total > 0).map(g => (
                  <li key={g.categorie} className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-[13px] text-foreground">
                      <Swatch color={colorOf(g.categorie)} />
                      <span className="truncate">{g.categorie}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                      <span className="text-[13px] font-medium text-foreground">{formatCurrency(g.total)}</span>
                      <span className="w-11 text-right text-[12px] text-muted-foreground">{fmtPct((g.total / total) * 100)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>


      {/* Barre d'outils de la liste : compteur et ajout. */}
      <div className="flex items-center justify-between gap-4 px-8 py-4">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">{items.length} ligne{items.length > 1 ? 's' : ''}</span>
          {' '}· {groupes.length} catégorie{groupes.length > 1 ? 's' : ''}
        </p>
        {action}
      </div>

      {notice && <div className="px-8 pb-4">{notice}</div>}

      {items.length === 0 ? (
        <div className="border-t border-border px-8 py-7">
          <p className="max-w-md text-[13px] text-muted-foreground">
            Aucun{isRevenus ? '' : 'e'} {noun} enregistré{isRevenus ? '' : 'e'} pour le moment.
          </p>
        </div>
      ) : (
        // Une section par catégorie, empilées en colonnes (maçonnerie CSS) : chaque section suit
        // directement la précédente, sans hauteur de rangée commune ni vide sous les plus courtes.
        <div className="border-t border-border lg:columns-2 2xl:columns-3 gap-0 [column-rule:1px_solid_hsl(var(--border))]">
          {groupes.map(g => {
            const color = colorOf(g.categorie);
            return (
              <section key={g.categorie} className="break-inside-avoid border-b border-border px-8 py-5">
                <div className="mb-3.5 flex items-baseline justify-between gap-3">
                  <h3 className="flex min-w-0 items-center gap-2 text-[14.5px] font-medium tracking-[-0.01em] text-foreground">
                    <span aria-hidden className="h-3 w-[3px] shrink-0 rounded-full" style={{ backgroundColor: color }} />
                    <span className="truncate">{g.categorie}</span>
                    <span className="text-[12px] font-normal tabular-nums text-muted-foreground">{g.lignes.length}</span>
                  </h3>
                  <span className="shrink-0 text-[13px] font-medium tabular-nums text-foreground">
                    {formatCurrency(g.total)}
                    {total > 0 && <span className="ml-2 font-normal text-muted-foreground">{fmtPct((g.total / total) * 100)}</span>}
                  </span>
                </div>
                <ul className="-mx-2 border-b border-border">
                  {g.lignes.map(item => {
                    const active = isActiveOn(item);
                    const readOnly = isReadOnly(item);
                    // Seules les dates utiles sont rappelées : une fin prévue, ou un début encore à venir.
                    const debutFutur = item.date_debut && parseLocalDate(item.date_debut) > new Date() ? formatDate(item.date_debut) : null;
                    const fin = formatDate(item.date_fin);
                    const echeance = isPonctuel(item.periodicite)
                      ? formatDate(item.date_debut)
                      : debutFutur && fin ? `${debutFutur} → ${fin}` : debutFutur ? `dès ${debutFutur}` : fin ? `jusqu'à ${fin}` : null;
                    const periodicite = PERIODICITE_LABELS[(item.periodicite || 'mensuel').toLowerCase()] ?? item.periodicite;
                    const part = active && totalAnnuel > 0 && item.montant
                      ? fmtPct((toAnnual(item.montant, item.periodicite) / totalAnnuel) * 100)
                      : null;
                    const open = () => { if (!readOnly) onEdit(item); };
                    return (
                      <li
                        key={item.id}
                        role={readOnly ? undefined : 'button'}
                        tabIndex={readOnly ? undefined : 0}
                        title={readOnly ? `Modifier ${editHint(item).toLowerCase()}` : undefined}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (!readOnly && (e.key === 'Enter' || e.key === ' ')) {
                            e.preventDefault();
                            open();
                          }
                        }}
                        className={`flex items-center gap-3 border-t border-border px-2 py-2 transition-colors ${
                          readOnly ? '' : 'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:bg-muted/40'
                        } ${active ? '' : 'text-muted-foreground'}`}
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[11.5px] font-semibold ${active ? 'text-foreground' : 'border border-border'}`}
                          style={active ? { backgroundColor: `${color}2e` } : undefined}
                        >
                          {initialsFromFullName(item.libelle || item.nature)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-medium ${active ? 'text-foreground' : ''}`}>{item.libelle || item.nature}</p>
                          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                            <span className="truncate text-xs text-muted-foreground">
                              {[item.nature !== item.libelle ? item.nature : null, personne(item), echeance].filter(Boolean).join(' · ')}
                            </span>
                            {readOnly && <Chip tone="lagon">{sourceLabel(item)}</Chip>}
                            {!active && <Chip>Inactive</Chip>}
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className={`text-sm tabular-nums ${active ? 'font-medium text-foreground' : ''}`}>
                            {item.montant ? formatCurrency(display(item)) : '—'}
                          </p>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {[periodicite, part].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="w-8 shrink-0" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                          {!readOnly && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="Ouvrir le menu"
                                  className="flex h-8 w-8 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                                >
                                  <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(item)}>
                                  <Pencil />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(item)}>
                                  <Trash2 />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <WizardConfirmDialog
        open={pendingDelete !== null}
        title={`Supprimer ce${isRevenus ? '' : 'tte'} ${noun} ?`}
        description={pendingDelete ? `« ${pendingDelete.libelle || pendingDelete.nature} » sera définitivement supprimé${isRevenus ? '' : 'e'}.` : ''}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={() => {
          if (pendingDelete) onDelete(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
