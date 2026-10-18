import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ASSET_CATEGORIES, getAssetCategory, getNatureDisplayLabel } from '@/constants/assetTypes';
import { CATEGORY_COLORS } from '@/lib/patrimoine/utils';
import { cn } from '@/lib/utils';

// Libellés des catégories dans la fenêtre (les clés d'ASSET_CATEGORIES restent techniques).
const CATEGORY_LABELS: Record<string, string> = {
  'actifs immobiliers': 'Immobilier',
  'actifs corporels': 'Biens corporels',
  'actifs professionnels': 'Actifs professionnels',
  'épargne retraite': 'Épargne retraite',
  'prévoyance': 'Prévoyance',
  'épargne et assurance-vie': 'Assurance-vie et capitalisation',
  'épargne salariale': 'Épargne salariale',
  'épargne bancaire / liquidités': 'Épargne bancaire et liquidités',
  'valeurs mobilières et placements financiers': 'Placements financiers',
  'créances': 'Créances',
  'autres': 'Autres',
};

// Recherche insensible à la casse et aux accents.
const normaliser = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Choix de la nature d'un actif : le champ ouvre une fenêtre plutôt qu'une liste
 * déroulante d'une centaine d'options. Recherche en tête (accents ignorés, Entrée
 * choisit le premier résultat), catégories à gauche pour sauter à une section,
 * natures groupées par catégorie à droite.
 */
export const NaturePicker: React.FC<{
  value?: string;
  onChange: (nature: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Choisir une nature', className }) => {
  const [open, setOpen] = useState(false);
  const [recherche, setRecherche] = useState('');
  const premiereCategorie = Object.keys(ASSET_CATEGORIES)[0];
  // Catégorie affichée à droite : celle de la nature déjà choisie, sinon la première.
  const [categorie, setCategorie] = useState(premiereCategorie);
  const ouvrir = () => {
    setCategorie(value ? getAssetCategory(value) : premiereCategorie);
    setOpen(true);
  };

  const groupes = useMemo(() => {
    const q = normaliser(recherche.trim());
    return Object.entries(ASSET_CATEGORIES)
      .map(([categorie, natures]) => ({
        categorie,
        natures: (natures as readonly string[]).filter(
          (n) => !q || normaliser(getNatureDisplayLabel(n)).includes(q) || normaliser(CATEGORY_LABELS[categorie] ?? categorie).includes(q)
        ),
      }))
      .filter((g) => g.natures.length > 0);
  }, [recherche]);

  const choisir = (nature: string) => {
    onChange(nature);
    setOpen(false);
    setRecherche('');
  };

  // Sans recherche : la seule catégorie sélectionnée. Avec recherche : tous les résultats,
  // groupés par catégorie.
  const affiches = recherche.trim() ? groupes : groupes.filter((g) => g.categorie === categorie);
  const toutes = Object.entries(ASSET_CATEGORIES);

  return (
    <>
      <button
        type="button"
        onClick={ouvrir}
        aria-haspopup="dialog"
        className={cn(
          'flex h-9 w-full items-center justify-between gap-1.5 rounded-[5px] border px-3 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20',
          !value && 'text-muted-foreground',
          className
        )}
      >
        <span className="truncate">{value ? getNatureDisplayLabel(value) : placeholder}</span>
        <ChevronDown className="-me-0.5 h-4 w-4 opacity-60" />
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRecherche(''); }}>
        <DialogContent overlayClassName="bg-black/25 backdrop-blur-[6px]" className="flex h-[min(640px,85vh)] max-w-3xl flex-col gap-0 overflow-hidden rounded-[4px] p-0 sm:rounded-[4px]">
          <div className="border-b border-border px-6 pb-4 pt-5">
            <DialogTitle className="text-[18px] font-medium tracking-[-0.01em]">Nature de l'actif</DialogTitle>
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
              Cherchez par nom ou parcourez les catégories.
            </DialogDescription>
            <div className="mt-4 flex h-10 items-center gap-2 rounded-[2px] border border-border bg-background px-3 focus-within:border-foreground">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const premier = affiches[0]?.natures[0];
                    if (premier) choisir(premier);
                  }
                }}
                placeholder="Livret A, SCPI, assurance-vie…"
                className="h-full w-full bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Écran étroit : catégories en rangée défilante (la colonne de gauche est masquée). */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-border px-6 py-2.5 md:hidden">
            {toutes.map(([cat]) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setCategorie(cat); setRecherche(''); }}
                className={cn(
                  'shrink-0 rounded-[2px] px-2.5 py-1 text-[12px]',
                  !recherche.trim() && cat === categorie ? 'bg-foreground text-background' : 'text-muted-foreground'
                )}
              >
                {CATEGORY_LABELS[cat] ?? cat}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1">
            {/* Catégories : choisir celle affichée à droite (efface une recherche en cours). */}
            <nav className="hidden w-64 shrink-0 overflow-y-auto border-r border-border py-3 md:block">
              {toutes.map(([cat, natures]) => {
                const nb = recherche.trim() ? groupes.find((g) => g.categorie === cat)?.natures.length ?? 0 : natures.length;
                const actif = !recherche.trim() && cat === categorie;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => { setCategorie(cat); setRecherche(''); }}
                    className={cn(
                      'relative flex w-full items-center gap-2.5 px-5 py-2 text-left text-[13px] transition-colors',
                      actif ? 'bg-secondary font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
                      recherche.trim() && nb === 0 && 'opacity-40'
                    )}
                  >
                    {actif && <span className="absolute inset-y-0 left-0 w-[2px] bg-foreground" />}
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
                    <span className="flex-1 leading-snug">{CATEGORY_LABELS[cat] ?? cat}</span>
                    <span className="tabular-nums text-[11.5px] text-muted-foreground">{nb}</span>
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-6">
              {affiches.length === 0 && (
                <p className="py-10 text-center text-[13px] text-muted-foreground">Aucune nature ne correspond à « {recherche} ».</p>
              )}
              {affiches.map((g) => (
                <section key={g.categorie}>
                  <h3 className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background pb-2 pt-4 text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span className="h-2 w-2 rounded-[1px]" style={{ backgroundColor: CATEGORY_COLORS[g.categorie] }} />
                    {CATEGORY_LABELS[g.categorie] ?? g.categorie}
                  </h3>
                  <div className="grid grid-cols-1 gap-x-4 py-1 sm:grid-cols-2">
                    {g.natures.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => choisir(n)}
                        className={cn(
                          '-mx-2 flex items-center justify-between gap-2 rounded-[2px] px-2 py-2 text-left text-[13px] leading-snug transition-colors',
                          'hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none',
                          value === n ? 'font-medium text-foreground' : 'text-foreground/85'
                        )}
                      >
                        <span>{getNatureDisplayLabel(n)}</span>
                        {value === n && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
