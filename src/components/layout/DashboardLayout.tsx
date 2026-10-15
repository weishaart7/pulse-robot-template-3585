import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { DashboardTopNav } from '@/components/layout/DashboardTopNav';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { SubNavProvider } from '@/contexts/SubNavContext';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  // Fondu au blanc en bas de la zone principale tant qu'il reste du contenu à faire
  // défiler (la barre de défilement y est masquée).
  const [moreBelow, setMoreBelow] = useState(false);

  const update = useCallback(() => {
    const el = mainRef.current;
    if (el) setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
  }, []);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [update, pathname]);

  return (
    <SubNavProvider>
      <div className={cn("dashboard-shell flex flex-col bg-background w-full h-screen overflow-hidden")}>
        <DashboardTopNav />
        {/* Écran large : noir chaud continu avec la barre latérale ; le contenu est une
            plaque eggshell arrondie, entourée d'une bande noire. */}
        <div className="flex flex-1 min-h-0 md:bg-sidebar-bg">
          <DashboardSidebar />
          <div className="relative flex flex-1 min-w-0 md:py-3.5 md:pr-3.5">
            <main
              ref={mainRef}
              onScroll={update}
              className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden bg-background md:rounded-[8px] px-4 pb-4 md:p-6 pt-3 min-w-0"
            >
              <Outlet />
            </main>
            <div
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent transition-opacity duration-200 md:bottom-3.5 md:right-3.5 md:rounded-b-[8px]",
                moreBelow ? "opacity-100" : "opacity-0"
              )}
            />
          </div>
        </div>
      </div>
    </SubNavProvider>
  );
};

export default DashboardLayout;
