import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PatrimoineChart } from './PatrimoineChart';
import { useAssets } from '@/hooks/useAssets';
import { usePassifs, useEmprunts } from '@/hooks/usePassifs';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { TrendingUp, TrendingDown, Wallet, User, Users } from 'lucide-react';
export const PatrimoineResume = () => {
  const {
    assets
  } = useAssets();
  const {
    passifs
  } = usePassifs();
  const {
    emprunts
  } = useEmprunts();
  const {
    data: familyProfile
  } = useFamilyProfile();
  const {
    data: maritalStatus
  } = useMaritalStatus();
  const isInCouple = useMemo(() => {
    return maritalStatus?.statut_couple && ['marie', 'pacs', 'concubinage'].includes(maritalStatus.statut_couple.toLowerCase());
  }, [maritalStatus]);
  const financialSummary = useMemo(() => {
    const totalActifs = assets.reduce((sum, asset) => sum + (asset.valeur_estimee || 0), 0);
    const totalPassifs = passifs.reduce((sum, passif) => sum + (passif.montant_du || 0), 0) + emprunts.reduce((sum, emprunt) => sum + (emprunt.capital_restant_du || 0), 0);
    const patrimoineNet = totalActifs - totalPassifs;
    return {
      totalActifs,
      totalPassifs,
      patrimoineNet
    };
  }, [assets, passifs, emprunts]);
  const patrimoineParPersonne = useMemo(() => {
    const userFirstName = familyProfile?.prenom || 'Vous';
    const spouseFirstName = maritalStatus?.prenom_conjoint || 'Conjoint';
    let userValue = 0;
    let spouseValue = 0;
    assets.forEach(asset => {
      const estimatedValue = asset.valeur_estimee || 0;
      if (!isInCouple) {
        // Pas de conjoint → 100% utilisateur
        userValue += estimatedValue;
      } else {
        // Conjoint existe
        if (asset.detenteur === 'user' || asset.detenteur === 'utilisateur' || !asset.detenteur) {
          // Biens propres de l'utilisateur → 100% utilisateur
          userValue += estimatedValue;
        } else if (asset.detenteur === 'spouse' || asset.detenteur === 'conjoint') {
          // Biens propres du conjoint → 100% conjoint
          spouseValue += estimatedValue;
        } else if (asset.detenteur === 'common' || asset.detenteur === 'commun' || asset.detenteur === 'couple') {
          // Biens communs → répartir selon les quote-parts
          const userQuote = (asset.pourcentage_utilisateur ?? 50) / 100;
          const spouseQuote = (asset.pourcentage_conjoint ?? 50) / 100;
          userValue += estimatedValue * userQuote;
          spouseValue += estimatedValue * spouseQuote;
        }
      }
    });
    const totalValue = userValue + spouseValue;
    return {
      userFirstName,
      spouseFirstName,
      userValue,
      spouseValue,
      totalValue,
      showSpouse: isInCouple
    };
  }, [assets, familyProfile, maritalStatus, isInCouple]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };
  return <div className="space-y-6">
      {/* Carte Répartition avec graphique et synthèse */}
      <Card>
        <CardHeader>
          <CardTitle>Répartition du patrimoine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Graphique à gauche */}
            <div>
              <PatrimoineChart assets={assets} passifs={passifs} emprunts={emprunts} selectedCategory={null} />
            </div>

            {/* Synthèse à droite */}
            <div className="flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-4 p-5 rounded-lg border bg-card hover:border-muted-foreground/20 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-muted">
                  <TrendingUp className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Actifs</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(financialSummary.totalActifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-lg border bg-card hover:border-muted-foreground/20 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-muted">
                  <TrendingDown className="h-5 w-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Passifs</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {formatCurrency(financialSummary.totalPassifs)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-lg border-2 border-primary/10 bg-card hover:border-primary/30 transition-colors duration-200">
                <div className="p-2.5 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Patrimoine net</p>
                  <p className="text-2xl font-semibold text-primary">
                    {formatCurrency(financialSummary.patrimoineNet)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ligne avec trois cartes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte Patrimoine par tête */}
        <Card>
          <CardHeader>
            <CardTitle>Patrimoine par tête</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                  {patrimoineParPersonne.userFirstName}
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(patrimoineParPersonne.userValue)}
                </p>
              </div>
            </div>

            {patrimoineParPersonne.showSpouse && <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-0.5">
                    {patrimoineParPersonne.spouseFirstName}
                  </p>
                  <p className="text-xl font-semibold text-foreground">
                    {formatCurrency(patrimoineParPersonne.spouseValue)}
                  </p>
                </div>
              </div>}

            {/* Graphique à barres */}
            <div className="space-y-2 pt-2">
              <div className="space-y-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">{patrimoineParPersonne.userFirstName}</span>
                  <span className="font-medium">
                    {patrimoineParPersonne.totalValue > 0 ? Math.round(patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="h-2 bg-primary transition-all duration-500 ease-out rounded-full" style={{
                  width: `${patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.userValue / patrimoineParPersonne.totalValue * 100 : 0}%`
                }} />
                </div>
              </div>

              {patrimoineParPersonne.showSpouse && <div className="space-y-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{patrimoineParPersonne.spouseFirstName}</span>
                    <span className="font-medium">
                      {patrimoineParPersonne.totalValue > 0 ? Math.round(patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-2 bg-primary transition-all duration-500 ease-out rounded-full" style={{
                  width: `${patrimoineParPersonne.totalValue > 0 ? patrimoineParPersonne.spouseValue / patrimoineParPersonne.totalValue * 100 : 0}%`
                }} />
                  </div>
                </div>}
            </div>
          </CardContent>
        </Card>

        {/* Carte vide 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Plus-values</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Contenu à venir
            </p>
          </CardContent>
        </Card>

        {/* Carte vide 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Carte 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">
              Contenu à venir
            </p>
          </CardContent>
        </Card>
      </div>
    </div>;
};