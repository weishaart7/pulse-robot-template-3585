import { Landmark } from 'lucide-react';
import { WorkspaceHeader } from '@/components/layout/workspace-panel';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import FiscalDeclarationsCard from './components/FiscalDeclarationsCard';
import FiscalOverviewCard from './components/FiscalOverviewCard';
import TaxRateCard from './components/TaxRateCard';
import { useFiscalOverview } from '@/hooks/useFiscalOverview';

// Cadre « panneau de travail », sur le modèle d'Immobilier, Retraite et Famille : barre d'en-tête
// (fil d'Ariane), titre 24 px et rappel, puis déclarations en colonne à gauche, imposition puis taux marginal à droite.
const FiscaliteSection = () => {
  const fiscalOverview = useFiscalOverview();
  const valeursParDefaut = !fiscalOverview.foyerRenseigne || !fiscalOverview.revenusRenseignes;

  return (
    <div className="workspace-panel -mx-4 -mt-3 md:-m-6">
      <WorkspaceHeader icon={<Landmark strokeWidth={1.75} />} trail={['Fiscalité', "Vue d'ensemble"]} />

      <div className="px-8 pt-6 pb-4">
        <h1 className="text-[24px] font-medium leading-tight tracking-[-0.02em]">Vue d'ensemble</h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          Revenus 2025, barème 2026
          {valeursParDefaut && ' · calcul sur des valeurs par défaut : complétez le foyer et les revenus dans la 2042'}
        </p>
      </div>

      {/* Déclarations à gauche sur toute la hauteur ; imposition puis taux marginal à droite. */}
      <div className="grid grid-cols-1 divide-y divide-border border-t border-border lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)] lg:divide-x lg:divide-y-0">
        <FiscalDeclarationsCard overview={fiscalOverview} onDeclarationClosed={fiscalOverview.refetch} />
        <div>
          {fiscalOverview.loading ? (
            <div className="px-8 py-6"><LoadingSpinner text="Calcul de l'imposition..." /></div>
          ) : (
            <>
              <FiscalOverviewCard overview={fiscalOverview} />
              <TaxRateCard overview={fiscalOverview} />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiscaliteSection;
