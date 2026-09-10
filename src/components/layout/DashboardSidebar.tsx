import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { bottomItems } from '@/components/layout/navigation-items';
import { useSubNav } from '@/contexts/SubNavContext';

export function DashboardSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);
  const { items: subNavItems, activeId: subNavActiveId, onSelect: onSubNavSelect } = useSubNav();

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <motion.div
      className="flex flex-col h-full overflow-hidden flex-shrink-0 relative bg-sidebar text-sidebar-foreground border-r border-border"
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
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors"
          aria-label={open ? 'Réduire la barre latérale' : 'Ouvrir la barre latérale'}
        >
          {open ? (
            <PanelLeftClose className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <PanelLeftOpen className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>
      </div>

      {/* Sous-menu du module actif */}
      <nav className="flex-1 p-2 space-y-0 overflow-y-auto overflow-x-hidden">
        {subNavItems.map(item => {
          const isActive = subNavActiveId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSubNavSelect(item.id)}
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left",
                isActive
                  ? "text-black font-semibold before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                  : "font-medium text-[#8B9095] hover:bg-sidebar-accent",
                !open && "justify-center"
              )}
            >
              <motion.span
                className="truncate whitespace-nowrap"
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </nav>

      {/* Sections du bas */}
      <div className="p-2 space-y-0 border-t border-border">
        {bottomItems.map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                "relative w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left",
                isActive
                  ? "text-black font-semibold before:content-[''] before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:bg-primary before:rounded-full"
                  : "font-medium text-[#8B9095] hover:bg-sidebar-accent",
                !open && "justify-center"
              )}
            >
              <Icon className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={1.5} />
              <motion.span
                className="truncate whitespace-nowrap"
                animate={{
                  opacity: open ? 1 : 0,
                  width: open ? 'auto' : 0,
                }}
                transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {item.label}
              </motion.span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
