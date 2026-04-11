import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CircleUserRound, Settings, Gift, CreditCard, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 bg-background flex items-center justify-between px-6 border-b border-border/40">
      <SearchBar />
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/investment')}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted/50"
        >
          Imeris Invest
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Menu utilisateur">
              <CircleUserRound size={16} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-w-64">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-xs font-normal text-muted-foreground">Connecté en tant que</span>
              <span className="text-sm">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <CreditCard className="h-4 w-4" strokeWidth={1.5} />
                Abonnement
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Gift className="h-4 w-4" strokeWidth={1.5} />
                Parrainage
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4" strokeWidth={1.5} />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logout()}>
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
