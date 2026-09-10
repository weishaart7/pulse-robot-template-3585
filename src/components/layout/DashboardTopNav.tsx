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
    <div className="flex items-center justify-between gap-4 border-b border-border bg-white px-4 py-2.5 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center cursor-pointer shrink-0" onClick={() => navigate('/')}>
          <Sparkle className="h-5 w-5 fill-black text-black" strokeWidth={1.5} />
        </div>

        <PillTabs value={currentValue} onValueChange={handleNavigate}>
          <PillTabsList shape="pill" size="sm" className="overflow-x-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger key={item.value} value={item.value} className="gap-1.5">
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {item.label}
                </PillTabsTrigger>
              );
            })}
          </PillTabsList>
        </PillTabs>
      </div>

      <div className="shrink-0">
        <ProfileMenu />
      </div>
    </div>
  );
}
