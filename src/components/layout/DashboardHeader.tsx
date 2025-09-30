import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CircleUserRound, Settings, Gift, CreditCard, LogOut, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlowEffect } from '@/components/ui/glow-effect';
import { SearchBar } from './SearchBar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
export function DashboardHeader() {
  const {
    user,
    logout
  } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
  };
  return <header className="h-16 flex items-center justify-between px-6 shadow-md" style={{ backgroundColor: '#640311' }}>
      <SearchBar />
      
      <div className="flex items-center gap-3">
        <div className="relative">
          <GlowEffect colors={['#FF002F', '#FF4060', '#FF0040', '#FF1A40']} mode="colorShift" blur="soft" duration={3} scale={0.9} />
          <button onClick={() => navigate('/investment')} className="relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium outline outline-1 outline-[#FF002F]/30 hover:bg-[#FF002F]/10 hover:outline-[#FF002F]/50 transition-all duration-200 shadow-sm" style={{ backgroundColor: 'rgba(100, 3, 17, 0.5)', color: '#FF002F' }}>
            <TrendingUp className="h-4 w-4" />
            <span>Accéder à Imeris Invest</span>
          </button>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" aria-label="Menu utilisateur" className="border-[#FF002F]/30 hover:bg-[#FF002F]/10 hover:border-[#FF002F]/50 transition-all duration-200 shadow-sm" style={{ backgroundColor: 'rgba(100, 3, 17, 0.3)', color: '#FF002F' }}>
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