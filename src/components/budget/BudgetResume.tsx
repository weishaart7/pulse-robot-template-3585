import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRevenus, useCharges } from '@/hooks/useBudget';

export const BudgetResume = () => {
  const { revenus, loading: revenusLoading } = useRevenus();
  const { charges, loading: chargesLoading } = useCharges();

  const totalRevenus = Math.round(revenus.reduce((sum, revenu) => sum + (revenu.montant || 0), 0));
  const totalCharges = Math.round(charges.reduce((sum, charge) => sum + (charge.montant || 0), 0));

  if (revenusLoading || chargesLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Résumé du Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Chargement des données...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculer les mensualités de crédits (charges liées aux crédits)
  const mensualitesCredits = Math.round(charges
    .filter(charge => charge.nature?.toLowerCase().includes('crédit') || charge.nature?.toLowerCase().includes('emprunt'))
    .reduce((sum, charge) => sum + (charge.montant || 0), 0));

  // Calculer les indicateurs
  const soldeMensuel = Math.round(totalRevenus - totalCharges);
  const tauxEndettement = totalRevenus > 0 ? (mensualitesCredits / totalRevenus) * 100 : 0;
  const capaciteEndettement = Math.round((totalRevenus * 0.35) - mensualitesCredits);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Solde mensuel
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${soldeMensuel >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {soldeMensuel >= 0 ? '+' : ''}{soldeMensuel.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Revenus - Dépenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Taux d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${tauxEndettement <= 33 ? 'text-primary' : tauxEndettement <= 40 ? 'text-warning' : 'text-destructive'}`}>
              {tauxEndettement.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {mensualitesCredits.toLocaleString('fr-FR')} € / {totalRevenus.toLocaleString('fr-FR')} €
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Capacité d'endettement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${capaciteEndettement >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {capaciteEndettement.toLocaleString('fr-FR')} €
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum à 35% des revenus
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};