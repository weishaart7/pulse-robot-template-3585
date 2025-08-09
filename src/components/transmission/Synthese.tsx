import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useAssets } from '@/hooks/useAssets';

// Import du service pour les charges au lieu du hook useBudget
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// Données mockées pour les héritiers (à connecter plus tard à la section Succession)
const heritiersData = [
  { nom: 'Héritier 1', pourcentage: 50 },
  { nom: 'Héritier 2', pourcentage: 30 },
  { nom: 'Héritier 3', pourcentage: 20 },
];

export const Synthese = () => {
  const { assets } = useAssets();
  const [charges, setCharges] = useState<any[]>([]);

  useEffect(() => {
    const fetchCharges = async () => {
      const { data } = await supabase.from('charges').select('*');
      setCharges(data || []);
    };
    fetchCharges();
  }, []);

  // Calculs basés sur les données réelles
  const totalActifs = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
  const totalPassifs = charges.reduce((sum, charge) => sum + (charge.montant || 0), 0);
  const assuranceVie = assets
    .filter(asset => asset.nature?.toLowerCase().includes('assurance'))
    .reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);

  // Formule: (Actif - Passifs - Assurance vie) + Assurance vie = Actif - Passifs
  const transmissionNette = totalActifs - totalPassifs;

  // Calcul des parts par héritier
  const heritiers = heritiersData.map(h => ({
    ...h,
    partNette: Math.round((transmissionNette * h.pourcentage) / 100),
  }));

  // Données pour le graphique
  const chartData = heritiers.map(h => ({
    name: h.nom,
    value: h.partNette,
    percentage: h.pourcentage,
  }));

  // Frais estimés (calculs simplifiés)
  const droitsSuccession = Math.round(transmissionNette * 0.15); // 15% estimé
  const prelevement990I = Math.round(transmissionNette * 0.02); // 2% estimé
  const fraisNotaire = Math.round(transmissionNette * 0.03); // 3% estimé

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Total transmission nette */}
      <Card>
        <CardHeader>
          <CardTitle>Total Transmission Nette</CardTitle>
          <CardDescription>
            Montant total transmissible après déduction des passifs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {formatCurrency(transmissionNette)}
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            Actifs: {formatCurrency(totalActifs)} - Passifs: {formatCurrency(totalPassifs)}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Répartition des héritiers */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Héritier</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Héritier</TableHead>
                  <TableHead>Part Nette</TableHead>
                  <TableHead>%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heritiers.map((heritier, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{heritier.nom}</TableCell>
                    <TableCell>{formatCurrency(heritier.partNette)}</TableCell>
                    <TableCell>{heritier.pourcentage}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Graphique circulaire */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition Visuelle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tableau des frais */}
      <Card>
        <CardHeader>
          <CardTitle>Estimation des Frais</CardTitle>
          <CardDescription>
            Frais estimés liés à la transmission (calculs indicatifs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type de Frais</TableHead>
                <TableHead>Montant Estimé</TableHead>
                <TableHead>Base de Calcul</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Droits de succession</TableCell>
                <TableCell>{formatCurrency(droitsSuccession)}</TableCell>
                <TableCell>15% du patrimoine net</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Prélèvement 990 I</TableCell>
                <TableCell>{formatCurrency(prelevement990I)}</TableCell>
                <TableCell>2% du patrimoine net</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Frais de notaire</TableCell>
                <TableCell>{formatCurrency(fraisNotaire)}</TableCell>
                <TableCell>3% du patrimoine net</TableCell>
              </TableRow>
              <TableRow className="font-bold border-t">
                <TableCell>Total des frais</TableCell>
                <TableCell>{formatCurrency(droitsSuccession + prelevement990I + fraisNotaire)}</TableCell>
                <TableCell>20% du patrimoine net</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};