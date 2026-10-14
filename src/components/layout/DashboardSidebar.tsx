import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { AureviaLogo } from '@/components/brand/AureviaLogo';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  Armchair, Article, Briefcase, Buildings, ChatCircleDots, DotsThreeVertical, HouseSimple, Receipt,
  SidebarSimple, Sparkle, TreeStructure, UsersThree, Vault, Wallet, type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { useAuth } from '@/contexts/AuthContext';
import { bottomItems, menuItems, getCurrentNavValue } from '@/components/layout/navigation-items';
import { useSubNav } from '@/contexts/SubNavContext';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { TreeNav } from '@/components/ui/tree-nav';

const STORAGE_KEY = 'kairos.sidebar.open';
const EASE = [0.25, 0.1, 0.25, 1] as const;
const PANEL_WIDTH = 248;
const RAIL_WIDTH = 64;

function readStoredOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
}

// Sous-menu en arbre (TreeNav) : rail vertical, repère losange et fond qui
// suivent le survol puis reviennent sur l'entrée active.
function SubNavTree({ onItemClick, variant = 'rail' }: { onItemClick?: () => void; variant?: 'rail' | 'thread' }) {
  const { items, activeId, onSelect } = useSubNav();
  return (
    <nav>
      <TreeNav
        items={items.map(item => ({ label: item.label, href: `#${item.id}` }))}
        activeHref={`#${activeId}`}
        variant={variant}
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
      <div className="flex items-center justify-between gap-2 px-5 pt-5 pb-4">
        <div className="font-['Instrument_Sans','Inter',sans-serif] font-medium text-[22px] leading-none tracking-[-0.02em] text-foreground truncate">
          {moduleLabel}
        </div>
        {onCollapse && (
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <button
                onClick={onCollapse}
                className="-my-1 p-1 rounded-[6px] text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

function RailTooltip({ label, enabled, children }: { label: string; enabled: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip delayDuration={150}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

// Icônes Phosphor propres à la barre latérale : bicolores au repos, pleines sur l'entrée active.
// (La navigation mobile garde les icônes Lucide de navigation-items.)
const SIDEBAR_ICONS: Record<string, PhosphorIcon> = {
  dashboard: HouseSimple,
  famille: UsersThree,
  patrimoine: Vault,
  immobilier: Buildings,
  societes: Briefcase,
  budget: Wallet,
  retraite: Armchair,
  fiscalite: Receipt,
  transmission: TreeStructure,
  '/dashboard/blog': Article,
  '/nouveautes': Sparkle,
  '/suggestion': ChatCircleDots,
};

const navRow = cn(
  "relative flex h-9 items-center gap-2.5 rounded-[6px] text-[14px] font-[350] tracking-[-0.01em] transition-colors outline-none",
  "focus-visible:ring-1 focus-visible:ring-white/70"
);

function displayName(user: ReturnType<typeof useAuth>['user']): string {
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined;
  return meta?.full_name || meta?.name || user?.email?.split('@')[0] || '';
}

// Écran large : barre latérale noire chaude pleine, dont le noir se prolonge en bande autour
// de la carte principale. Dépliée : logo + nom, modules avec libellés, sous-menu du module
// actif imbriqué dessous, carte profil en bas. Repliée : rail d'icônes. Masquée sur téléphone.
export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: subNavItems } = useSubNav();
  const currentValue = getCurrentNavValue(location.pathname);
  const { user } = useAuth();
  const name = displayName(user);

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

  const rowClass = (active: boolean) =>
    cn(
      navRow,
      open ? "w-full px-3" : "w-9 justify-center",
      active ? "bg-sidebar-active text-white" : "text-sidebar-ink hover:bg-white/[0.04] hover:text-white"
    );

  return (
    <motion.aside
      className="sidebar-dark hidden md:flex shrink-0 flex-col bg-sidebar-bg text-white overflow-hidden"
      initial={false}
      animate={{ width: open ? PANEL_WIDTH : RAIL_WIDTH }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      {/* En-tête : logo + nom, bouton de repli */}
      <div className={cn("flex items-center pt-5 pb-5", open ? "justify-between pl-5 pr-4" : "flex-col gap-4 px-3")}>
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 rounded-[6px] outline-none focus-visible:ring-1 focus-visible:ring-white/70"
          aria-label="Accueil Aurevia"
        >
          <AureviaLogo className="h-6 w-6 shrink-0 text-white" />
          {open && (
            <span className="text-[20px] font-medium leading-none tracking-[-0.03em]">Aurevia</span>
          )}
        </button>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <button
              onClick={() => setOpen(!open)}
              className="p-1 rounded-[6px] text-sidebar-muted hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white/70"
              aria-label={open ? "Réduire la barre latérale" : "Déplier la barre latérale"}
            >
              <SidebarSimple size={19} weight="duotone" className={open ? undefined : "-scale-x-100"} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{open ? 'Réduire' : 'Déplier'} (⌘B)</TooltipContent>
        </Tooltip>
      </div>

      {/* Modules */}
      <nav aria-label="Modules" className={cn("flex-1 overflow-y-auto overflow-x-hidden flex flex-col gap-1 px-3", !open && "items-center")}>
        {menuItems.map(item => {
          const Icon = SIDEBAR_ICONS[item.value];
          const active = item.value === currentValue;
          return (
            <div key={item.value} className={cn("flex flex-col", !open && "items-center")}>
              <RailTooltip label={item.label} enabled={!open}>
                <button
                  onClick={() => navigate(item.href)}
                  aria-label={open ? undefined : item.label}
                  aria-current={active ? 'page' : undefined}
                  className={rowClass(active)}
                >
                  <Icon size={18} weight={active ? "fill" : "duotone"} className="shrink-0" />
                  {open && <span className="truncate">{item.label}</span>}
                </button>
              </RailTooltip>
              {open && active && subNavItems.length > 0 && (
                <div className="pl-[21px] pt-1 pb-1">
                  <SubNavTree variant="thread" />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Liens du bas + carte profil */}
      <div className={cn("flex flex-col gap-1 px-3 pt-3 pb-3", !open && "items-center")}>
        {bottomItems.map(item => {
          const Icon = SIDEBAR_ICONS[item.href];
          const active = location.pathname === item.href;
          return (
            <RailTooltip key={item.href} label={item.label} enabled={!open}>
              <button
                onClick={() => navigate(item.href)}
                aria-label={open ? undefined : item.label}
                aria-current={active ? 'page' : undefined}
                className={cn(rowClass(active), "h-8 text-[13px]")}
              >
                <Icon size={16} weight={active ? "fill" : "duotone"} className="shrink-0" />
                {open && <span className="truncate">{item.label}</span>}
              </button>
            </RailTooltip>
          );
        })}
        <ProfileMenu
          side="right"
          align="end"
          triggerClassName={cn(
            "mt-2 flex items-center rounded-[6px] bg-sidebar-card text-white hover:bg-sidebar-active transition-colors",
            open ? "w-full gap-2.5 p-2.5 text-left" : "h-10 w-10 justify-center p-0"
          )}
          label={
            <>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-active text-[14px] font-medium uppercase">
                {name.charAt(0)}
              </span>
              {open && (
                <>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-normal leading-tight tracking-[-0.01em]">{name}</span>
                    <span className="truncate text-[12px] leading-tight text-sidebar-muted">{user?.email}</span>
                  </span>
                  <DotsThreeVertical size={18} weight="bold" className="shrink-0 text-sidebar-muted" />
                </>
              )}
            </>
          }
        />
      </div>
    </motion.aside>
  );
}
