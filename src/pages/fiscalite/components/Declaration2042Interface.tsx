import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search } from 'lucide-react';
import Declaration2042Sidebar from './2042/Declaration2042Sidebar';
import { DECLARATION_2042_SECTIONS } from './2042/declaration2042Sections';
import { DECLARATION_2042_CASES } from './2042/declaration2042CasesIndex';

interface Declaration2042InterfaceProps {
  onClose: () => void;
}

const Declaration2042Interface = ({ onClose }: Declaration2042InterfaceProps) => {
  const [activeSection, setActiveSection] = useState(DECLARATION_2042_SECTIONS[0].id);
  const [recherche, setRecherche] = useState('');

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
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default Declaration2042Interface;
