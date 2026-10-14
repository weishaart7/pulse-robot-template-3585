import React from 'react';
import { CircleUserRound, Settings, Gift, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function ProfileMenu({
  side,
  align = 'end',
  triggerClassName,
  label,
}: {
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  triggerClassName?: string;
  /** Contenu du déclencheur à la place de l'icône (carte profil de la barre latérale). */
  label?: React.ReactNode;
} = {}) {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn("p-2 rounded-full hover:bg-accent transition-colors text-foreground", triggerClassName)}
          aria-label="Menu utilisateur"
        >
          {label ?? <CircleUserRound className="h-5 w-5 shrink-0" strokeWidth={1.5} />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-64" side={side} align={align} sideOffset={side === 'right' ? 12 : 4}>
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
        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
