import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { bottomItems } from '@/components/layout/navigation-items';
import { useSubNav } from '@/contexts/SubNavContext';

// Contenu de navigation (sous-menu du module + liens du bas), partagé par la
// barre latérale (écran large) et le panneau mobile (DashboardTopNav).
export function SidebarNav({ open = true, onItemClick }: { open?: boolean; onItemClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { items: subNavItems, activeId: subNavActiveId, onSelect: onSubNavSelect } = useSubNav();

  const onSubNavClick = (id: string) => {
    onSubNavSelect(id);
    onItemClick?.();
  };

  const handleNavigation = (href: string) => {
    navigate(href);
    onItemClick?.();
  };

  return (
    <>
      {/* Sous-menu du module actif */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {subNavItems.map(item => {
          const isActive = subNavActiveId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSubNavClick(item.id)}
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors text-left",
                isActive
                  ? "bg-background text-foreground font-medium shadow-whisper"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                !open && "justify-center"
              )}
            >
              <span
                className={cn(
                  "truncate whitespace-nowrap overflow-hidden transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                  open ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Sections du bas */}
      <div className="p-2 space-y-0.5 border-t border-border">
        {bottomItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-full transition-colors text-left",
                isActive
                  ? "bg-background text-foreground font-medium shadow-whisper"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
                !open && "justify-center"
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
              <span
                className={cn(
                  "truncate whitespace-nowrap overflow-hidden transition-all duration-150 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                  open ? "max-w-[160px] opacity-100" : "max-w-0 opacity-0"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export function DashboardSidebar() {
  const [open, setOpen] = useState(true);

  return (
    <motion.div
      // Masquée sur téléphone : la navigation passe dans le panneau ouvert
      // depuis le bouton menu de DashboardTopNav.
      className="hidden md:flex flex-col overflow-hidden shrink-0 relative bg-secondary text-foreground rounded-card ml-3 mt-3 mb-3"
      animate={{
        width: open ? 196 : 64,
      }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {/* Toggle */}
      <div className={cn("py-3 flex items-center", open ? "pl-3 pr-3 justify-end" : "justify-center")}>
        <button
          onClick={() => setOpen(!open)}
          className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
          aria-label={open ? 'Réduire la barre latérale' : 'Ouvrir la barre latérale'}
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      <SidebarNav open={open} />
    </motion.div>
  );
}
