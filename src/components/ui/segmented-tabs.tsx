import { cn } from '@/lib/utils';
import { THEME_ACCENT, THEME_DIVIDER, THEME_INK, THEME_LABEL } from '@/lib/theme';

interface SegmentedTab {
  id: string;
  label: string;
}

interface SegmentedTabsProps {
  tabs: SegmentedTab[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
}

export function SegmentedTabs({ tabs, value, onValueChange, className }: SegmentedTabsProps) {
  return (
    <div className={cn('flex items-center gap-6', className)} style={{ borderBottom: `1px solid ${THEME_DIVIDER}` }} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(tab.id)}
            className="border-b-2 px-0 pb-2.5 -mb-px text-sm font-semibold transition-colors"
            style={{
              color: isActive ? THEME_INK : THEME_LABEL,
              borderBottomColor: isActive ? THEME_ACCENT : 'transparent',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
