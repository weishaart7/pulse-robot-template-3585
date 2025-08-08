import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  return (
    <div className={cn(
      "flex flex-col md:flex-row bg-background w-full flex-1 mx-auto border-neutral-200 dark:border-neutral-700 overflow-hidden",
      "h-screen"
    )}>
      <AppSidebar />
      <div className="flex flex-1 flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-auto p-2 md:p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;