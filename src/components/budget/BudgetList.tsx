import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FullTable } from '@/components/ui/full-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Edit, MoreHorizontal } from 'lucide-react';
import { Revenu, Charge } from '@/services/budgetService';
interface BudgetListProps {
  revenus: Revenu[];
  charges: Charge[];
  onEditRevenu: (revenu: Revenu) => void;
  onDeleteRevenu: (id: string) => void;
  onEditCharge: (charge: Charge) => void;
  onDeleteCharge: (id: string) => void;
  loading?: boolean;
}
export const BudgetList = ({
  revenus,
  charges,
  onEditRevenu,
  onDeleteRevenu,
  onEditCharge,
  onDeleteCharge,
  loading
}: BudgetListProps) => {
  if (loading) {
    return <div>Chargement...</div>;
  }
  return <div className="space-y-6">
      {/* Liste des revenus */}
      {revenus.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Revenus ({revenus.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <FullTable>
              <FullTable.Colgroup>
                <FullTable.Col className="w-[40%]" />
                <FullTable.Col className="w-[30%]" />
                <FullTable.Col className="w-[20%]" />
                <FullTable.Col className="w-[10%]" />
              </FullTable.Colgroup>
              <FullTable.Header>
                <FullTable.Row>
                  <FullTable.Head>Dénomination</FullTable.Head>
                  <FullTable.Head>Bénéficiaire</FullTable.Head>
                  <FullTable.Head>Montant</FullTable.Head>
                  <FullTable.Head>Actions</FullTable.Head>
                </FullTable.Row>
              </FullTable.Header>
              <FullTable.Body interactive striped>
                {revenus.map(revenu => (
                  <FullTable.Row key={revenu.id}>
                    <FullTable.Cell>
                      <div className="font-medium">{revenu.libelle}</div>
                    </FullTable.Cell>
                    <FullTable.Cell>{revenu.beneficiaire || '-'}</FullTable.Cell>
                    <FullTable.Cell>
                      {revenu.montant ? 
                        revenu.montant.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        }) : '-'
                      }
                    </FullTable.Cell>
                    <FullTable.Cell>
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
                    </FullTable.Cell>
                  </FullTable.Row>
                ))}
              </FullTable.Body>
              <FullTable.Footer>
                <FullTable.Row>
                  <FullTable.Cell className="font-medium text-black dark:text-white" colSpan={2}>
                    Total
                  </FullTable.Cell>
                  <FullTable.Cell className="font-medium text-black dark:text-white">
                    {revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    })}
                  </FullTable.Cell>
                  <FullTable.Cell> </FullTable.Cell>
                </FullTable.Row>
              </FullTable.Footer>
            </FullTable>
          </CardContent>
        </Card>}

      {/* Liste des charges */}
      {charges.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Charges ({charges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <FullTable>
              <FullTable.Colgroup>
                <FullTable.Col className="w-[40%]" />
                <FullTable.Col className="w-[30%]" />
                <FullTable.Col className="w-[20%]" />
                <FullTable.Col className="w-[10%]" />
              </FullTable.Colgroup>
              <FullTable.Header>
                <FullTable.Row>
                  <FullTable.Head>Dénomination</FullTable.Head>
                  <FullTable.Head>Débiteur</FullTable.Head>
                  <FullTable.Head>Montant</FullTable.Head>
                  <FullTable.Head>Actions</FullTable.Head>
                </FullTable.Row>
              </FullTable.Header>
              <FullTable.Body interactive striped>
                {charges.map(charge => (
                  <FullTable.Row key={charge.id}>
                    <FullTable.Cell>
                      <div className="font-medium">{charge.libelle}</div>
                    </FullTable.Cell>
                    <FullTable.Cell>{charge.debiteur || '-'}</FullTable.Cell>
                    <FullTable.Cell>
                      {charge.montant ? 
                        charge.montant.toLocaleString('fr-FR', {
                          style: 'currency',
                          currency: 'EUR'
                        }) : '-'
                      }
                    </FullTable.Cell>
                    <FullTable.Cell>
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
                    </FullTable.Cell>
                  </FullTable.Row>
                ))}
              </FullTable.Body>
              <FullTable.Footer>
                <FullTable.Row>
                  <FullTable.Cell className="font-medium text-black dark:text-white" colSpan={2}>
                    Total
                  </FullTable.Cell>
                  <FullTable.Cell className="font-medium text-black dark:text-white">
                    {charges.reduce((sum, charge) => sum + (charge.montant || 0), 0).toLocaleString('fr-FR', {
                      style: 'currency',
                      currency: 'EUR'
                    })}
                  </FullTable.Cell>
                  <FullTable.Cell> </FullTable.Cell>
                </FullTable.Row>
              </FullTable.Footer>
            </FullTable>
          </CardContent>
        </Card>}

      {revenus.length === 0 && charges.length === 0 && <div className="text-center text-muted-foreground py-8">
          Aucun revenu ou charge enregistré pour le moment.
        </div>}
    </div>;
};