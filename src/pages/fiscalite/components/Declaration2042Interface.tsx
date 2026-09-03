import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Declaration2042Sidebar from './2042/Declaration2042Sidebar';
import { DECLARATION_2042_SECTIONS } from './2042/declaration2042Sections';

interface Declaration2042InterfaceProps {
  onClose: () => void;
}

const Declaration2042Interface = ({ onClose }: Declaration2042InterfaceProps) => {
  const [activeSection, setActiveSection] = useState(DECLARATION_2042_SECTIONS[0].id);

  const ActiveComponent =
    DECLARATION_2042_SECTIONS.find(section => section.id === activeSection)?.component
    ?? DECLARATION_2042_SECTIONS[0].component;

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
