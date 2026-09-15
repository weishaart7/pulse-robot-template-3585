import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
    <div className="relative flex items-center bg-white px-4 py-5 shrink-0">
      <div className="flex items-center shrink-0 z-10">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <Sparkle className="h-6 w-6 fill-[#000105] text-[#000105]" strokeWidth={1.5} />
        </div>
      </div>

      <div className="absolute inset-y-0 left-24 right-24 flex items-center justify-center overflow-x-auto">
        <PillTabs value={currentValue} onValueChange={handleNavigate} className="min-w-0">
          <PillTabsList shape="pill" size="md" className="items-stretch bg-gray-100">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger
                  key={item.value}
                  value={item.value}
                  className="relative h-full overflow-hidden text-[#000105] [&_svg]:text-[#000105] data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-white [&[data-state=active]_svg]:text-white"
                >
                  {item.value === currentValue && (
                    <motion.span
                      layoutId="activeModulePill"
                      className="absolute inset-0 rounded-full bg-[#006064]"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon strokeWidth={1.75} className="relative z-10" />
                  <span
                    className="relative z-10 uppercase font-semibold"
                    style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '13.05px' }}
                  >
                    {item.label}
                  </span>
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
