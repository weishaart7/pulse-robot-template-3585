import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Settings, AlertCircle, Home, TreePine, Building, Briefcase, Minus, Globe, Calculator, BarChart3, FileText } from 'lucide-react';

interface IFISidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const IFISidebar = ({ activeSection, onSectionChange }: IFISidebarProps) => {
  const sections = [
    { id: 'hypotheses', label: 'Hypothèses', icon: Settings },
    { id: 'liste-biens-ifi', label: 'Liste des biens à l\'IFI', icon: FileText },
    { id: 'bareme-ifi', label: 'Barème de l\'IFI', icon: BarChart3 },
    { id: 'reductions-plafonnement', label: 'Réduction & Plafonnement de l\'IFI', icon: Calculator },
    { id: 'montant-redevable', label: 'Montant redevable à l\'IFI', icon: AlertCircle },
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