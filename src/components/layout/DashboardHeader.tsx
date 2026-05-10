import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CircleUserRound, Settings, Gift, CreditCard, LogOut } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export function DashboardHeader() {
  const {
    user,
    logout
  } = useAuth();
  const handleLogout = () => {
    logout();
  };
  return <header className="h-16 bg-background flex items-center justify-between px-6 my-[5px]">
      <SearchBar />
      
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Menu utilisateur">
              <CircleUserRound size={16} strokeWidth={2} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-64">
            <DropdownMenuLabel className="flex flex-col">
              <span>Connecté en tant que</span>
              <span className="text-xs font-normal text-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard className="h-4 w-4" />
                Gérer mon abonnement
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Gift className="h-4 w-4" />
                Parrainage
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>;
}