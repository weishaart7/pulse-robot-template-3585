import React from 'react';
import { Outlet } from 'react-router-dom';
import { DashboardSidebar } from '@/components/layout/DashboardSidebar';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

const DashboardLayout = () => {
  return (
    <div className="flex bg-background w-full h-screen overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
