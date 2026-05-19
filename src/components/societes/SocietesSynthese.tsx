import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocietes } from '@/hooks/useSocietes';
import { useSocietesIFI, useSocietesTransmission, getSocieteCategory } from '@/hooks/useSocietesIntegration';
import { Building2, TrendingUp, Scale, ShieldCheck, AlertTriangle, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--ring))', 'hsl(var(--muted-foreground))', 'hsl(var(--accent-foreground))', '#94a3b8', '#cbd5e1'];

export const SocietesSynthese = () => {
  const { societes, isLoading } = useSocietes();
  const ifiData = useSocietesIFI(societes);
  const transmissionData = useSocietesTransmission(societes);

  if (isLoading) return <div className="text-center py-12"><p className="text-muted-foreground">Chargement...</p></div>;

  const totalSocietes = societes.length;
  const valeurTotale = societes.reduce((s, c) => s + (c.valeur_estimee || 0), 0);
  const capitalTotal = societes.reduce((s, c) => s + (c.capital_social || 0), 0);
  const tresoTotale = societes.reduce((s, c) => s + ((c as any).tresorerie_disponible || 0), 0);
  const ccaTotal = societes.reduce((s, c) => s + ((c as any).compte_courant_associes || 0), 0);
  const caTotal = societes.reduce((s, c) => s + ((c as any).chiffre_affaires || 0), 0);
  const resultatTotal = societes.reduce((s, c) => s + ((c as any).resultat_net || 0), 0);

  const rentabilite = caTotal > 0 ? (resultatTotal / caTotal * 100) : 0;
  const holdings = societes.filter(s => s.holding && s.holding !== 'Non');

  // Donut data
  const parType: Record<string, number> = {};
  const parRegime: Record<string, number> = {};
  societes.forEach(s => {
    const t = s.type_societe || 'Non défini';
    parType[t] = (parType[t] || 0) + (s.valeur_estimee || 0);
    const r = s.regime_fiscal || 'Non défini';
    parRegime[r] = (parRegime[r] || 0) + (s.valeur_estimee || 0);
  });
  const dataType = Object.entries(parType).map(([name, value]) => ({ name, value }));
  const dataRegime = Object.entries(parRegime).map(([name, value]) => ({ name, value }));

  // Alertes
  const alertes: { type: string; message: string; societe: string }[] = [];
  const moisFr = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const now = new Date();
  societes.forEach(s => {
    if (s.jour_cloture && s.mois_cloture) {
      const moisIdx = moisFr.indexOf(s.mois_cloture);
      if (moisIdx >= 0) {
        const cloture = new Date(now.getFullYear(), moisIdx, parseInt(s.jour_cloture));
        if (cloture < now) cloture.setFullYear(now.getFullYear() + 1);
        const days = Math.ceil((cloture.getTime() - now.getTime()) / (1000*60*60*24));
        if (days < 60) alertes.push({ type: 'cloture', message: `Clôture dans ${days} jours`, societe: s.denomination });
      }
    }
    if (((s as any).compte_courant_associes || 0) > 50000) alertes.push({ type: 'cca', message: `CCA important : ${((s as any).compte_courant_associes).toLocaleString('fr-FR')} €`, societe: s.denomination });
    const dateB = (s as any).date_dernier_bilan;
    if (!dateB) alertes.push({ type: 'bilan', message: 'Aucun bilan renseigné', societe: s.denomination });
    else {
      const months = (now.getTime() - new Date(dateB).getTime()) / (1000*60*60*24*30);
      if (months > 18) alertes.push({ type: 'bilan', message: `Bilan ancien (${Math.round(months)} mois)`, societe: s.denomination });
    }
  });

  if (totalSocietes === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Aucune société enregistrée</h3>
        <p className="text-muted-foreground">Commencez par ajouter vos sociétés dans l'onglet "Mes sociétés".</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sociétés</CardTitle><Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSocietes}</div>
            <p className="text-xs text-muted-foreground">dont {holdings.length} holding{holdings.length > 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur globale</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{valeurTotale.toLocaleString('fr-FR')} €</div>
            <p className="text-xs text-muted-foreground">Capital : {capitalTotal.toLocaleString('fr-FR')} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rentabilité</CardTitle><Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rentabilite.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">CA cumulé : {caTotal.toLocaleString('fr-FR')} €</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trésorerie cumulée</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tresoTotale.toLocaleString('fr-FR')} €</div>
            <p className="text-xs text-muted-foreground">CCA total : {ccaTotal.toLocaleString('fr-FR')} €</p>
          </CardContent>
        </Card>
      </div>

      {/* Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Répartition par type de société</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {dataType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} €`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Répartition par régime fiscal</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={dataRegime} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {dataRegime.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${v.toLocaleString('fr-FR')} €`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertes */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Alertes ({alertes.length})</CardTitle></CardHeader>
        <CardContent>
          {alertes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte. ✓</p>
          ) : (
            <div className="space-y-2">
              {alertes.map((a, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-[5px] bg-muted/40 text-sm">
                  <Badge variant="outline">{a.societe}</Badge>
                  <span>{a.message}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* IFI / Transmission */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impact IFI</CardTitle><Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{ifiData.totalValeurIFI.toLocaleString('fr-FR')} €</div>
            {ifiData.nombreSocietesExonerees > 0 && <p className="text-xs text-muted-foreground">{ifiData.nombreSocietesExonerees} exonérée(s)</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valeur successorale</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transmissionData.totalValeurSuccessorale.toLocaleString('fr-FR')} €</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
