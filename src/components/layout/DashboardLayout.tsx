import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  console.log('📊 DashboardLayout rendering');
  
  return (
    <div className={cn("flex bg-background w-full h-screen overflow-hidden")}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 rounded-tl-xl">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;