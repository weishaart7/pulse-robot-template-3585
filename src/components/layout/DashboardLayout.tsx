import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[116px] p-2 md:p-6 bg-muted mx-0 px-[40px]">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;