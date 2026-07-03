import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { FamilyTree } from '@/components/FamilyTree';
import { FamilyMiniTree, getInitials } from '@/components/famille/FamilyMiniTree';
import { User, Plus, ArrowLeft } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculerPartsFiscales } from '@/lib/fiscal';

type EditView = 'client';

const CARD_STYLE: React.CSSProperties = {
  boxShadow: '0 1px 2px rgba(20,20,20,0.04), 0 4px 12px rgba(20,20,20,0.04)',
};
const CARD_CLASS = 'bg-white rounded-[14px] p-6';
const LABEL_COLOR = '#8a8a86';
const TEXT_COLOR = '#1a1a1a';
const DIVIDER_COLOR = '#ececea';

const FamilleSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ma-famille');
  const [editView, setEditView] = useState<EditView | null>(null);
  const [isSingle, setIsSingle] = useState(false);
  const [treeDialogOpen, setTreeDialogOpen] = useState(false);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, saveData: saveMaritalData } = useMaritalStatus();
  const { data: familyLinks = [] } = useFamilyLinks();

  const TABS = [
    { id: 'ma-famille', label: 'Ma famille' },
    { id: 'liens-familiaux', label: 'Liens familiaux' },
  ];

  const handleToggleSingle = async (checked: boolean) => {
    setIsSingle(checked);
    if (checked) {
      await saveMaritalData({ statut_couple: 'Célibataire', parent_isole: false } as any);
    }
  };

  const relationStatus = (maritalData?.statut_couple as string) || '';
  const hasPartner = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(relationStatus);

  const partnerName = maritalData?.prenom_conjoint && maritalData?.nom_conjoint
    ? `${maritalData.prenom_conjoint} ${maritalData.nom_conjoint}`
    : undefined;

  const clientName = familyProfile?.prenom && familyProfile?.nom
    ? `${familyProfile.prenom} ${familyProfile.nom}`
    : 'Utilisateur';

  const ageFromBirthDate = (dateStr?: string) => dateStr
    ? Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : undefined;

  const secondaryLine = (dateStr?: string) => {
    if (!dateStr) return '—';
    const age = ageFromBirthDate(dateStr);
    return `${format(new Date(dateStr), 'dd/MM/yyyy')} · ${age} ans`;
  };

  const partsFiscales = calculerPartsFiscales({
    statutCouple: maritalData?.statut_couple as string | undefined,
    impositionDistincte: maritalData?.imposition_distincte,
    parentIsole: maritalData?.parent_isole,
    personneHandicapeeClient: familyProfile?.personne_handicapee,
    personneHandicapeeConjoint: maritalData?.personne_handicapee_conjoint,
    ancienCombattantClient: familyProfile?.ancien_combattant,
    ancienCombattantConjoint: maritalData?.ancien_combattant_conjoint,
    enfants: familyLinks
      .filter(link => link.lien_familial === 'Enfant')
      .map(link => ({ fiscalementACharge: !!link.fiscalement_a_charge, handicap: !!link.handicap })),
  });

  const partsFiscalesDetail: string[] = [
    `${partsFiscales.partsBase} part${partsFiscales.partsBase > 1 ? 's' : ''} (${partsFiscales.partsBase === 2 ? 'couple' : 'personne seule'})`,
  ];
  if (partsFiscales.partsEnfants > 0) {
    partsFiscalesDetail.push(`+ ${partsFiscales.partsEnfants} part${partsFiscales.partsEnfants > 1 ? 's' : ''} (${partsFiscales.nombreEnfantsFiscalementACharge} enfant${partsFiscales.nombreEnfantsFiscalementACharge > 1 ? 's' : ''} à charge)`);
  }
  if (partsFiscales.majorationParentIsole > 0) {
    partsFiscalesDetail.push(`+ ${partsFiscales.majorationParentIsole} part (parent isolé)`);
  }
  if (partsFiscales.majorationInvalidite > 0) {
    partsFiscalesDetail.push(`+ ${partsFiscales.majorationInvalidite} part (invalidité)`);
  }
  if (partsFiscales.majorationAncienCombattant > 0) {
    partsFiscalesDetail.push(`+ ${partsFiscales.majorationAncienCombattant} part (ancien combattant)`);
  }

  // Full-screen edit view (fiche client uniquement — partenaire/relation vivent désormais sur leur propre page)
  if (editView === 'client') {
    return (
      <div className="min-h-screen bg-white">
        <div className="w-full mx-auto px-4 sm:px-6 pt-8">
          <button
            onClick={() => setEditView(null)}
            className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" strokeWidth={1.5} />
            Retour
          </button>
        </div>

        <div className="w-full mx-auto px-4 sm:px-6 pt-6 pb-8">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 bg-muted">
              <User className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground leading-tight">
                {clientName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Fiche personnelle</p>
            </div>
          </div>
        </div>

        <div className="w-full mx-auto px-4 sm:px-6 pb-12">
          <FicheClientForm onSuccess={() => {
            setEditView(null);
            refetchProfile();
          }} />
        </div>
      </div>
    );
  }

  const regimeText = (() => {
    if (!hasPartner) return '';
    let text = relationStatus;
    const startDateStr = relationStatus === 'Marié(e)' ? maritalData?.date_mariage
      : relationStatus === 'Pacsé(e)' ? maritalData?.date_pacs
      : undefined;
    if (startDateStr) {
      text += ` depuis ${new Date(startDateStr).getFullYear()}`;
    }
    const regimeLabel = relationStatus === 'Marié(e)' ? maritalData?.regime_matrimonial
      : relationStatus === 'Pacsé(e)' ? maritalData?.convention_pacs
      : undefined;
    if (regimeLabel) {
      text += ` · ${regimeLabel}`;
    }
    return text;
  })();

  const renderContent = () => {
    switch (activeTab) {
      case 'ma-famille':
        return (
          <div className="space-y-5">
            {/* Bande 1 — Identité */}
            <div className={CARD_CLASS} style={CARD_STYLE}>
              <div className="flex flex-col sm:flex-row">
                <div
                  className="flex-1 flex items-center gap-4 cursor-pointer"
                  onClick={() => setEditView('client')}
                >
                  <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#dde8f7' }}>
                    <span className="text-sm font-medium" style={{ color: '#17335c' }}>
                      {getInitials(familyProfile?.prenom, familyProfile?.nom)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[12px]" style={{ color: LABEL_COLOR }}>Client 1</p>
                    <p className="text-[15px] font-medium" style={{ color: TEXT_COLOR }}>{clientName}</p>
                    <p className="text-[13px]" style={{ color: LABEL_COLOR, fontVariantNumeric: 'tabular-nums' }}>
                      {secondaryLine(familyProfile?.date_naissance)}
                    </p>
                  </div>
                </div>

                <div className="sm:border-l mt-6 sm:mt-0 pt-6 sm:pt-0 sm:pl-8" style={{ borderColor: DIVIDER_COLOR }}>
                  {hasPartner ? (
                    <div
                      className="flex-1 flex items-center gap-4 cursor-pointer"
                      onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                    >
                      <div className="h-12 w-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#f4e4fb' }}>
                        <span className="text-sm font-medium" style={{ color: '#5c3170' }}>
                          {getInitials(maritalData?.prenom_conjoint, maritalData?.nom_conjoint)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[12px]" style={{ color: LABEL_COLOR }}>Client 2</p>
                        <p className="text-[15px] font-medium" style={{ color: TEXT_COLOR }}>{partnerName || 'Partenaire'}</p>
                        <p className="text-[13px]" style={{ color: LABEL_COLOR, fontVariantNumeric: 'tabular-nums' }}>
                          {secondaryLine(maritalData?.date_naissance_conjoint)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <p className="text-[12px]" style={{ color: LABEL_COLOR }}>Client 2</p>
                      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: TEXT_COLOR }}>
                        <input
                          type="checkbox"
                          checked={isSingle}
                          onChange={(e) => handleToggleSingle(e.target.checked)}
                          className="h-4 w-4 rounded border-border"
                        />
                        Célibataire (sans partenaire)
                      </label>
                      {!isSingle && (
                        <button
                          onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                          className="inline-flex items-center gap-2 text-sm rounded-md px-3 py-2 w-fit border hover:bg-black/[0.02] transition-colors"
                          style={{ borderColor: '#e2e0da', color: TEXT_COLOR }}
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un partenaire
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bande 2 — Régime matrimonial */}
            {hasPartner && (
              <div className={CARD_CLASS} style={CARD_STYLE}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[12px]" style={{ color: LABEL_COLOR }}>Régime matrimonial</p>
                    <p className="text-[14px] mt-1" style={{ color: TEXT_COLOR }}>{regimeText}</p>
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                    className="text-[13px] font-medium shrink-0 hover:opacity-80 transition-opacity"
                    style={{ color: '#4a6fa5' }}
                  >
                    Voir le détail →
                  </button>
                </div>
              </div>
            )}

            {/* Bande 3 — Liens familiaux */}
            <div className={CARD_CLASS} style={CARD_STYLE}>
              <p className="text-[12px] mb-4" style={{ color: LABEL_COLOR }}>Liens familiaux</p>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 min-w-0">
                  {familyLinks.length === 0 ? (
                    <p className="text-sm" style={{ color: LABEL_COLOR }}>Aucun lien enregistré</p>
                  ) : (
                    <table className="w-full text-[13px]">
                      <tbody>
                        {familyLinks.map(link => (
                          <tr key={link.id} className="border-b last:border-0" style={{ borderColor: '#f1f0ec' }}>
                            <td className="py-2 pr-4" style={{ color: TEXT_COLOR }}>
                              {link.prenom ? `${link.prenom} ${link.nom}` : link.nom}
                            </td>
                            <td className="py-2 text-right" style={{ color: LABEL_COLOR }}>
                              {link.lien_familial}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div
                  className="w-full md:w-[260px] shrink-0 md:border-l md:pl-6 flex items-center justify-center"
                  style={{ borderColor: DIVIDER_COLOR }}
                >
                  <FamilyMiniTree
                    familyProfile={familyProfile}
                    maritalStatus={maritalData}
                    familyLinks={familyLinks}
                    hasPartner={hasPartner}
                    onClick={() => setTreeDialogOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 'liens-familiaux':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Liens familiaux</CardTitle>
              <CardDescription>
                Gérez les membres de votre famille et leurs relations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LiensFamiliauxForm />
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#faf9f7', fontFamily: 'Inter, sans-serif' }}>
      <div className="p-[22px]">
        <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-medium tracking-tight" style={{ color: TEXT_COLOR }}>Famille</h2>
            <p className="text-sm" style={{ color: LABEL_COLOR }}>
              Gérez les informations et la composition de votre famille
            </p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-[14px] px-5 py-3 cursor-default" style={{ backgroundColor: '#eef3fb' }}>
                <p className="text-[12px]" style={{ color: '#4a6fa5' }}>Foyer fiscal</p>
                <p
                  className="mt-0.5"
                  style={{ color: '#17335c', fontSize: 28, fontWeight: 500, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}
                >
                  {partsFiscales.totalParts}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {partsFiscalesDetail.join(' ')} = {partsFiscales.totalParts} parts
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="mb-8 flex justify-start">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="rounded-full">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="rounded-full min-w-28">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="mt-6">
          {renderContent()}
        </div>
      </div>

      <Dialog open={treeDialogOpen} onOpenChange={setTreeDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Arbre familial</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh]">
            <FamilyTree
              familyProfile={familyProfile}
              maritalStatus={maritalData}
              familyMembers={familyLinks}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FamilleSection;
