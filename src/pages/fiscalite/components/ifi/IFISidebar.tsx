import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings, AlertCircle, Home, TreePine, Building } from 'lucide-react';

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
                "w-full justify-start text-left h-auto p-3",
                activeSection === section.id && "bg-primary/10 text-primary border border-primary/20"
              )}
              onClick={() => onSectionChange(section.id)}
            >
              <Icon className="h-4 w-4 mr-3 shrink-0" />
              <span className="text-sm font-medium">{section.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default IFISidebar;