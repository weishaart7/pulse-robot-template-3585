import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings, AlertCircle, Home, TreePine, Building, Briefcase, Minus, Globe, Calculator, BarChart3 } from 'lucide-react';

interface IFISidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const IFISidebar = ({ activeSection, onSectionChange }: IFISidebarProps) => {
  const sections = [
    { id: 'hypotheses', label: 'Hypothèses', icon: Settings },
    { id: 'situations-particulieres', label: 'Situations particulière', icon: AlertCircle },
    { id: 'immeubles-batis', label: 'Immeubles bâtis', icon: Home },
    { id: 'immeubles-non-batis', label: 'Immeubles non bâtis', icon: TreePine },
    { id: 'biens-detenus-indirectement', label: 'Biens détenus indirectement', icon: Building },
    { id: 'biens-professionnels-exoneres', label: 'Biens professionnels exonérés', icon: Briefcase },
    { id: 'passifs-deductions', label: 'Passifs et déductions', icon: Minus },
    { id: 'ifi-hors-france', label: 'IFI hors de France', icon: Globe },
    { id: 'base-imposable', label: 'Base imposable', icon: Calculator },
    { id: 'bareme', label: 'Barème', icon: BarChart3 },
  ];

  return (
    <div className="w-60 bg-muted/30 border-r p-4">
      <div className="space-y-1">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button
              key={section.id}
              variant="ghost"
              className={cn(
                "w-full justify-start text-left h-auto p-3 overflow-hidden whitespace-normal",
                activeSection === section.id && "bg-primary/10 text-primary border border-primary/20"
              )}
              onClick={() => onSectionChange(section.id)}
            >
              <Icon className="h-4 w-4 mr-3 shrink-0" />
              <span className="text-sm font-medium break-words hyphens-auto leading-tight flex-1 min-w-0">{section.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default IFISidebar;