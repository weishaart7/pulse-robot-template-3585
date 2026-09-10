import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkle } from 'lucide-react';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/components/ui/pill-tabs';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { menuItems, getCurrentNavValue } from '@/components/layout/navigation-items';

const NAVBAR_BG = '#054b16';

export function DashboardTopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = getCurrentNavValue(location.pathname);

  const handleNavigate = (value: string) => {
    const item = menuItems.find((entry) => entry.value === value);
    if (item) navigate(item.href);
  };

  return (
    <div
      className="relative flex items-center px-4 py-3 shrink-0"
      style={{ backgroundColor: NAVBAR_BG }}
    >
      <div className="flex items-center shrink-0 z-10">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <Sparkle className="h-5 w-5 fill-white text-white" strokeWidth={1.5} />
        </div>
      </div>

      <div className="absolute inset-y-0 left-24 right-24 flex items-center justify-center overflow-x-auto">
        <PillTabs value={currentValue} onValueChange={handleNavigate} className="min-w-0">
          <PillTabsList shape="pill" size="md" className="items-stretch bg-white/10">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger
                  key={item.value}
                  value={item.value}
                  className="h-full text-white/70 hover:text-white [&_svg]:text-white/70 [&:hover_svg]:text-white data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-none [&[data-state=active]_svg]:text-white"
                >
                  <Icon strokeWidth={1.75} />
                  {item.label}
                </PillTabsTrigger>
              );
            })}
          </PillTabsList>
        </PillTabs>
      </div>

      <div className="ml-auto flex items-center shrink-0 z-10">
        <ProfileMenu triggerClassName="text-white hover:bg-white/10" />
      </div>
    </div>
  );
}
