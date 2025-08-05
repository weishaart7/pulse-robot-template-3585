import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      {/* Liste des revenus */}
      {revenus.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenus ({revenus.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenus.map((revenu) => (
                <div
                  key={revenu.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{revenu.libelle}</h4>
                        {revenu.revenu_disponible && (
                          <Badge variant="secondary">Disponible</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {revenu.nature}
                      </p>
                      {revenu.beneficiaire && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Bénéficiaire: {revenu.beneficiaire}
                        </p>
                      )}
                      {revenu.commentaire && (
                        <p className="text-sm text-muted-foreground">
                          {revenu.commentaire}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditRevenu(revenu)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteRevenu(revenu.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des charges */}
      {charges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Charges ({charges.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charges.map((charge) => (
                <div
                  key={charge.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{charge.libelle}</h4>
                        {charge.montant && (
                          <Badge variant="outline">
                            {charge.montant.toLocaleString('fr-FR', {
                              style: 'currency',
                              currency: 'EUR'
                            })}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {charge.nature}
                      </p>
                      {charge.debiteur && (
                        <p className="text-sm text-muted-foreground mb-1">
                          Débiteur: {charge.debiteur}
                        </p>
                      )}
                      {charge.commentaire && (
                        <p className="text-sm text-muted-foreground">
                          {charge.commentaire}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEditCharge(charge)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteCharge(charge.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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