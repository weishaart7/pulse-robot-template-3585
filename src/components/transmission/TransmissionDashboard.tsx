import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calculator, Users, PieChart, FileText, AlertTriangle } from 'lucide-react';
import { useAssets } from '@/hooks/useAssets';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { usePassifs } from '@/hooks/usePassifs';
import { buildFamilyGraph, buildPatrimonySnapshot, createFamilySummary, createPatrimoinySummary } from '@/utils/transmissionHelpers';
import { computeTransmission, TransmissionContext } from '@/lib/transmission';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import './kairos-transmission.css';

export const TransmissionDashboard = () => {
  const [activeScenario, setActiveScenario] = useState<string>('base');
  const [isCalculating, setIsCalculating] = useState(false);

  // Data hooks
  const { assets, loading: assetsLoading } = useAssets();
  const { data: familyProfile, loading: profileLoading } = useFamilyProfile();
  const { data: maritalStatus, loading: maritalLoading } = useMaritalStatus();
  const { data: familyLinks, loading: linksLoading } = useFamilyLinks();
  const { passifs, loading: passifsLoading } = usePassifs();

  const [transmissionResult, setTransmissionResult] = useState<any>(null);

  const isLoading = assetsLoading || profileLoading || maritalLoading || linksLoading || passifsLoading;

  // Calculate transmission when data is available
  useEffect(() => {
    if (!isLoading && familyProfile && assets.length > 0) {
      calculateTransmission();
    }
  }, [isLoading, familyProfile, maritalStatus, familyLinks, assets, passifs]);

  const calculateTransmission = async () => {
    setIsCalculating(true);
    try {
      // Build family graph
      const familyGraph = buildFamilyGraph(familyProfile, maritalStatus, familyLinks || []);

      // Build patrimony snapshot
      const patrimonySnapshot = buildPatrimonySnapshot(assets, passifs);

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
      <div className="kairos-transmission p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--ink-900)] mx-auto mb-4"></div>
            <p className="text-[var(--text-secondary)]">Chargement des données...</p>
          </div>
        </div>
      </div>
    );
  }

  const familySummary = createFamilySummary(familyProfile, maritalStatus, familyLinks || []);
  const patrimoineSummary = createPatrimoinySummary(assets);

  return (
    <ErrorBoundary>
      <div className="kairos-transmission p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Transmission</h2>
            <p className="text-[var(--text-secondary)]">
              Simulation et optimisation de la transmission patrimoniale
            </p>
          </div>
          <Button
            onClick={calculateTransmission}
            disabled={isCalculating}
            className="flex items-center gap-2 bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none"
          >
            <Calculator className="h-4 w-4" />
            {isCalculating ? 'Calcul...' : 'Recalculer'}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <CardTitle className="text-[13px] font-medium tracking-normal text-[var(--text-secondary)]">Actif Net</CardTitle>
              <PieChart className="h-4 w-4 text-[var(--ink-400)]" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 0
                }).format(patrimoineSummary.actifNet)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <CardTitle className="text-[13px] font-medium tracking-normal text-[var(--text-secondary)]">Héritiers</CardTitle>
              <Users className="h-4 w-4 text-[var(--ink-400)]" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {(familySummary.conjoint ? 1 : 0) + familySummary.enfants.length}
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {familySummary.conjoint && 'Conjoint + '}
                {familySummary.enfants.length} enfant(s)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <CardTitle className="text-[13px] font-medium tracking-normal text-[var(--text-secondary)]">Droits Succession</CardTitle>
              <FileText className="h-4 w-4 text-[var(--ink-400)]" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
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

          <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <CardTitle className="text-[13px] font-medium tracking-normal text-[var(--text-secondary)]">Transmission Nette</CardTitle>
              <Calculator className="h-4 w-4 text-[var(--ink-400)]" />
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
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
          <TabsList className="bg-transparent p-0 h-auto gap-7 rounded-none border-b border-[var(--border)]">
            <TabsTrigger
              value="simulation"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 text-[15px] font-medium text-[var(--text-secondary)] shadow-none data-[state=active]:bg-transparent data-[state=active]:border-[var(--ink-900)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Simulation
            </TabsTrigger>
            <TabsTrigger
              value="optimisation"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 text-[15px] font-medium text-[var(--text-secondary)] shadow-none data-[state=active]:bg-transparent data-[state=active]:border-[var(--ink-900)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Optimisation
            </TabsTrigger>
            <TabsTrigger
              value="famille"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 text-[15px] font-medium text-[var(--text-secondary)] shadow-none data-[state=active]:bg-transparent data-[state=active]:border-[var(--ink-900)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Situation Familiale
            </TabsTrigger>
            <TabsTrigger
              value="patrimoine"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 text-[15px] font-medium text-[var(--text-secondary)] shadow-none data-[state=active]:bg-transparent data-[state=active]:border-[var(--ink-900)] data-[state=active]:text-[var(--text-primary)] data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              Patrimoine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="simulation" className="space-y-4">
            {transmissionResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Results Summary */}
                <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
                  <CardHeader className="p-5">
                    <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Résultats du Calcul</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Masse de calcul:</span>
                        <span className="kairos-num font-medium text-[var(--text-primary)]">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(transmissionResult.masseCalcul)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Réserve:</span>
                        <span className="kairos-num font-medium text-[var(--text-primary)]">
                          {new Intl.NumberFormat('fr-FR', {
                            style: 'currency',
                            currency: 'EUR'
                          }).format(transmissionResult.reserve)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-secondary)]">Quotité disponible:</span>
                        <span className="kairos-num font-medium text-[var(--text-primary)]">
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
                <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
                  <CardHeader className="p-5">
                    <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Répartition entre Héritiers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <div className="space-y-3">
                      {transmissionResult.heirs.map((heir: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-[var(--surface-sunken)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                          <div>
                            <p className="font-medium text-[var(--text-primary)]">{heir.nom}</p>
                            <p className="text-sm text-[var(--text-secondary)]">{heir.lien}</p>
                          </div>
                          <div className="text-right">
                            <p className="kairos-num font-medium text-[var(--text-primary)]">
                              {new Intl.NumberFormat('fr-FR', {
                                style: 'currency',
                                currency: 'EUR'
                              }).format(heir.partFinale)}
                            </p>
                            <p className="kairos-num text-sm text-[var(--text-secondary)]">
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
              <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
                <CardContent className="py-8">
                  <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-[var(--ink-400)] mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2 text-[var(--text-primary)]">Données incomplètes</h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                      Veuillez renseigner votre situation familiale et votre patrimoine pour effectuer une simulation.
                    </p>
                    <Button
                      onClick={calculateTransmission}
                      disabled={isCalculating}
                      className="bg-[var(--ink-900)] text-white border border-[var(--ink-900)] rounded-[var(--radius-lg)] hover:bg-[var(--ink-800)] shadow-none"
                    >
                      {isCalculating ? 'Calcul...' : 'Lancer la Simulation'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="optimisation" className="space-y-4">
            <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
              <CardHeader className="p-5">
                <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Optimisations Fiscales</CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Suggestions pour optimiser votre transmission patrimoniale
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-center text-[var(--text-secondary)] py-8">
                  <p>Fonctionnalité en cours de développement...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="famille" className="space-y-4">
            <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
              <CardHeader className="p-5">
                <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Situation Familiale</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 text-[var(--text-primary)]">De cujus (décédant)</h4>
                    <p className="text-[var(--text-primary)]">{familySummary.decedent.prenom} {familySummary.decedent.nom}</p>
                    {familySummary.decedent.regimeMatrimonial && (
                      <p className="text-sm text-[var(--text-secondary)]">
                        Régime: {familySummary.decedent.regimeMatrimonial}
                      </p>
                    )}
                  </div>

                  {familySummary.conjoint && (
                    <div>
                      <h4 className="font-semibold mb-2 text-[var(--text-primary)]">Conjoint</h4>
                      <p className="text-[var(--text-primary)]">{familySummary.conjoint.prenom} {familySummary.conjoint.nom}</p>
                      <Badge
                        variant={familySummary.conjoint.vivant ? "default" : "destructive"}
                        className={
                          familySummary.conjoint.vivant
                            ? "bg-[var(--positive-soft)] text-[var(--positive)] border-transparent rounded-[var(--radius-md)]"
                            : "bg-[var(--negative-soft)] text-[var(--negative)] border-transparent rounded-[var(--radius-md)]"
                        }
                      >
                        {familySummary.conjoint.vivant ? 'Vivant' : 'Décédé'}
                      </Badge>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2 text-[var(--text-primary)]">Enfants ({familySummary.enfants.length})</h4>
                    <div className="space-y-2">
                      {familySummary.enfants.map(enfant => (
                        <div key={enfant.id} className="flex items-center justify-between">
                          <span className="text-[var(--text-primary)]">{enfant.prenom} {enfant.nom}</span>
                          <div className="flex gap-2">
                            <Badge
                              variant={enfant.vivant ? "default" : "destructive"}
                              className={
                                enfant.vivant
                                  ? "bg-[var(--positive-soft)] text-[var(--positive)] border-transparent rounded-[var(--radius-md)]"
                                  : "bg-[var(--negative-soft)] text-[var(--negative)] border-transparent rounded-[var(--radius-md)]"
                              }
                            >
                              {enfant.vivant ? 'Vivant' : 'Décédé'}
                            </Badge>
                            {enfant.branche === 'precedente' && (
                              <Badge variant="outline" className="bg-[var(--ink-050)] text-[var(--ink-700)] border-transparent rounded-[var(--radius-md)]">
                                Lit précédent
                              </Badge>
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
            <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
              <CardHeader className="p-5">
                <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Composition du Patrimoine</CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="kairos-num text-2xl font-semibold text-[var(--data-blue)]">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0
                      }).format(patrimoineSummary.actifs.immobilier)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Immobilier</p>
                  </div>
                  <div className="text-center">
                    <p className="kairos-num text-2xl font-semibold text-[var(--data-green)]">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0
                      }).format(patrimoineSummary.actifs.financier)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Financier</p>
                  </div>
                  <div className="text-center">
                    <p className="kairos-num text-2xl font-semibold text-[var(--data-purple)]">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0
                      }).format(patrimoineSummary.actifs.professionnel)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Professionnel</p>
                  </div>
                  <div className="text-center">
                    <p className="kairos-num text-2xl font-semibold text-[var(--data-amber)]">
                      {new Intl.NumberFormat('fr-FR', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0
                      }).format(patrimoineSummary.actifs.autres)}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">Autres</p>
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
