import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, Sparkle } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/layout/DashboardSidebar';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/components/ui/pill-tabs';
import { ProfileMenu } from '@/components/layout/ProfileMenu';
import { menuItems, getCurrentNavValue } from '@/components/layout/navigation-items';

export function DashboardTopNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentValue = getCurrentNavValue(location.pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Sur écran étroit, la barre d'onglets défile : on ramène l'onglet actif en vue.
  useEffect(() => {
    const active = tabsRef.current?.querySelector<HTMLElement>('[data-state="active"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }, [currentValue]);

  const handleNavigate = (value: string) => {
    const item = menuItems.find((entry) => entry.value === value);
    if (item) navigate(item.href);
  };

  return (
    <div className="relative flex items-center bg-background px-4 py-5 shrink-0">
      <div className="flex items-center gap-3 shrink-0 z-10">
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="md:hidden p-1 -ml-1 rounded-full text-foreground hover:bg-secondary transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" strokeWidth={1.5} />
        </button>
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
          <Sparkle className="h-6 w-6 fill-foreground text-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <div ref={tabsRef} className="absolute inset-y-0 left-24 right-14 md:right-24 flex items-center justify-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <PillTabs value={currentValue} onValueChange={handleNavigate} className="min-w-0">
          <PillTabsList shape="pill" size="md" className="items-stretch bg-secondary shadow-[inset_0_0_0_1px_hsl(var(--border))]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <PillTabsTrigger
                  key={item.value}
                  value={item.value}
                  className="relative h-full overflow-hidden text-graphite [&_svg]:text-graphite hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-background [&[data-state=active]_svg]:text-background"
                >
                  {item.value === currentValue && (
                    <motion.span
                      layoutId="activeModulePill"
                      className="absolute inset-0 rounded-full bg-foreground shadow-whisper"
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                  <Icon strokeWidth={1.75} className="relative z-10" />
                  <span className="relative z-10 text-[13px] font-medium tracking-[0.01em]">
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

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-secondary flex flex-col">
          <SheetTitle className="px-4 pt-5 pb-2 text-sm font-medium">Menu</SheetTitle>
          <SidebarNav onItemClick={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
