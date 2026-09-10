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
        <div className="flex flex-1 min-h-0 bg-white">
          <DashboardSidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-white min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SubNavProvider>
  );
};

export default DashboardLayout;
