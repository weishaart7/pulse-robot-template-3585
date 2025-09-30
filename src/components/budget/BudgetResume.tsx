import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useRevenus, useCharges } from '@/hooks/useBudget';
import { REVENUS_CATEGORIES, CHARGES_CATEGORIES } from '@/constants/budgetCategories';

export const BudgetResume = () => {
  const { revenus, loading: revenusLoading, fetchRevenus } = useRevenus();
  const { charges, loading: chargesLoading, fetchCharges } = useCharges();

  useEffect(() => {
    fetchRevenus();
    fetchCharges();
  }, []);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Grouper les revenus par catégories
  const revenusParCategorie = Object.entries(REVENUS_CATEGORIES).map(([categorie, natures]) => {
    const revenusCategorie = revenus.filter(r => (natures as readonly string[]).includes(r.nature));
    const total = revenusCategorie.reduce((sum, r) => sum + (Number(r.montant) || 0), 0);
    return {
      categorie,
      total,
      count: revenusCategorie.length
    };
  }).filter(cat => cat.count > 0);

  // Grouper les charges par catégories
  const chargesParCategorie = Object.entries(CHARGES_CATEGORIES).map(([categorie, natures]) => {
    const chargesCategorie = charges.filter(c => (natures as readonly string[]).includes(c.nature));
    const total = chargesCategorie.reduce((sum, c) => sum + (Number(c.montant) || 0), 0);
    return {
      categorie,
      total,
      count: chargesCategorie.length
    };
  }).filter(cat => cat.count > 0);

  const totalRevenusCat = revenusParCategorie.reduce((sum, cat) => sum + cat.total, 0);
  const totalChargesCat = chargesParCategorie.reduce((sum, cat) => sum + cat.total, 0);

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

      {/* Répartition par catégories */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Répartition des revenus par catégories */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des revenus par catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenusParCategorie.map((cat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cat.categorie}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                    <TableCell className="text-right">
                      {totalRevenusCat > 0 ? ((cat.total / totalRevenusCat) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {revenusParCategorie.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {revenusParCategorie.reduce((sum, cat) => sum + cat.count, 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenusCat)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                )}
                {revenusParCategorie.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun revenu pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Répartition des charges par catégories */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition des charges par catégories</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Nombre</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chargesParCategorie.map((cat, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{cat.categorie}</TableCell>
                    <TableCell className="text-right">{cat.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cat.total)}</TableCell>
                    <TableCell className="text-right">
                      {totalChargesCat > 0 ? ((cat.total / totalChargesCat) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))}
                {chargesParCategorie.length > 0 && (
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {chargesParCategorie.reduce((sum, cat) => sum + cat.count, 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(totalChargesCat)}</TableCell>
                    <TableCell className="text-right">100%</TableCell>
                  </TableRow>
                )}
                {chargesParCategorie.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucune charge pour le moment
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Saisonnalité */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Saisonnalité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Contenu à venir
          </div>
        </CardContent>
      </Card>
    </div>
  );
};