import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ArrowLeft, Loader2, Search, Trash2 } from 'lucide-react';
import Declaration2042Sidebar from './2042/Declaration2042Sidebar';
import { DECLARATION_2042_SECTIONS } from './2042/declaration2042Sections';
import { DECLARATION_2042_CASES } from './2042/declaration2042CasesIndex';
import { foyerFiscalService } from '@/services/foyerFiscalService';
import { revenusSalairesService } from '@/services/revenusSalairesService';
import { revenusExoneresTauxEffectifService } from '@/services/revenusExoneresTauxEffectifService';
import { pensionsRetraitesRentesService } from '@/services/pensionsRetraitesRentesService';
import { gainsActionnariatSalarieService } from '@/services/gainsActionnariatSalarieService';
import { revenusCapitauxMobiliersService } from '@/services/revenusCapitauxMobiliersService';
import { toast } from '@/hooks/use-toast';

interface Declaration2042InterfaceProps {
  onClose: () => void;
}

const Declaration2042Interface = ({ onClose }: Declaration2042InterfaceProps) => {
  const [activeSection, setActiveSection] = useState(DECLARATION_2042_SECTIONS[0].id);
  const [recherche, setRecherche] = useState('');
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

    setTimeout(() => {
      const champ = document.getElementById(c.elementId);
      if (champ) {
        champ.scrollIntoView({ behavior: 'smooth', block: 'center' });
        champ.focus();
      }
    }, 50);
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex">
      <Declaration2042Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onClose} size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <h1 className="text-2xl font-bold">2042 - Déclaration générale</h1>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmSuppression(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer toutes les données
            </Button>
            <div className="relative ml-auto w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une case (ex. 1AJ, revenus salariés...)"
                className="pl-8"
                value={recherche}
                onChange={ev => setRecherche(ev.target.value)}
              />
              {resultats.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-80 overflow-auto rounded-md border bg-popover shadow-md">
                  {resultats.map((c, i) => {
                    const section = DECLARATION_2042_SECTIONS.find(s => s.id === c.sectionId);
                    return (
                      <button
                        key={`${c.code}-${i}`}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex flex-col gap-0.5"
                        onClick={() => allerVersCase(c)}
                      >
                        <span className="font-medium">{c.code} — {c.label}</span>
                        <span className="text-xs text-muted-foreground">{section?.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {recherche.trim() && resultats.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                  Aucune case trouvée
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <ActiveComponent key={resetKey} />
        </div>
      </div>

      <AlertDialog open={confirmSuppression} onOpenChange={open => { if (!open && !suppressionEnCours) setConfirmSuppression(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les données de la 2042 ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cela supprimera définitivement toutes les données saisies dans la déclaration 2042
              (ménage, salaires, pensions, gains d'actionnariat salarié, revenus de capitaux mobiliers,
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
