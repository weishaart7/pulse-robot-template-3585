import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { WorkspaceHeader, panelButtonClass } from '@/components/layout/workspace-panel';
import type { FiscalOverview } from '@/hooks/useFiscalOverview';
import { AppleSpotlight } from '@/components/block/apple-spotlight';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, FileText, Loader2, Search, Trash2 } from 'lucide-react';
import Declaration2042Sidebar from './2042/Declaration2042Sidebar';
import { DECLARATION_2042_SECTIONS } from './2042/declaration2042Sections';
import { DECLARATION_2042_CASES } from './2042/declaration2042CasesIndex';
import { foyerFiscalService } from '@/services/foyerFiscalService';
import { revenusSalairesService } from '@/services/revenusSalairesService';
import { revenusExoneresTauxEffectifService } from '@/services/revenusExoneresTauxEffectifService';
import { pensionsRetraitesRentesService } from '@/services/pensionsRetraitesRentesService';
import { gainsActionnariatSalarieService } from '@/services/gainsActionnariatSalarieService';
import { revenusCapitauxMobiliersService } from '@/services/revenusCapitauxMobiliersService';
import { plusValuesGainsDiversService } from '@/services/plusValuesGainsDiversService';
import { revenusFonciers2042Service } from '@/services/revenusFonciers2042Service';
import { revenusNonSalariesService } from '@/services/revenusNonSalariesService';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Declaration2042InterfaceProps {
  onClose: () => void;
  /** Vision générale : résumé de l'impôt dans la navigation, rechargé à chaque changement de section. */
  overview: FiscalOverview;
}

const Declaration2042Interface = ({ onClose, overview }: Declaration2042InterfaceProps) => {
  const [activeSection, setActiveSection] = useState(DECLARATION_2042_SECTIONS[0].id);
  const [recherche, setRecherche] = useState('');
  const [spotlightOuvert, setSpotlightOuvert] = useState(false);
  const [confirmSuppression, setConfirmSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const supprimerToutesLesDonnees = async () => {
    try {
      setSuppressionEnCours(true);
      await Promise.all([
        foyerFiscalService.deleteFoyerFiscal(),
        revenusSalairesService.deleteRevenusSalaires(),
        revenusExoneresTauxEffectifService.deleteRevenusExoneresTauxEffectif(),
        pensionsRetraitesRentesService.deletePensionsRetraitesRentes(),
        gainsActionnariatSalarieService.deleteGainsActionnariatSalarie(),
        revenusCapitauxMobiliersService.deleteRevenusCapitauxMobiliers(),
        plusValuesGainsDiversService.deletePlusValuesGainsDivers(),
        revenusFonciers2042Service.deleteRevenusFonciers2042(),
        revenusNonSalariesService.deleteRevenusNonSalaries(),
      ]);
      setResetKey(k => k + 1);
      toast({
        title: "Données supprimées",
        description: "Toutes les données de la déclaration 2042 ont été supprimées.",
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error deleting declaration 2042 data:', error);
      }
      toast({
        title: "Erreur",
        description: "Impossible de supprimer toutes les données de la déclaration 2042.",
        variant: "destructive",
      });
    } finally {
      setSuppressionEnCours(false);
      setConfirmSuppression(false);
    }
  };

  // Chaque section s'enregistre à part : changer de section recharge l'impôt du résumé.
  const { refetch } = overview;
  useEffect(() => { refetch(); }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  const sectionActive = DECLARATION_2042_SECTIONS.find(section => section.id === activeSection) ?? DECLARATION_2042_SECTIONS[0];

  // ⌘K / Ctrl+K ouvre la recherche de case.
  useEffect(() => {
    const raccourci = (ev: KeyboardEvent) => {
      if ((ev.metaKey || ev.ctrlKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); setSpotlightOuvert(true); }
    };
    window.addEventListener('keydown', raccourci);
    return () => window.removeEventListener('keydown', raccourci);
  }, []);

  const ActiveComponent =
    DECLARATION_2042_SECTIONS.find(section => section.id === activeSection)?.component
    ?? DECLARATION_2042_SECTIONS[0].component;

  const resultats = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return [];
    return DECLARATION_2042_CASES.filter(
      c => c.code.toLowerCase().includes(terme) || c.label.toLowerCase().includes(terme)
    ).slice(0, 20);
  }, [recherche]);

  const allerVersCase = (c: (typeof DECLARATION_2042_CASES)[number]) => {
    setActiveSection(c.sectionId);
    setRecherche('');
    setSpotlightOuvert(false);

    setTimeout(() => {
      const champ = document.getElementById(c.elementId);
      if (champ) {
        champ.scrollIntoView({ behavior: 'smooth', block: 'center' });
        champ.focus();
      }
    }, 50);
  };

  return (
    <div className="workspace-panel fixed inset-0 z-50 flex flex-col bg-background">
      <WorkspaceHeader
        icon={<FileText />}
        trail={['Fiscalité', '2042 — Déclaration générale', sectionActive.label]}
        actions={(
          <>
            <button
              type="button"
              onClick={() => setSpotlightOuvert(true)}
              aria-label="Rechercher une case"
              className={cn(panelButtonClass, 'inline-flex items-center gap-2 text-muted-foreground xl:w-72')}
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden flex-1 truncate text-left font-normal xl:inline">Rechercher une case (1AJ, dividendes…)</span>
              <kbd className="rounded-[2px] border border-border px-1 text-[10.5px] text-muted-foreground">⌘K</kbd>
            </button>
            <Button
              variant="ghost"
              onClick={() => setConfirmSuppression(true)}
              aria-label="Supprimer toutes les données de la 2042"
              title="Supprimer toutes les données de la 2042"
              className={cn(panelButtonClass, 'border-transparent text-destructive hover:bg-destructive/10 hover:text-destructive')}
            >
              <Trash2 className="h-3.5 w-3.5 xl:mr-1.5" />
              <span className="hidden xl:inline">Tout supprimer</span>
            </Button>
            <Button variant="ghost" onClick={onClose} className={panelButtonClass}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Retour
            </Button>
          </>
        )}
      />

      <div className="flex min-h-0 flex-1">
      <Declaration2042Sidebar activeSection={activeSection} onSectionChange={setActiveSection} overview={overview} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppleSpotlight
          isOpen={spotlightOuvert}
          handleClose={() => { setSpotlightOuvert(false); setRecherche(''); }}
          value={recherche}
          onChange={setRecherche}
          placeholder="Rechercher une case (ex. 1AJ, revenus salariés...)"
        >
          {!recherche.trim() ? null : resultats.length > 0 ? (
            resultats.map((c, i) => {
              const section = DECLARATION_2042_SECTIONS.find(s => s.id === c.sectionId);
              return (
                <button
                  key={`${c.code}-${i}`}
                  type="button"
                  className="flex w-full items-start gap-3 rounded-[2px] px-3 py-2 text-left text-[13px] hover:bg-secondary"
                  onClick={() => allerVersCase(c)}
                >
                  <span className="mt-px rounded-[2px] bg-lagon-soft px-1.5 text-[11.5px] font-medium tabular-nums text-lagon-ink">{c.code}</span>
                  <span className="min-w-0">
                    <span className="block text-foreground">{c.label}</span>
                    <span className="block text-[12px] text-muted-foreground">{section?.groupe} · {section?.label}</span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">Aucune case trouvée</div>
          )}
        </AppleSpotlight>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto min-h-full max-w-[1180px]">
            <ActiveComponent key={resetKey} />
          </div>
        </main>
      </div>
      </div>

      <AlertDialog open={confirmSuppression} onOpenChange={open => { if (!open && !suppressionEnCours) setConfirmSuppression(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les données de la 2042 ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela supprimera définitivement toutes les données saisies dans la déclaration 2042
              (ménage, salaires, pensions, gains d'actionnariat salarié, revenus de capitaux mobiliers, plus-values, revenus fonciers saisis dans la 2042, revenus non salariés,
              salaires exonérés à taux effectif). Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suppressionEnCours}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={ev => { ev.preventDefault(); supprimerToutesLesDonnees(); }}
              disabled={suppressionEnCours}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {suppressionEnCours ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Declaration2042Interface;
