import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { panelPrimaryButtonClass } from '@/components/layout/workspace-panel';
import { cn } from '@/lib/utils';

// Cadre d'une section de la 2042 au format panneau de travail (comme la 2044 et la 2042-IFI) :
// titre 20 px et rappel, contenu bord à bord, barre « Enregistrer » collée en bas de l'écran. Chaque
// section garde sa propre sauvegarde (pas d'enregistrement global, cf. docs/fiscalite.md §2).

interface Cadre2042Props {
  titre: string;
  description?: ReactNode;
  saving?: boolean;
  onSave?: () => void;
  children: ReactNode;
}

export const Cadre2042 = ({ titre, description, saving, onSave, children }: Cadre2042Props) => (
  <section className="flex min-h-full flex-col">
    <div className="flex-1 px-8 pb-8 pt-8">
      <h2 className="text-[20px] font-medium tracking-[-0.015em] text-foreground">{titre}</h2>
      {description && <div className="mt-1.5 max-w-3xl text-[13px] leading-5 text-muted-foreground">{description}</div>}
      <div className="mt-6 max-w-[980px]">{children}</div>
    </div>
    {onSave && (
      <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-border bg-secondary px-8 py-3">
        <span className="text-[12px] text-muted-foreground">Les montants de cette section sont enregistrés ensemble.</span>
        <button type="button" onClick={onSave} disabled={saving} className={cn('inline-flex items-center', panelPrimaryButtonClass, 'disabled:opacity-60')}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Enregistrer
        </button>
      </div>
    )}
  </section>
);

export const Cadre2042Chargement = ({ texte }: { texte: string }) => (
  <div className="px-8 py-8"><LoadingSpinner text={texte} /></div>
);

/** Séparateur entre deux blocs de lignes d'une même section. */
export const SeparateurCadre = () => <div aria-hidden className="h-6" />;

/** Intertitre d'un bloc de lignes, sans bande (ex. « Rentes viagères à titre onéreux »). */
export const IntertitreCadre = ({ titre, children }: { titre: string; children?: ReactNode }) => (
  <div className="pb-2 pt-6">
    <p className="text-[13px] font-medium text-foreground">{titre}</p>
    {children && <div className="mt-0.5 text-[12.5px] text-muted-foreground">{children}</div>}
  </div>
);
