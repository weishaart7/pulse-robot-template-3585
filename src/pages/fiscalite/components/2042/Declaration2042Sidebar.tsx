import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DECLARATION_2042_SECTIONS } from './declaration2042Sections';

interface Declaration2042SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Declaration2042Sidebar = ({ activeSection, onSectionChange }: Declaration2042SidebarProps) => {
  return (
    <div className="w-60 bg-muted/30 border-r p-4">
      <div className="space-y-1">
        {DECLARATION_2042_SECTIONS.map((section) => {
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

export default Declaration2042Sidebar;
