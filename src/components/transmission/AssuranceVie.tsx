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
import './kairos-transmission.css';

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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const [contractsRes, profileRes, maritalRes, familyRes] = await Promise.all([
          supabase
            .from('assets')
            .select('*')
            .eq('user_id', user.id)
            .in('nature', AV_NATURES)
            .order('created_at', { ascending: false }),
          supabase
            .from('family_profiles')
            .select('date_naissance')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('marital_status')
            .select('statut_couple, nom_conjoint, prenom_conjoint')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('family_links')
            .select('nom, prenom, lien_familial')
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

        const familyMembers = (familyRes.data || []).map((f: any) => ({
          nom: f.nom,
          prenom: f.prenom,
          lien: f.lien_familial,
        }));
        setBeneficiaires(familyMembers);
        setNbBeneficiaires(Math.max(1, familyMembers.length));

        // Get spouse name if couple
        if (coupleStatus && maritalRes.data) {
          const ms = maritalRes.data as any;
          if (ms.nom_conjoint || ms.prenom_conjoint) {
            setConjointName(`${ms.prenom_conjoint || ''} ${ms.nom_conjoint || ''}`.trim());
          }
        }

         // Fetch all operations and contract details for these contracts
        if (avContracts.length > 0) {
          const assetIds = avContracts.map(c => c.id);
          const [opsRes2, clausesRes] = await Promise.all([
            supabase
              .from('av_operations')
              .select('asset_id, type_operation, montant')
              .in('asset_id', assetIds),
            supabase
              .from('av_contract_details')
              .select('asset_id, clause_beneficiaire_structuree')
              .in('asset_id', assetIds),
          ]);

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
      } catch (error) {
        console.error('Error fetching AV contracts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute 990I / 757B totals and per-beneficiary breakdown
  const fiscalSummary = useMemo(() => {
    const totalValeur = contracts.reduce((sum, c) => sum + (c.valeur_estimee || 0), 0);

    const is990I = subscriberAge !== null && subscriberAge < 70;
    const montant990I = is990I ? totalValeur : 0;
    const montant757B = !is990I && subscriberAge !== null ? totalValeur : 0;

    // Aggregate beneficiaries from each contract's structured clause
    // Key: beneficiary identifier (familyLinkId or name), Value: accumulated capital
    const benefMap = new Map<string, { nom: string; prenom: string; lien: string; capitalBrut: number }>();

    contracts.forEach(contract => {
      const contractVal = contract.valeur_estimee || 0;
      const clauseData = contractClauses.find(c => c.asset_id === contract.id);
      const clause = clauseData?.clause_beneficiaire_structuree;

      if (clause && clause.niveaux && clause.niveaux.length > 0) {
        // Use first level beneficiaries (principal)
        const niveau = clause.niveaux[0];
        const namedBenefs = niveau.beneficiaires.filter((b: any) => b.nom);
        if (namedBenefs.length > 0) {
          const totalPct = namedBenefs.reduce((s: number, b: any) => s + (b.pourcentage || 0), 0);
          namedBenefs.forEach((b: any) => {
            const key = b.familyLinkId || `${b.prenom}_${b.nom}`;
            const pct = totalPct > 0 ? (b.pourcentage || 0) / totalPct : 1 / namedBenefs.length;
            const amount = contractVal * pct;
            const existing = benefMap.get(key);
            if (existing) {
              existing.capitalBrut += amount;
            } else {
              benefMap.set(key, {
                nom: b.nom,
                prenom: b.prenom || '',
                lien: b.lien || '',
                capitalBrut: amount,
              });
            }
          });
          return; // Done for this contract
        }
      }

      // Fallback: no structured clause — skip (will show "Non renseigné" if no contract has a clause)
    });

    // If no beneficiaries from clauses, show a single "Non renseigné" row
    const allBenefs = benefMap.size > 0
      ? Array.from(benefMap.values())
      : [{ nom: 'Non renseigné', prenom: '', lien: '', capitalBrut: totalValeur }];

    // Count non-spouse for taxation
    const nonSpouseBenefs = allBenefs.filter(b => b.lien !== 'Conjoint');
    const nbTaxable = Math.max(1, nonSpouseBenefs.length);

    // 990I global
    const abattement990I = 152500 * nbTaxable;
    const assiette990I = Math.max(0, montant990I - abattement990I);
    const seuil700k = 700000;
    let droits990I = 0;
    if (assiette990I > 0) {
      const tranche1 = Math.min(assiette990I, seuil700k);
      const tranche2 = Math.max(0, assiette990I - seuil700k);
      droits990I = tranche1 * 0.20 + tranche2 * 0.3125;
    }

    // 757B
    const abattement757B = 30500;
    const assiette757B = Math.max(0, montant757B - abattement757B);
    const droits757B = assiette757B * 0.20;

    const totalDroits = droits990I + droits757B;

    // Per-beneficiary tax computation
    const beneficiaireDetails = allBenefs.map(b => {
      const isSpouse = b.lien === 'Conjoint';
      if (isSpouse) {
        return {
          ...b,
          droits: 0,
          capitalNet: b.capitalBrut,
          exonere: true,
        };
      }

      let droitsBenef = 0;
      if (is990I) {
        const assietteBenef = Math.max(0, b.capitalBrut - 152500);
        const t1 = Math.min(assietteBenef, seuil700k);
        const t2 = Math.max(0, assietteBenef - seuil700k);
        droitsBenef = t1 * 0.20 + t2 * 0.3125;
      } else if (subscriberAge !== null) {
        const abattShare = abattement757B / nbTaxable;
        const assietteBenef = Math.max(0, b.capitalBrut - abattShare);
        droitsBenef = assietteBenef * 0.20;
      }

      return {
        ...b,
        droits: droitsBenef,
        capitalNet: b.capitalBrut - droitsBenef,
        exonere: false,
      };
    });

    return {
      montant990I,
      montant757B,
      abattement990I,
      abattement757B,
      assiette990I,
      assiette757B,
      droits990I,
      droits757B,
      totalValeur,
      totalDroits,
      beneficiaireDetails,
      nbTaxable,
    };
  }, [contracts, contractClauses, subscriberAge]);

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
      {subscriberAge !== null && contracts.length > 0 && (
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
                  {fiscalSummary.assiette757B > 0 && (
                    <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                      <span>Soumis aux droits de succession</span>
                      <span>≈ 20 %</span>
                    </div>
                  )}
                  <Separator className="bg-[var(--border)]" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-[var(--text-primary)]">Droits estimés</span>
                    <span className="kairos-num text-[var(--negative)]">{formatCurrency(fiscalSummary.droits757B)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 rounded-[var(--radius-lg)] bg-[var(--surface-sunken)] border border-[var(--border)]">
              <AlertTriangle className="h-4 w-4 text-[var(--warning)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)]">
                Estimation simplifiée basée sur l'âge actuel du souscripteur ({subscriberAge} ans).
                En réalité, le régime applicable dépend de l'âge au moment de chaque versement.
                Le conjoint ou partenaire de PACS est exonéré dans tous les cas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Beneficiary breakdown */}
      {subscriberAge !== null && contracts.length > 0 && fiscalSummary.beneficiaireDetails.length > 0 && (
        <Card className="bg-[var(--surface)] border-[var(--border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-sm)]">
          <CardHeader className="pb-3 p-5">
            <CardTitle className="text-[15px] font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <UserCheck className="h-4 w-4 text-[var(--ink-400)]" />
              Répartition par bénéficiaire (estimation)
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
