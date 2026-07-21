import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from '@/services/assetService';
import { formatCurrency } from '@/lib/patrimoine/utils';
import { Shield, FileText, AlertTriangle, ArrowRight, ChevronRight, Scale, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AVContractDetail } from './av/AVContractDetail';
import { ClauseStructuree, BeneficiaireEntry } from './av/ClauseBeneficiaireBuilder';
import { getAssetCategory } from '@/constants/assetTypes';
import {
  buildFamilyGraph,
  buildPatrimonySnapshot,
  buildAVContracts,
  AVContractRawRow,
  AVDonneesInsuffisantesError
} from '@/utils/transmissionHelpers';
import { computeTransmission, FamilyGraph, PatrimonySnapshot, TransmissionParams } from '@/lib/transmission';
import { resolveEffectiveAVBeneficiaires } from '@/lib/dmtg/assurance-vie';
import { BienNonQualifieError } from '@/lib/patrimoine/succession';
import transmissionParamsData from '@/data/transmission-params.json';

const AV_NATURES = [
  "Contrat d'assurance-vie",
  "Contrat vie-génération",
  "PEP assurance vie",
  "Bons & contrats de capitalisation",
];

interface OperationsByContract {
  [assetId: string]: { type_operation: string; montant: number }[];
}

interface ContractClause {
  asset_id: string;
  clause_beneficiaire_structuree: ClauseStructuree | null;
}

interface Beneficiaire {
  nom: string;
  prenom: string | null;
  lien: string;
}

export const AssuranceVie = () => {
  const [contracts, setContracts] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState<Asset | null>(null);
  const [subscriberAge, setSubscriberAge] = useState<number | null>(null);
  const [isCouple, setIsCouple] = useState(false);
  const [operationsByContract, setOperationsByContract] = useState<OperationsByContract>({});
  const [nbBeneficiaires, setNbBeneficiaires] = useState(1);
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);
  const [conjointName, setConjointName] = useState<string | null>(null);
  const [contractClauses, setContractClauses] = useState<ContractClause[]>([]);
  // Résultat du vrai moteur fiscal (computeTransmission -> dmtg.perBeneficiary,
  // cf. dmtg/assurance-vie.ts::computeAssuranceVie) — remplace l'estimation
  // simplifiée basée sur l'âge actuel du souscripteur (décision du 2026-07-18).
  const [transmissionResult, setTransmissionResult] = useState<any>(null);
  const [computeErrorMessage, setComputeErrorMessage] = useState<string | null>(null);
  const [avContractsBuilt, setAvContractsBuilt] = useState<ReturnType<typeof buildAVContracts>>([]);
  const [familyMembersById, setFamilyMembersById] = useState<Map<string, { nom: string; prenom: string; lien: string }>>(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contractsRes, profileRes, maritalRes, familyRes, passifsRes] = await Promise.all([
          supabase
            .from('assets')
            .select('*')
            .eq('user_id', user.id)
            .in('nature', AV_NATURES)
            .order('created_at', { ascending: false }),
          supabase
            .from('family_profiles')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('marital_status')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('family_links')
            .select('*')
            .eq('user_id', user.id),
          supabase
            .from('passifs')
            .select('montant_du')
            .eq('user_id', user.id),
        ]);

        const avContracts = contractsRes.data || [];
        setContracts(avContracts);

        if (profileRes.data?.date_naissance) {
          const birth = new Date(profileRes.data.date_naissance);
          const now = new Date();
          const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          setSubscriberAge(age);
        }
        const statut = maritalRes.data?.statut_couple || null;
        const coupleStatus = ['Marié(e)', 'Pacsé(e)'].includes(statut || '');
        setIsCouple(coupleStatus);

        const familyLinksRows = familyRes.data || [];
        const familyMembers = familyLinksRows.map((f: any) => ({
          nom: f.nom,
          prenom: f.prenom,
          lien: f.lien_familial,
        }));
        setBeneficiaires(familyMembers);
        setNbBeneficiaires(Math.max(1, familyMembers.length));
        setFamilyMembersById(new Map(familyLinksRows.map((f: any) => [f.id, { nom: f.nom, prenom: f.prenom || '', lien: f.lien_familial }])));

        // Get spouse name if couple
        if (coupleStatus && maritalRes.data) {
          const ms = maritalRes.data as any;
          if (ms.nom_conjoint || ms.prenom_conjoint) {
            setConjointName(`${ms.prenom_conjoint || ''} ${ms.nom_conjoint || ''}`.trim());
          }
        }

         // Fetch all operations and contract details for these contracts
        let avOperationsRaw: any[] = [];
        let avClausesRaw: any[] = [];
        if (avContracts.length > 0) {
          const assetIds = avContracts.map(c => c.id);
          const [opsRes2, clausesRes] = await Promise.all([
            supabase
              .from('av_operations')
              .select('asset_id, type_operation, montant, date_operation')
              .in('asset_id', assetIds),
            supabase
              .from('av_contract_details')
              .select('asset_id, clause_beneficiaire_structuree')
              .in('asset_id', assetIds),
          ]);

          avOperationsRaw = opsRes2.data || [];
          avClausesRaw = clausesRes.data || [];

          if (opsRes2.data) {
            const grouped: OperationsByContract = {};
            opsRes2.data.forEach((op: any) => {
              if (!grouped[op.asset_id]) grouped[op.asset_id] = [];
              grouped[op.asset_id].push({ type_operation: op.type_operation, montant: op.montant });
            });
            setOperationsByContract(grouped);
          }

          if (clausesRes.data) {
            setContractClauses(clausesRes.data.map((d: any) => ({
              asset_id: d.asset_id,
              clause_beneficiaire_structuree: d.clause_beneficiaire_structuree || null,
            })));
          }
        }

        // Calcul réel via le pipeline de transmission complet (même moteur que
        // Synthese.tsx/ProcessusCalcul.tsx) : seul point d'entrée qui sait
        // résoudre correctement les exonérations conjoint/PACS et étendre la
        // liste des bénéficiaires DMTG aux désignations AV hors héritiers
        // civils (cf. transmission/index.ts).
        if (profileRes.data && avContracts.length > 0) {
          try {
            const opsByAsset = new Map<string, { type_operation: string; montant: number | null; date_operation: string }[]>();
            avOperationsRaw.forEach((op: any) => {
              const list = opsByAsset.get(op.asset_id) || [];
              list.push({ type_operation: op.type_operation, montant: op.montant, date_operation: op.date_operation });
              opsByAsset.set(op.asset_id, list);
            });
            const clauseByAsset = new Map<string, any>(avClausesRaw.map((d: any) => [d.asset_id, d.clause_beneficiaire_structuree || null]));
            const avContractsRaw: AVContractRawRow[] = avContracts.map(a => ({
              assetId: a.id!,
              label: a.denomination,
              valeurEstimee: a.valeur_estimee,
              operations: opsByAsset.get(a.id!) || [],
              clauseBeneficiaireStructuree: clauseByAsset.get(a.id!) || null
            }));

            const family: FamilyGraph = buildFamilyGraph(profileRes.data, maritalRes.data, familyLinksRows);
            const builtAvContracts = buildAVContracts(avContractsRaw, profileRes.data.date_naissance, family);
            setAvContractsBuilt(builtAvContracts);

            const { data: allAssets } = await supabase.from('assets').select('*').eq('user_id', user.id);
            const patrimony: PatrimonySnapshot = buildPatrimonySnapshot(
              allAssets || [],
              passifsRes.data || [],
              0
            );
            const rawParams = transmissionParamsData as any;
            const params: TransmissionParams = {
              ...rawParams,
              abattements: {
                ...rawParams.abattements,
                conjoint: rawParams.abattements.conjoint === 'Infinity' ? Infinity : rawParams.abattements.conjoint
              }
            };

            const result = computeTransmission({
              family,
              patrimony,
              liberalites: [],
              params,
              rawAssets: allAssets || [],
              avContracts: builtAvContracts,
              referenceDate: new Date().toISOString().split('T')[0]
            });
            setTransmissionResult(result);
            setComputeErrorMessage(null);
          } catch (calcError) {
            console.error('Erreur calcul fiscal assurance-vie:', calcError);
            setTransmissionResult(null);
            setComputeErrorMessage(
              calcError instanceof AVDonneesInsuffisantesError || calcError instanceof BienNonQualifieError
                ? calcError.message
                : null
            );
          }
        }
      } catch (error) {
        console.error('Error fetching AV contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Répartition par bénéficiaire à partir du vrai moteur fiscal : capital brut
  // dérivé des contrats réels (avContractsBuilt), prélèvement 990I et
  // réintégration 757B lus directement dans transmissionResult.dmtg
  // (dmtg/assurance-vie.ts, jamais recalculés ici).
  const fiscalSummary = useMemo(() => {
    const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);
    const montant990I = avContractsBuilt.reduce((sum, c) => sum + c.primesAvant70, 0);
    const montant757B = avContractsBuilt.reduce((sum, c) => sum + c.primesApres70, 0);

    const dmtgPerBeneficiary = transmissionResult?.dmtg?.perBeneficiary || {};

    const benefMap = new Map<string, { nom: string; prenom: string; lien: string; capitalBrut: number }>();
    avContractsBuilt.forEach(contract => {
      // Bénéficiaires EFFECTIFS (cascade de renonciation + démembrement déjà
      // résolus, cf. dmtg/assurance-vie.ts::resolveEffectiveAVBeneficiaires) —
      // plus la seule liste plate du niveau 1, pour que ce résumé reste
      // cohérent avec ce que le moteur fiscal calcule réellement.
      resolveEffectiveAVBeneficiaires(contract.niveaux).forEach(b => {
        const member = familyMembersById.get(b.beneficiaryId);
        const isSpouse = transmissionResult?.family?.survivingSpouseId === b.beneficiaryId;
        const amount = contract.capitalDeces * b.quotePart;
        const existing = benefMap.get(b.beneficiaryId);
        if (existing) {
          existing.capitalBrut += amount;
        } else {
          benefMap.set(b.beneficiaryId, {
            nom: isSpouse ? (conjointName?.split(' ').slice(1).join(' ') || conjointName || 'Conjoint') : (member?.nom || 'Bénéficiaire'),
            prenom: isSpouse ? (conjointName?.split(' ')[0] || '') : (member?.prenom || ''),
            lien: isSpouse ? 'Conjoint' : (member?.lien || ''),
            capitalBrut: amount,
          });
        }
      });

      // Bénéficiaire absent de la clause (tous niveaux renoncés) — rien à
      // agréger, le tableau restera vide (cf. allBenefs ci-dessous).
    });

    const allBenefs = benefMap.size > 0
      ? Array.from(benefMap.entries()).map(([id, b]) => ({ id, ...b }))
      : totalValeur > 0
        ? [{ id: '', nom: 'Non renseigné', prenom: '', lien: '', capitalBrut: totalValeur }]
        : [];

    const nbTaxable = Math.max(1, allBenefs.filter(b => b.lien !== 'Conjoint').length);
    const abattement990I = 152500 * nbTaxable;
    const abattement757B = 30500;

    // Prélèvement 990I / réintégration 757B lus directement dans le résultat
    // du vrai moteur (dmtg/assurance-vie.ts) — jamais recalculés ici. Le
    // détail des droits de succession sur la réintégration 757B n'est pas
    // isolable séparément (mêlé au barème de succession général, cf.
    // dmtg/index.ts) : seul le montant réintégré est affiché pour ce régime.
    const droits990I = transmissionResult?.dmtg?.totals?.prelev990I || 0;
    const totalReintegration757B = allBenefs.reduce(
      (sum, b) => sum + (b.id ? (dmtgPerBeneficiary[b.id]?.reintegration757B || 0) : 0),
      0
    );

    const beneficiaireDetails = allBenefs.map(b => {
      const isSpouse = b.lien === 'Conjoint';
      const prelev990I = b.id ? (dmtgPerBeneficiary[b.id]?.prelev990I || 0) : 0;
      return {
        ...b,
        droits: prelev990I,
        capitalNet: b.capitalBrut - prelev990I,
        exonere: isSpouse,
      };
    });

    return {
      montant990I,
      montant757B,
      abattement990I,
      abattement757B,
      assiette990I: Math.max(0, montant990I - abattement990I),
      assiette757B: Math.max(0, montant757B - abattement757B),
      droits990I,
      totalReintegration757B,
      totalValeur,
      totalDroits: droits990I,
      beneficiaireDetails,
      nbTaxable,
    };
  }, [contracts, avContractsBuilt, transmissionResult, familyMembersById, conjointName]);

  // If a contract is selected, show the detail view
  if (selectedContract) {
    return (
      <div className="kairos-transmission space-y-4">
        {contracts.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {contracts.map((c) => (
              <Button
                key={c.id}
                variant={c.id === selectedContract.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedContract(c)}
                className={
                  "whitespace-nowrap rounded-[var(--radius-lg)] shadow-none " +
                  (c.id === selectedContract.id
                    ? "bg-[var(--ink-900)] text-white border border-[var(--ink-900)] hover:bg-[var(--ink-800)]"
                    : "bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border-strong)]")
                }
              >
                {c.denomination || c.nature}
              </Button>
            ))}
          </div>
        )}
        <AVContractDetail
          contract={selectedContract}
          onBack={() => setSelectedContract(null)}
          subscriberAge={subscriberAge}
          isCouple={isCouple}
        />
      </div>
    );
  }

  const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);

  if (isLoading) {
    return (
      <div className="kairos-transmission space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-[var(--radius-2xl)] bg-[var(--surface-sunken)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="kairos-transmission">
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-[var(--ink-050)] flex items-center justify-center">
                <Shield className="h-6 w-6 text-[var(--ink-400)]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Aucun contrat d'assurance-vie</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Ajoutez vos contrats d'assurance-vie dans la section Patrimoine pour les visualiser ici.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/patrimoine')}
                className="gap-2 bg-[var(--surface)] text-[var(--text-primary)] border-[var(--border-strong)] rounded-[var(--radius-lg)]"
              >
                Aller au Patrimoine
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="kairos-transmission space-y-6">
      {/* Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--ink-050)] flex items-center justify-center">
                <FileText className="h-5 w-5 text-[var(--ink-700)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Nombre de contrats</p>
                <p className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{contracts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--ink-050)] flex items-center justify-center">
                <Shield className="h-5 w-5 text-[var(--ink-700)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Valeur totale</p>
                <p className="kairos-num text-[26px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{formatCurrency(totalValeur)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--warning-soft)] flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
              </div>
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Fiscalité transmission</p>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  Hors succession (art. L132-12)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal 990I / 757B summary */}
      {transmissionResult && contracts.length > 0 && (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3 p-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <Scale className="h-4 w-4 text-[var(--ink-400)]" />
              Répartition fiscale en cas de décès
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 990I */}
              <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[var(--ink-900)] text-white border-transparent rounded-[var(--radius-md)]">Art. 990 I</Badge>
                    <span className="text-xs text-[var(--text-secondary)]">Primes avant 70 ans</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Capitaux taxables</span>
                    <span className="kairos-num font-medium text-[var(--text-primary)]">{formatCurrency(fiscalSummary.montant990I)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Abattement ({fiscalSummary.nbTaxable} bénéf. × 152 500 €)</span>
                    <span className="kairos-num font-medium text-[var(--positive)]">- {formatCurrency(Math.min(fiscalSummary.abattement990I, fiscalSummary.montant990I))}</span>
                  </div>
                  <Separator className="bg-[var(--border)]" />
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Assiette taxable</span>
                    <span className="kairos-num font-medium text-[var(--text-primary)]">{formatCurrency(fiscalSummary.assiette990I)}</span>
                  </div>
                  {fiscalSummary.assiette990I > 0 && (
                    <>
                      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                        <span>Jusqu'à 700 000 € → 20 %</span>
                        <span className="kairos-num">{formatCurrency(Math.min(fiscalSummary.assiette990I, 700000) * 0.20)}</span>
                      </div>
                      {fiscalSummary.assiette990I > 700000 && (
                        <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                          <span>Au-delà → 31,25 %</span>
                          <span className="kairos-num">{formatCurrency((fiscalSummary.assiette990I - 700000) * 0.3125)}</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator className="bg-[var(--border)]" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-[var(--text-primary)]">Prélèvement estimé</span>
                    <span className="kairos-num text-[var(--negative)]">{formatCurrency(fiscalSummary.droits990I)}</span>
                  </div>
                </div>
              </div>

              {/* 757B */}
              <div className="space-y-3 p-4 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[var(--ink-050)] text-[var(--ink-700)] border-transparent rounded-[var(--radius-md)]">Art. 757 B</Badge>
                    <span className="text-xs text-[var(--text-secondary)]">Primes après 70 ans</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Capitaux taxables</span>
                    <span className="kairos-num font-medium text-[var(--text-primary)]">{formatCurrency(fiscalSummary.montant757B)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Abattement global</span>
                    <span className="kairos-num font-medium text-[var(--positive)]">- {formatCurrency(Math.min(30500, fiscalSummary.montant757B))}</span>
                  </div>
                  <Separator className="bg-[var(--border)]" />
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Assiette taxable</span>
                    <span className="kairos-num font-medium text-[var(--text-primary)]">{formatCurrency(fiscalSummary.assiette757B)}</span>
                  </div>
                  <Separator className="bg-[var(--border)]" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-[var(--text-primary)]">Réintégré aux droits de succession</span>
                    <span className="kairos-num text-[var(--negative)]">{formatCurrency(fiscalSummary.totalReintegration757B)}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Taxé au barème de succession de chaque bénéficiaire (art. 757 B), pas à un taux fixe — le montant des droits n'est donc pas isolable de la succession, cf. Synthèse.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)]">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                Calcul basé sur l'âge réel du souscripteur à chaque versement enregistré (pas sur son âge actuel).
                Le conjoint ou partenaire de PACS est exonéré dans tous les cas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {computeErrorMessage && (
        <Card className="bg-[var(--negative-soft)] border-[var(--negative)]/30 rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-[var(--negative)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--negative)]">{computeErrorMessage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beneficiary breakdown */}
      {transmissionResult && contracts.length > 0 && fiscalSummary.beneficiaireDetails.length > 0 && (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3 p-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <UserCheck className="h-4 w-4 text-[var(--ink-400)]" />
              Répartition par bénéficiaire
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 text-xs font-medium text-[var(--text-secondary)] pb-2 border-b border-[var(--border)]">
                <span>Bénéficiaire</span>
                <span className="text-right">Capital brut</span>
                <span className="text-right">Prélèvement</span>
                <span className="text-right">Capital net</span>
              </div>
              {fiscalSummary.beneficiaireDetails.map((b, i) => (
                <div key={i} className="grid grid-cols-4 gap-4 items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[var(--ink-050)] flex items-center justify-center text-xs font-semibold text-[var(--ink-700)] shrink-0">
                      {(b.prenom?.[0] || '').toUpperCase()}{b.nom[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate text-[var(--text-primary)]">{b.prenom} {b.nom}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{b.lien}</p>
                    </div>
                  </div>
                  <p className="kairos-num text-right font-medium text-[var(--text-primary)]">{formatCurrency(b.capitalBrut)}</p>
                  <p className="text-right">
                    {b.exonere ? (
                      <Badge variant="outline" className="text-xs bg-[var(--positive-soft)] text-[var(--positive)] border-transparent rounded-[var(--radius-md)]">Exonéré</Badge>
                    ) : (
                      <span className="kairos-num text-[var(--negative)] font-medium">- {formatCurrency(b.droits)}</span>
                    )}
                  </p>
                  <p className="kairos-num text-right font-semibold text-[var(--text-primary)]">{formatCurrency(b.capitalNet)}</p>
                </div>
              ))}
              {/* Total row */}
              <Separator className="bg-[var(--border)]" />
              <div className="grid grid-cols-4 gap-4 text-sm font-semibold text-[var(--text-primary)]">
                <span>Total</span>
                <span className="kairos-num text-right">{formatCurrency(fiscalSummary.totalValeur)}</span>
                <span className="kairos-num text-right text-[var(--negative)]">- {formatCurrency(fiscalSummary.totalDroits)}</span>
                <span className="kairos-num text-right">{formatCurrency(fiscalSummary.totalValeur - fiscalSummary.totalDroits)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Liste des contrats - cliquable */}
      <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardHeader className="p-5">
          <CardTitle className="text-[15px] font-semibold text-[var(--text-primary)]">Contrats d'assurance-vie</CardTitle>
        </CardHeader>
        <CardContent className="p-5 pt-0 space-y-1">
          {contracts.map((contract, index) => (
            <React.Fragment key={contract.id}>
              {index > 0 && <Separator className="bg-[var(--border)]" />}
              <button
                className="w-full flex items-center justify-between py-3 px-2 rounded-[var(--radius-lg)] hover:bg-[var(--fill-hover)] transition-colors text-left"
                onClick={() => setSelectedContract(contract)}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">
                      {contract.denomination || contract.nature}
                    </p>
                    <Badge className="text-xs bg-[var(--ink-050)] text-[var(--ink-700)] border-transparent rounded-[var(--radius-md)]">
                      {contract.nature}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                    {contract.etablissement && (
                      <span>{contract.etablissement}</span>
                    )}
                    {contract.detenteur && (
                      <span>Détenteur : {contract.detenteur}</span>
                    )}
                    {contract.date_acquisition && (
                      <span>Ouvert le {new Date(contract.date_acquisition).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="kairos-num font-semibold text-lg text-[var(--text-primary)]">
                      {formatCurrency(contract.valeur_estimee || 0)}
                    </p>
                    {contract.mode_detention && (
                      <p className="text-xs text-[var(--text-secondary)]">{contract.mode_detention}</p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-[var(--ink-400)]" />
                </div>
              </button>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>

      {/* Note fiscale */}
      <Card className="bg-[var(--warning-soft)] border-[var(--warning)]/20 rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--warning)] shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm">
              <p className="font-medium text-[var(--text-primary)]">Régime fiscal de l'assurance-vie en cas de décès</p>
              <ul className="list-disc list-inside space-y-1 text-[var(--text-secondary)]">
                <li><strong className="text-[var(--text-primary)]">Primes versées avant 70 ans :</strong> abattement de 152 500 € par bénéficiaire, puis prélèvement de 20 % jusqu'à 700 000 € et 31,25 % au-delà (art. 990 I CGI)</li>
                <li><strong className="text-[var(--text-primary)]">Primes versées après 70 ans :</strong> abattement global de 30 500 € tous bénéficiaires confondus, excédent soumis aux droits de succession (art. 757 B CGI)</li>
                <li><strong className="text-[var(--text-primary)]">Conjoint / partenaire PACS :</strong> exonéré dans tous les cas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
