import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNavBar } from '@/components/layout/TopNavBar';

const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavBar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;