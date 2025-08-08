import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-muted/30 w-full flex-1 mx-auto overflow-hidden",
      "h-screen"
    )}>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;