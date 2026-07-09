import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Emprunt, Passif } from '@/services/passifService';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TrendingDown, Percent, Calendar, DollarSign } from 'lucide-react';

interface PassifDetailsDialogProps {
  passif: Emprunt | Passif | null;
  type: 'emprunt' | 'passif';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PassifDetailsDialog = ({ passif, type, open, onOpenChange }: PassifDetailsDialogProps) => {
  if (!passif) return null;

  const formatCurrency = (value: number | undefined | null) => {
    if (!value) return 'Non renseigné';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isEmprunt = (p: Emprunt | Passif): p is Emprunt => {
    return 'libelle' in p && 'capital_restant_du' in p;
  };

  const emprunt = isEmprunt(passif) ? passif : null;
  const simplePassif = !isEmprunt(passif) ? passif : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {emprunt ? emprunt.libelle : simplePassif?.nature}
          </DialogTitle>
          <Badge variant="outline" className="w-fit mt-2 bg-red-50 text-red-700 border-red-200">
            {type === 'emprunt' ? 'Emprunt' : 'Passif'}
          </Badge>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Pour les emprunts */}
          {emprunt && (
            <>
              {/* Montant principal */}
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Capital restant dû</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(emprunt.capital_restant_du)}
                </div>
              </div>

              <Separator />

              {/* Détails financiers */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Détails financiers
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <span className="text-sm text-muted-foreground">Nature</span>
                    <p className="font-medium">{emprunt.nature}</p>
                  </div>
                  {emprunt.mensualite && (
                    <div className="p-3 rounded-lg bg-muted">
                      <span className="text-sm text-muted-foreground">Mensualité</span>
                      <p className="font-medium">{formatCurrency(emprunt.mensualite)}</p>
                    </div>
                  )}
                  {emprunt.taux_interet && (
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Taux d'intérêt</span>
                      </div>
                      <p className="font-medium">{emprunt.taux_interet}%</p>
                    </div>
                  )}
                  {emprunt.duree_restante && (
                    <div className="p-3 rounded-lg bg-muted">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Durée restante</span>
                      </div>
                      <p className="font-medium">{emprunt.duree_restante} mois</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Calculs */}
              {emprunt.mensualite && emprunt.duree_restante && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Projections</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-muted">
                        <span className="text-sm text-muted-foreground">Total restant à rembourser</span>
                        <p className="font-medium text-lg">
                          {formatCurrency(emprunt.mensualite * emprunt.duree_restante)}
                        </p>
                      </div>
                      {(() => {
                        const coutInterets = emprunt.capital_restant_du
                          ? (emprunt.mensualite * emprunt.duree_restante) - emprunt.capital_restant_du
                          : null;
                        const isCalculable = coutInterets !== null && coutInterets >= 0;
                        return (
                          <div className="p-3 rounded-lg bg-muted">
                            <span className="text-sm text-muted-foreground">Coût total des intérêts</span>
                            <p className="font-medium text-lg text-red-600">
                              {isCalculable ? formatCurrency(coutInterets) : 'Non calculable'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Pour les passifs simples */}
          {simplePassif && (
            <>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-muted-foreground">Montant dû</span>
                </div>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(simplePassif.montant_du)}
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-lg font-semibold mb-3">Informations</h3>
                <div className="p-3 rounded-lg bg-muted">
                  <span className="text-sm text-muted-foreground">Nature du passif</span>
                  <p className="font-medium">{simplePassif.nature}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
