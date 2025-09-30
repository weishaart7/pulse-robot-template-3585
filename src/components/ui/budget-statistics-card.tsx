'use client';

import { Button } from '@/components/ui/button-1';
import { Card, CardContent, CardHeader, CardTitle, CardToolbar } from '@/components/ui/card-1';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu-1';
import { MoreVertical, DollarSign, Settings, Share2, TrendingUp, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BudgetStatisticsCardProps {
  totalRevenus: number;
  totalCharges: number;
  revenusCount: number;
  chargesCount: number;
}

export default function BudgetStatisticsCard({ 
  totalRevenus, 
  totalCharges, 
  revenusCount,
  chargesCount 
}: BudgetStatisticsCardProps) {
  const difference = totalRevenus - totalCharges;
  const total = Math.max(totalRevenus, totalCharges, 1); // Avoid division by zero
  const percentage = Math.round((Math.min(totalRevenus, totalCharges) / total) * 100);
  const progressBars = 30;
  const filledBars = Math.round((Math.abs(difference) / Math.max(total, 1)) * progressBars);

  return (
    <Card className="w-full">
      <CardHeader className="border-0 min-h-auto py-5">
        <CardTitle className="flex items-center gap-2.5">
          <DollarSign className="w-5 h-5" style={{ color: '#1e3a4a' }} />
          <span className="text-sm font-semibold text-foreground">Revenu disponible</span>
        </CardTitle>
        <CardToolbar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="dim" size="sm" mode="icon" className="-me-1.5">
                <MoreVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom">
              <DropdownMenuItem>
                <Settings />
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TrendingUp /> 
                Exporter le rapport
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Share2 /> 
                Analyser les tendances
              </DropdownMenuItem>
              <DropdownMenuItem>
                <DollarSign /> 
                Voir l'historique
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardToolbar>
      </CardHeader>

      <CardContent className="space-y-2.5">
        {/* Progress Bar */}
        <div className="flex grow gap-1">
          {[...Array(progressBars)].map((_, i) => (
            <span
              key={i}
              className={cn(
                `inline-block w-3 h-4 rounded-sm border transition-colors`,
                i >= filledBars && 'bg-muted border-muted'
              )}
              style={i < filledBars ? (
                difference >= 0 
                  ? { backgroundColor: '#c2f94f', borderColor: '#c2f94f' }
                  : { backgroundColor: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive))' }
              ) : undefined}
            />
          ))}
        </div>

        {/* Budget Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>
            {difference >= 0 ? '+' : ''}{difference.toLocaleString('fr-FR')}€ disponible
          </span>
          <span className="font-semibold text-foreground">
            {percentage}% équilibre
          </span>
        </div>
      </CardContent>
    </Card>
  );
}