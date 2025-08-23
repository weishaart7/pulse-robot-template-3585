import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, Users, PieChart, FileText, AlertTriangle } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { buildFamilyGraph, buildPatrimonySnapshot, createFamilySummary, createPatrimoinySummary } from '@/utils/transmissionHelpers';
import { computeTransmission, TransmissionContext } from '@/lib/transmission';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export const TransmissionDashboard = () => {
  const [activeScenario, setActiveScenario] = useState<string>('base');
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Data hooks
  const { assets, loading: assetsLoading } = useAssets();
  const { data: familyProfile, loading: profileLoading } = useFamilyProfile();
  const { data: maritalStatus, loading: maritalLoading } = useMaritalStatus();
  const { data: familyLinks, loading: linksLoading } = useFamilyLinks();
  
  const [transmissionResult, setTransmissionResult] = useState<any>(null);

  const isLoading = assetsLoading || profileLoading || maritalLoading || linksLoading;
  
  // Calculate transmission when data is available
  useEffect(() => {
    if (!isLoading && familyProfile && assets.length > 0) {
      calculateTransmission();
    }
  }, [isLoading, familyProfile, maritalStatus, familyLinks, assets]);

  const calculateTransmission = async () => {
    setIsCalculating(true);
    try {
      // Build family graph
      const familyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks || []);
      
      // Build patrimony snapshot
      const patrimonySnapshot = buildPatrimonySnapshot(assets);
      
      // Build transmission context
      const transmissionContext: TransmissionContext = {
        family: familyGraph,
        patrimony: patrimonySnapshot,
        liberalites: [], // TODO: Load from liberalites table
        params: {
          abattements: {
            conjoint: 80724,
            enfant: 100000,
            petitEnfant: 31865,
            parent: 100000,
            freresSoeurs: 15932,
            neveuNiece: 7967,
            autres: 1594
          },
          bareme: [], // TODO: Load from configuration
          imputationConjointAvantLegs: true
        }
      };
      
      // Calculate transmission
      const result = computeTransmission(transmissionContext);
      setTransmissionResult(result);
    } catch (error) {
      console.error('Error calculating transmission:', error);
    } finally {
      setIsCalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  const familySummary = createFamilySummary(familyProfile, maritalStatus, familyLinks || []);
  const patrimoineSummary = createPatrimoinySummary(assets);

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Transmission</h2>
            <p className="text-muted-foreground">
              Simulation et optimisation de la transmission patrimoniale
            </p>
          </div>
          <Button 
            onClick={calculateTransmission} 
            disabled={isCalculating}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? 'Calcul...' : 'Recalculer'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Actif Net</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat('fr-FR', { 
                  style: 'currency', 
                  currency: 'EUR',
                  maximumFractionDigits: 0 
                }).format(patrimoineSummary.actifNet)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Héritiers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(familySummary.conjoint ? 1 : 0) + familySummary.enfants.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {familySummary.conjoint && 'Conjoint + '}
                {familySummary.enfants.length} enfant(s)
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Droits Succession</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transmissionResult ? 
                  new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0 
                  }).format(transmissionResult.totalDroitsSuccession) :
                  '---'
                }
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transmission Nette</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {transmissionResult ? 
                  new Intl.NumberFormat('fr-FR', { 
                    style: 'currency', 
                    currency: 'EUR',
                    maximumFractionDigits: 0 
                  }).format(transmissionResult.transmissionNette) :
                  '---'
                }
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="simulation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="simulation">Simulation</TabsTrigger>
            <TabsTrigger value="optimisation">Optimisation</TabsTrigger>
            <TabsTrigger value="famille">Situation Familiale</TabsTrigger>
            <TabsTrigger value="patrimoine">Patrimoine</TabsTrigger>
          </TabsList>

          <TabsContent value="simulation" className="space-y-4">
            {transmissionResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Results Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Résultats du Calcul</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Masse de calcul:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(transmissionResult.masseCalcul)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Réserve:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(transmissionResult.reserve)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quotité disponible:</span>
                        <span className="font-medium">
                          {new Intl.NumberFormat('fr-FR', { 
                            style: 'currency', 
                            currency: 'EUR' 
                          }).format(transmissionResult.quotiteDisponible)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Heirs Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Répartition entre Héritiers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {transmissionResult.heirs.map((heir: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{heir.nom}</p>
                            <p className="text-sm text-muted-foreground">{heir.lien}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              {new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(heir.partFinale)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Droits: {new Intl.NumberFormat('fr-FR', { 
                                style: 'currency', 
                                currency: 'EUR' 
                              }).format(heir.droitsSuccession)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Données incomplètes</h3>
                    <p className="text-muted-foreground mb-4">
                      Veuillez renseigner votre situation familiale et votre patrimoine pour effectuer une simulation.
                    </p>
                    <Button onClick={calculateTransmission} disabled={isCalculating}>
                      {isCalculating ? 'Calcul...' : 'Lancer la Simulation'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="optimisation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Optimisations Fiscales</CardTitle>
                <CardDescription>
                  Suggestions pour optimiser votre transmission patrimoniale
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  <p>Fonctionnalité en cours de développement...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="famille" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Situation Familiale</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">De cujus (décédant)</h4>
                    <p>{familySummary.decedent.prenom} {familySummary.decedent.nom}</p>
                    {familySummary.decedent.regimeMatrimonial && (
                      <p className="text-sm text-muted-foreground">
                        Régime: {familySummary.decedent.regimeMatrimonial}
                      </p>
                    )}
                  </div>

                  {familySummary.conjoint && (
                    <div>
                      <h4 className="font-semibold mb-2">Conjoint</h4>
                      <p>{familySummary.conjoint.prenom} {familySummary.conjoint.nom}</p>
                      <Badge variant={familySummary.conjoint.vivant ? "default" : "destructive"}>
                        {familySummary.conjoint.vivant ? 'Vivant' : 'Décédé'}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Enfants ({familySummary.enfants.length})</h4>
                    <div className="space-y-2">
                      {familySummary.enfants.map(enfant => (
                        <div key={enfant.id} className="flex items-center justify-between">
                          <span>{enfant.prenom} {enfant.nom}</span>
                          <div className="flex gap-2">
                            <Badge variant={enfant.vivant ? "default" : "destructive"}>
                              {enfant.vivant ? 'Vivant' : 'Décédé'}
                            </Badge>
                            {enfant.branche === 'precedente' && (
                              <Badge variant="outline">Lit précédent</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patrimoine" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Composition du Patrimoine</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                      }).format(patrimoineSummary.actifs.immobilier)}
                    </p>
                    <p className="text-sm text-muted-foreground">Immobilier</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                      }).format(patrimoineSummary.actifs.financier)}
                    </p>
                    <p className="text-sm text-muted-foreground">Financier</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                      }).format(patrimoineSummary.actifs.professionnel)}
                    </p>
                    <p className="text-sm text-muted-foreground">Professionnel</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">
                      {new Intl.NumberFormat('fr-FR', { 
                        style: 'currency', 
                        currency: 'EUR',
                        maximumFractionDigits: 0 
                      }).format(patrimoineSummary.actifs.autres)}
                    </p>
                    <p className="text-sm text-muted-foreground">Autres</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
};