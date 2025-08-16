import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { cn } from '@/lib/utils';
const DashboardLayout = () => {
  return <div className={cn("flex flex-col bg-background w-full flex-1 mx-auto border-neutral-200 dark:border-neutral-700 overflow-hidden", "h-screen")}>
      <Navbar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 md:p-6 bg-muted mx-0 px-[40px]">
        <Outlet />
      </main>
    </div>;
};
export default DashboardLayout;