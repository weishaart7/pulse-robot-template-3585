import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { FamilyTreeCards } from '@/components/famille/FamilyTreeCards';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { getInitials } from '@/lib/family/initials';
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

// Foyer panel — palette reprise du design "Section Famille" (Claude Design)
const FOYER_INK = '#1F3A4B';
const FOYER_LABEL = '#8a887f';
const FOYER_BODY = '#3a3934';
const FOYER_DIVIDER = '#efece3';
const FOYER_SOFT_BG = '#F9FDEE';

const FamilleSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ma-famille');
  const [editView, setEditView] = useState<EditView | null>(null);
  const [isSingle, setIsSingle] = useState(false);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, saveData: saveMaritalData } = useMaritalStatus();
  const { data: familyLinks = [], saving: savingLinks, addLink, updateLink } = useFamilyLinks();
  const memberDialogRef = useRef<FamilyMemberFormDialogHandle>(null);

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
      <div className="bg-white">
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
            {/* Foyer — identité + régime matrimonial dans un panneau unifié */}
            <div className="bg-white rounded-[4px] overflow-hidden shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr]">
                <div
                  className="flex items-center gap-2.5 cursor-pointer"
                  style={{ padding: '14px 18px' }}
                  onClick={() => setEditView('client')}
                >
                  <div className="h-8 w-8 rounded-[4px] flex items-center justify-center shrink-0" style={{ backgroundColor: FOYER_SOFT_BG }}>
                    <span className="text-[12px] font-semibold" style={{ color: FOYER_INK }}>
                      {getInitials(familyProfile?.prenom, familyProfile?.nom)}
                    </span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold" style={{ color: FOYER_INK }}>{clientName}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: FOYER_LABEL, fontVariantNumeric: 'tabular-nums' }}>
                      {secondaryLine(familyProfile?.date_naissance)}
                    </p>
                  </div>
                </div>

                <div className="hidden sm:block" style={{ backgroundColor: FOYER_DIVIDER }} />

                <div style={{ padding: '14px 18px' }}>
                  {hasPartner ? (
                    <div
                      className="flex items-center gap-2.5 cursor-pointer"
                      onClick={() => navigate('/dashboard/famille/conjoint')}
                    >
                      <div className="h-8 w-8 rounded-[4px] flex items-center justify-center shrink-0" style={{ backgroundColor: FOYER_SOFT_BG }}>
                        <span className="text-[12px] font-semibold" style={{ color: FOYER_INK }}>
                          {getInitials(maritalData?.prenom_conjoint, maritalData?.nom_conjoint)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold" style={{ color: FOYER_INK }}>{partnerName || 'Partenaire'}</p>
                        <p className="text-[11.5px] mt-0.5" style={{ color: FOYER_LABEL, fontVariantNumeric: 'tabular-nums' }}>
                          {secondaryLine(maritalData?.date_naissance_conjoint)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: FOYER_INK }}>
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
                          onClick={() => navigate('/dashboard/famille/conjoint')}
                          className="inline-flex items-center gap-2 text-sm rounded-[4px] px-3 py-2 w-fit border hover:bg-black/[0.02] transition-colors"
                          style={{ borderColor: '#e2e0da', color: FOYER_INK }}
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un partenaire
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {hasPartner && (
                <div
                  className="flex items-center justify-between gap-5 flex-wrap"
                  style={{ padding: '10px 18px', borderTop: `1px solid ${FOYER_DIVIDER}`, backgroundColor: FOYER_SOFT_BG }}
                >
                  <p className="text-[13px]" style={{ color: FOYER_BODY }}>{regimeText}</p>
                  <button
                    onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                    className="text-sm font-medium shrink-0 hover:opacity-70 transition-opacity"
                    style={{ color: '#000000' }}
                  >
                    Voir le détail →
                  </button>
                </div>
              )}
            </div>

            {/* Bande 3 — Arbre familial */}
            <div className="bg-white rounded-[4px] p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <p
                className="text-[10.5px] uppercase tracking-[0.11em] mb-6"
                style={{ color: FOYER_LABEL, fontFamily: "'JetBrains Mono', monospace" }}
              >
                Arbre familial
              </p>
              <FamilyTreeCards
                familyProfile={familyProfile}
                maritalStatus={maritalData}
                familyLinks={familyLinks}
                onSelectMain={() => setEditView('client')}
                onSelectSpouse={() => navigate('/dashboard/famille/conjoint')}
                onSelectMember={(member) => memberDialogRef.current?.openForEdit(member)}
              />
            </div>

            {/* Bande 4 — Liens familiaux (tableau) */}
            <div className={CARD_CLASS} style={CARD_STYLE}>
              <p className="text-[12px] mb-4" style={{ color: LABEL_COLOR }}>Liens familiaux</p>
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

            <FamilyMemberFormDialog
              ref={memberDialogRef}
              familyLinks={familyLinks}
              familyProfile={familyProfile}
              maritalStatus={maritalData}
              saving={savingLinks}
              addLink={addLink}
              updateLink={updateLink}
            />
          </div>
        );
      case 'liens-familiaux':
        return <LiensFamiliauxForm />;
      default:
        return null;
    }
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="p-[22px]">
        <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-[34px] font-bold" style={{ color: FOYER_INK, letterSpacing: '-0.02em' }}>Famille</h1>
            <p className="text-sm mt-1" style={{ color: LABEL_COLOR }}>
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
            <TabsList>
              {TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id}>
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
    </div>
  );
};

export default FamilleSection;
