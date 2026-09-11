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
    <div className="relative bg-white h-[72px] px-4 shrink-0">
      <div className="absolute left-4 top-12 -translate-y-1/2 z-10 flex items-center cursor-pointer" onClick={() => navigate('/')}>
        <Sparkle className="h-7 w-7 fill-black text-black" strokeWidth={1.5} />
      </div>

      <div className="absolute left-24 right-24 top-12 -translate-y-1/2 flex items-center justify-center overflow-x-auto">
        <PillTabs value={currentValue} onValueChange={handleNavigate} className="min-w-0">
          <PillTabsList shape="pill" size="lg" className="items-stretch bg-gray-100">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-full data-[state=active]:bg-[#006064] data-[state=active]:text-white [&[data-state=active]_svg]:text-white"
                >
                  <Icon strokeWidth={1.75} />
                  {item.label}
                </PillTabsTrigger>
              );
            })}
          </PillTabsList>
        </PillTabs>
      </div>

      <div className="absolute right-4 top-12 -translate-y-1/2 z-10 flex items-center">
        <ProfileMenu />
      </div>
    </div>
  );
}
