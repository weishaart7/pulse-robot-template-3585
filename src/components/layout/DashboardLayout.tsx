import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { cn } from '@/lib/utils';

const DashboardLayout = () => {
  return (
    <div className={cn("dashboard-shell flex bg-background w-full h-screen overflow-hidden")}>
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex justify-end items-center px-4 py-2 bg-background">
          <ProfileMenu />
        </div>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-background min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;