import { useState, type ReactNode } from 'react';
import { Wallet } from 'lucide-react';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';
import { IncompleteAssetsBanner } from '@/components/patrimoine/IncompleteAssetsBanner';
import { AssetDetailsDialog } from '@/components/patrimoine/AssetDetailsDialog';
import { useAssets } from '@/hooks/useAssets';
import { Asset } from '@/services/assetService';

interface PatrimoinePanelProps {
  /** Dernier maillon du fil d'Ariane (« Résumé », « Actifs », « Passifs »). */
  trail: string;
  title: string;
  summary?: ReactNode;
  actions?: ReactNode;
  /** Contenu posé bord à bord (bandeaux filetés gérant leurs propres marges). */
  bare?: boolean;
  children: ReactNode;
}

// Cadre « panneau de travail » des onglets Patrimoine, sur le modèle des pages Famille :
// barre d'en-tête (fil d'Ariane + actions), titre 24 px et rappel, bandeau des actifs
// incomplets, puis le contenu sous un filet.
export function PatrimoinePanel({ trail, title, summary, actions, bare, children }: PatrimoinePanelProps) {
  const { assets } = useAssets();
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<Wallet strokeWidth={1.75} />} trail={['Patrimoine', trail]} actions={actions} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">{title}</h1>
        {summary && <p className="mt-1 text-[12.5px] text-muted-foreground">{summary}</p>}
      </div>

      {/* Le bandeau se masque seul s'il n'y a rien à signaler ou s'il a été fermé. */}
      <div className="px-8 empty:hidden [&:not(:empty)]:pb-4">
        <IncompleteAssetsBanner assets={assets} onAssetClick={setSelectedAsset} />
      </div>

      <div className={bare ? 'border-t border-border' : 'border-t border-border px-8 py-6'}>{children}</div>

      <AssetDetailsDialog
        asset={selectedAsset}
        open={!!selectedAsset}
        onOpenChange={(open) => { if (!open) setSelectedAsset(null); }}
      />
    </div>
  );
}

/** Bouton d'ajout des onglets (même habillage que « Ajouter un membre »). */
export const addButtonClass =
  'inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-foreground hover:bg-foreground/85 text-background shadow-whisper pl-1 pr-4 py-1 text-sm font-medium transition-colors';

/** Bouton « Retour » de la barre d'en-tête (vues de détail). */
export function BackButton({ onClick, label = 'Retour' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-[2px] border border-border px-3 text-[12.5px] font-medium text-foreground transition-colors hover:bg-secondary"
    >
      {label}
    </button>
  );
}
