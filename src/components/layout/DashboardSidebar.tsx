import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Sparkle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { bottomItems, menuItems, getCurrentNavValue } from '@/components/layout/navigation-items';
import { useSubNav } from '@/contexts/SubNavContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { TreeNav } from '@/components/ui/tree-nav';

const STORAGE_KEY = 'kairos.sidebar.open';
const EASE = [0.25, 0.1, 0.25, 1] as const;
const PANEL_WIDTH = 188;

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

const railButton = cn(
  "relative h-10 w-10 flex items-center justify-center rounded-[8px] transition-colors outline-none",
  "focus-visible:ring-1 focus-visible:ring-white/70"
);

// Sous-menu en arbre (TreeNav) : rail vertical, repère losange et fond qui
// suivent le survol puis reviennent sur l'entrée active.
function SubNavTree({ onItemClick }: { onItemClick?: () => void }) {
  const { items, activeId, onSelect } = useSubNav();
  return (
    <nav>
      <TreeNav
        items={items.map(item => ({ label: item.label, href: `#${item.id}` }))}
        activeHref={`#${activeId}`}
        onSelect={(item, event) => {
          event.preventDefault();
          onSelect(item.href.slice(1));
          onItemClick?.();
        }}
      />
    </nav>
  );
}

// Contenu du panneau (nom du module + sous-menu), partagé par le panneau clair
// (écran large) et le panneau mobile (DashboardTopNav), qui y ajoute les liens du bas.
export function SidebarNav({
  onItemClick,
  onCollapse,
  showBottomLinks = false,
}: {
  onItemClick?: () => void;
  onCollapse?: () => void;
  showBottomLinks?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const moduleLabel = menuItems.find(m => m.value === getCurrentNavValue(location.pathname))?.label;

  return (
    <>
      <div className="flex items-start justify-between gap-2 px-5 pt-5 pb-4">
        <div className="font-['Instrument_Sans','Inter',sans-serif] font-medium text-[22px] leading-none tracking-[-0.02em] text-foreground truncate">
          {moduleLabel}
        </div>
        {onCollapse && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={onCollapse}
                className="-mt-1 p-1 rounded-[6px] text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Réduire le panneau"
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Réduire (⌘B)</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3">
        <SubNavTree onItemClick={onItemClick} />
      </div>

      {showBottomLinks && (
        <div className="p-2 border-t border-border space-y-0.5">
          {bottomItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => {
                  navigate(item.href);
                  onItemClick?.();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-[10px] transition-colors text-left",
                  isActive
                    ? "bg-background text-foreground font-medium shadow-whisper"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                )}
              >
                <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

function RailTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// Écran large : rail noir des modules (esprit navbar de la landing) + panneau clair
// du sous-menu, repliable. Masqués sur téléphone (navigation dans DashboardTopNav).
export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: subNavItems } = useSubNav();
  const currentValue = getCurrentNavValue(location.pathname);

  const [open, setOpenState] = useState(readStoredOpen);
  const setOpen = useCallback((value: boolean) => {
    setOpenState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // stockage indisponible : l'état reste en mémoire
    }
  }, []);

  // Raccourci ⌘B / Ctrl+B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  const panelVisible = open && subNavItems.length > 0;

  return (
    <div className="hidden md:flex shrink-0 p-1.5 bg-secondary">
      {/* Rail des modules */}
        <div className="w-16 flex flex-col items-center py-4 gap-1 bg-black text-white rounded-[12px]">
          <button
            onClick={() => navigate('/')}
            className={cn(railButton, "mb-4")}
            aria-label="Accueil Kairos"
          >
            <Sparkle className="h-6 w-6 fill-white text-white" strokeWidth={1.5} />
          </button>

          <nav aria-label="Modules" className="flex flex-col items-center gap-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              const active = item.value === currentValue;
              return (
                <RailTooltip key={item.value} label={item.label}>
                  <button
                    onClick={() => (active ? setOpen(!open) : navigate(item.href))}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(railButton, active ? "bg-white text-black" : "text-white/55 hover:text-white")}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                  </button>
                </RailTooltip>
              );
            })}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-1 pt-3 border-t border-white/10">
            {bottomItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <RailTooltip key={item.href} label={item.label}>
                  <button
                    onClick={() => navigate(item.href)}
                    aria-label={item.label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(railButton, active ? "bg-white text-black" : "text-white/55 hover:text-white")}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </RailTooltip>
              );
            })}
            <ProfileMenu
              side="right"
              align="end"
              triggerClassName={cn(railButton, "text-white/55 hover:text-white hover:bg-transparent")}
            />
          </div>
        </div>

      {/* Panneau replié : bouton miroir de « Réduire », à la même hauteur, sur la bande taupe. */}
      {!open && subNavItems.length > 0 && (
        <div className="w-10 flex justify-center pt-4">
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(true)}
                className="h-fit p-1 rounded-[6px] text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="Afficher le panneau"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.25} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Afficher (⌘B)</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Panneau du sous-menu */}
      <AnimatePresence initial={false}>
        {panelVisible && (
          <motion.div
            key="subnav-panel"
            className="flex flex-col overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: PANEL_WIDTH }}
            exit={{ width: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="flex flex-col h-full" style={{ width: PANEL_WIDTH }}>
              <SidebarNav onCollapse={() => setOpen(false)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
