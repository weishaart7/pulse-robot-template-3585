import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkle } from 'lucide-react';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/components/ui/pill-tabs';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { menuItems, getCurrentNavValue } from '@/components/layout/navigation-items';

export function DashboardTopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = getCurrentNavValue(location.pathname);

  const handleNavigate = (value: string) => {
    const item = menuItems.find((entry) => entry.value === value);
    if (item) navigate(item.href);
  };

  return (
    <div className="relative flex items-center border-b border-border bg-white px-4 py-3 shrink-0">
      <div className="flex items-center shrink-0 z-10">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <Sparkle className="h-5 w-5 fill-black text-black" strokeWidth={1.5} />
        </div>
      </div>

      <div className="absolute inset-y-0 left-24 right-24 flex items-center justify-center overflow-x-auto">
        <PillTabs value={currentValue} onValueChange={handleNavigate} className="min-w-0">
          <PillTabsList shape="pill" size="md" className="items-stretch">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger key={item.value} value={item.value} className="h-full">
                  <Icon strokeWidth={1.75} />
                  {item.label}
                </PillTabsTrigger>
              );
            })}
          </PillTabsList>
        </PillTabs>
      </div>

      <div className="ml-auto flex items-center shrink-0 z-10">
        <ProfileMenu />
      </div>
    </div>
  );
}
