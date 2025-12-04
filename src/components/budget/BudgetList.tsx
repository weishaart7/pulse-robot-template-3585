import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Edit, MoreHorizontal, Building2 } from 'lucide-react';
import { Revenu, Charge } from '@/services/budgetService';
import { DisplayMode } from '@/pages/budget/BudgetSection';

interface BudgetListProps {
  revenus: Revenu[];
  charges: Charge[];
  onEditRevenu: (revenu: Revenu) => void;
  onDeleteRevenu: (id: string) => void;
  onEditCharge: (charge: Charge) => void;
  onDeleteCharge: (id: string) => void;
  loading?: boolean;
  displayMode?: DisplayMode;
}

export const BudgetList = ({
  revenus,
  charges,
  onEditRevenu,
  onDeleteRevenu,
  onEditCharge,
  onDeleteCharge,
  loading,
  displayMode = 'annuel'
}: BudgetListProps) => {
  if (loading) {
    return <div>Chargement...</div>;
  }

  const periodLabel = displayMode === 'mensuel' ? '/mois' : '/an';

  // Convertir un montant en annuel selon sa périodicité
  const toAnnual = (amount: number | undefined, periodicite: string | undefined): number => {
    if (!amount) return 0;
    const p = (periodicite || 'mensuel').toLowerCase();
    switch (p) {
      case 'mensuel':
      case 'mensuelle':
        return amount * 12;
      case 'trimestriel':
      case 'trimestrielle':
        return amount * 4;
      case 'semestriel':
      case 'semestrielle':
        return amount * 2;
      case 'annuel':
      case 'annuelle':
      case 'ponctuel':
        return amount;
      default:
        return amount * 12; // Par défaut mensuel
    }
  };

  // Convertir un montant annuel en mensuel
  const toMonthly = (annualAmount: number): number => {
    return annualAmount / 12;
  };

  // Obtenir le montant à afficher selon le displayMode
  const getDisplayAmount = (amount: number | undefined, periodicite: string | undefined): number | undefined => {
    if (!amount) return undefined;
    const annual = toAnnual(amount, periodicite);
    return displayMode === 'mensuel' ? toMonthly(annual) : annual;
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '-';
    return amount.toLocaleString('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    });
  };

  // Calculer les totaux en annuel pour une comparaison cohérente
  const totalRevenusAnnuel = revenus.reduce((sum, revenu) => sum + toAnnual(revenu.montant, revenu.periodicite), 0);
  const totalChargesAnnuel = charges.reduce((sum, charge) => sum + toAnnual(charge.montant, charge.periodicite), 0);

  const isFromImmobilier = (item: Revenu | Charge) => item.source === 'immobilier';

  return (
    <div className="space-y-6">
      {/* Liste des revenus */}
      {revenus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Revenus
              <Badge variant="outline" className="font-normal">
                {periodLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dénomination</TableHead>
                  <TableHead>Bénéficiaire</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenus.map(revenu => (
                  <TableRow key={revenu.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {revenu.libelle}
                        {isFromImmobilier(revenu) && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />
                            Immobilier
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{revenu.beneficiaire || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getDisplayAmount(revenu.montant, revenu.periodicite))}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalRevenusAnnuel > 0 && revenu.montant 
                        ? ((toAnnual(revenu.montant, revenu.periodicite) / totalRevenusAnnuel) * 100).toFixed(1) + '%'
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {isFromImmobilier(revenu) ? (
                        <span className="text-xs text-muted-foreground">
                          Modifier depuis Immobilier
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full shadow-none"
                              aria-label="Open edit menu"
                            >
                              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onEditRevenu(revenu)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteRevenu(revenu.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(displayMode === 'mensuel' ? toMonthly(totalRevenusAnnuel) : totalRevenusAnnuel)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Liste des charges */}
      {charges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Charges
              <Badge variant="outline" className="font-normal">
                {periodLabel}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dénomination</TableHead>
                  <TableHead>Débiteur</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map(charge => (
                  <TableRow key={charge.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {charge.libelle}
                        {isFromImmobilier(charge) && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Building2 className="h-3 w-3" />
                            Immobilier
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{charge.debiteur || '-'}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(getDisplayAmount(charge.montant, charge.periodicite))}
                    </TableCell>
                    <TableCell className="text-right">
                      {totalChargesAnnuel > 0 && charge.montant 
                        ? ((toAnnual(charge.montant, charge.periodicite) / totalChargesAnnuel) * 100).toFixed(1) + '%'
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      {isFromImmobilier(charge) ? (
                        <span className="text-xs text-muted-foreground">
                          Modifier depuis Immobilier
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-full shadow-none"
                              aria-label="Open edit menu"
                            >
                              <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => onEditCharge(charge)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onDeleteCharge(charge.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(displayMode === 'mensuel' ? toMonthly(totalChargesAnnuel) : totalChargesAnnuel)}
                  </TableCell>
                  <TableCell className="text-right">100%</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {revenus.length === 0 && charges.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Aucun revenu ou charge enregistré pour le moment.
        </div>
      )}
    </div>
  );
};
