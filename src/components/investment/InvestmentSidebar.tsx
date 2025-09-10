import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Home, Shield, Clock, Building, TrendingUp, DollarSign, FileText, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarSection {
  id: string;
  label: string;
  icon: React.ElementType;
  subsections?: { id: string; label: string }[];
}

const sections: SidebarSection[] = [
  {
    id: 'tableau-de-bord',
    label: 'Tableau de bord',
    icon: Home,
  },
  {
    id: 'assurance',
    label: 'Assurance',
    icon: Shield,
    subsections: [
      { id: 'assurance-vie', label: 'Assurance-vie' },
      { id: 'assurance-vie-lux', label: 'Assurance-vie luxembourgeoise' },
      { id: 'contrat-capitalisation', label: 'Contrat de capitalisation' },
    ],
  },
  {
    id: 'retraite',
    label: 'Retraite',
    icon: Clock,
    subsections: [
      { id: 'per', label: 'PER' },
    ],
  },
  {
    id: 'immobilier',
    label: 'Immobilier',
    icon: Building,
    subsections: [
      { id: 'scpi', label: 'SCPI' },
      { id: 'club-deal', label: 'Club deal' },
    ],
  },
  {
    id: 'private-equity',
    label: 'Private Equity',
    icon: TrendingUp,
    subsections: [
      { id: 'gfi-gfa', label: 'GFI / GFA' },
      { id: 'fonds-private-equity', label: 'Fonds de Private Equity' },
      { id: 'investissements-alternatifs', label: 'Investissements alternatifs' },
    ],
  },
  {
    id: 'financier',
    label: 'Financier',
    icon: DollarSign,
  },
  {
    id: 'produits-structures',
    label: 'Produits structurés',
    icon: FileText,
  },
  {
    id: 'investir-societe',
    label: 'Investir en société',
    icon: Briefcase,
    subsections: [
      { id: '150-0-b-ter', label: '150 0-B Ter' },
      { id: 'contrat-capitalisation-pm', label: 'Contrat de capitalisation PM' },
    ],
  },
];

interface InvestmentSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const InvestmentSidebar: React.FC<InvestmentSidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (sectionId: string) => {
    if (expandedSections.includes(sectionId)) {
      setExpandedSections(expandedSections.filter(id => id !== sectionId));
    } else {
      setExpandedSections([...expandedSections, sectionId]);
    }
  };

  const handleSectionClick = (section: SidebarSection) => {
    if (section.subsections) {
      toggleSection(section.id);
    } else {
      onSectionChange(section.id);
    }
  };

  const handleSubsectionClick = (subsectionId: string) => {
    onSectionChange(subsectionId);
  };

  return (
    <div className="w-80 bg-background border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IL</span>
          </div>
          <span className="font-semibold text-lg text-foreground">ImerisLabs</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {sections.map((section) => (
          <div key={section.id}>
            <button
              onClick={() => handleSectionClick(section)}
              className={cn(
                "w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors",
                activeSection === section.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
              </div>
              {section.subsections && (
                expandedSections.includes(section.id) ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {/* Subsections */}
            {section.subsections && expandedSections.includes(section.id) && (
              <div className="ml-6 mt-2 space-y-1">
                {section.subsections.map((subsection) => (
                  <button
                    key={subsection.id}
                    onClick={() => handleSubsectionClick(subsection.id)}
                    className={cn(
                      "w-full text-left p-2 rounded-md text-sm transition-colors",
                      activeSection === subsection.id
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {subsection.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
};