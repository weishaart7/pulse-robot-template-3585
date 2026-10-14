import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardTopNav } from '@/components/layout/DashboardTopNav';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { SubNavProvider } from '@/contexts/SubNavContext';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  return (
    <SubNavProvider>
      <div className={cn("dashboard-shell flex flex-col bg-background w-full h-screen overflow-hidden")}>
        <DashboardTopNav />
        {/* Écran large : noir chaud continu avec la barre latérale ; le contenu est une
            plaque eggshell arrondie, entourée d'une bande noire. */}
        <div className="flex flex-1 min-h-0 md:bg-sidebar-bg">
          <DashboardSidebar />
          <div className="flex flex-1 min-w-0 md:py-3.5 md:pr-3.5">
            <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background md:rounded-[8px] px-4 pb-4 md:p-6 pt-3 min-w-0">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </SubNavProvider>
  );
};

export default DashboardLayout;
