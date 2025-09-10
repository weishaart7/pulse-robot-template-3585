import React from 'react';
import { Outlet } from 'react-router-dom';
import { InvestmentNavbar } from '@/components/investment/InvestmentNavbar';
import { cn } from '@/lib/utils';

const InvestmentPlatform = () => {
  return (
    <div className={cn("flex flex-col bg-background w-full flex-1 mx-auto border-neutral-200 dark:border-neutral-700 overflow-hidden", "h-screen")}>
      <InvestmentNavbar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-muted">
        <Outlet />
      </main>
    </div>
  );
};

export default InvestmentPlatform;