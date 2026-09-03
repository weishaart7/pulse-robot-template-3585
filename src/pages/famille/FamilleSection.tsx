import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { SegmentedTabs } from '@/components/ui/segmented-tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilyProfile, useMaritalStatus, useFamilyLinks } from '@/hooks/useFamilyData';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { FamilyTreeCards } from '@/components/famille/FamilyTreeCards';
import { FamilyMemberFormDialog, FamilyMemberFormDialogHandle } from '@/components/family/FamilyMemberFormDialog';
import { IdentityCardBody, RevealCardContainer } from '@/components/ui/animated-profile-card';
import { getInitials } from '@/lib/family/initials';
import { User, ArrowLeft, ArrowRight, Scale } from 'lucide-react';

type EditView = 'client';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bf00b] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const FamilleSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('ma-famille');
  const [editView, setEditView] = useState<EditView | null>(null);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, setStatutCouple } = useMaritalStatus();
  const { data: familyLinks = [], saving: savingLinks, addLink, updateLink } = useFamilyLinks();
  const memberDialogRef = useRef<FamilyMemberFormDialogHandle>(null);

  const TABS = [
    { id: 'ma-famille', label: 'Ma famille' },
    { id: 'liens-familiaux', label: 'Liens familiaux' },
  ];

  const relationStatus = (maritalData?.statut_couple as string) || '';
  const hasPartner = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(relationStatus);
  const isDivorcedOrWidowed = ['Divorcé(e)', 'Veuf/Veuve'].includes(relationStatus);

  const handleStatutChange = async (statut: string) => {
    if (statut === 'Célibataire') {
      await setStatutCouple('Célibataire', { parent_isole: false });
    } else {
      await setStatutCouple(statut);
    }
  };

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
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-light tracking-tight text-foreground">
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

  const { regimeStatusLine, regimeDetailLabel } = (() => {
    if (!hasPartner) return { regimeStatusLine: '', regimeDetailLabel: '' };
    let statusLine = relationStatus;
    const startDateStr = relationStatus === 'Marié(e)' ? maritalData?.date_mariage
      : relationStatus === 'Pacsé(e)' ? maritalData?.date_pacs
      : undefined;
    if (startDateStr) {
      statusLine += ` depuis ${new Date(startDateStr).getFullYear()}`;
    }
    const detailLabel = relationStatus === 'Marié(e)' ? maritalData?.regime_matrimonial
      : relationStatus === 'Pacsé(e)' ? maritalData?.convention_pacs
      : undefined;
    return { regimeStatusLine: statusLine, regimeDetailLabel: detailLabel || '' };
  })();

  const renderContent = () => {
    switch (activeTab) {
      case 'ma-famille':
        return (
          <div className="space-y-5">
            {/* Foyer — identité */}
            <div className="flex flex-wrap gap-5">
              <RevealCardContainer
                className="w-full sm:w-[300px] rounded-md border cursor-pointer"
                role="button"
                tabIndex={0}
                onClick={() => setEditView('client')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditView('client'); } }}
                base={
                  <IdentityCardBody
                    fullName={clientName}
                    place={secondaryLine(familyProfile?.date_naissance)}
                    about={familyProfile?.profession || 'Vous'}
                    avatarUrl=""
                    avatarText={getInitials(familyProfile?.prenom, familyProfile?.nom)}
                    scheme="plain"
                    displayAvatar={false}
                    className="rounded-md shadow-sm border-0 p-6"
                    titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                    descClass="pt-4 text-[13px] text-muted-foreground"
                    bioClass="text-[13px] leading-relaxed text-muted-foreground"
                  />
                }
                overlay={
                  <IdentityCardBody
                    fullName={clientName}
                    place={secondaryLine(familyProfile?.date_naissance)}
                    about={familyProfile?.profession || 'Vous'}
                    avatarUrl=""
                    avatarText={getInitials(familyProfile?.prenom, familyProfile?.nom)}
                    scheme="accented"
                    displayAvatar
                    cardCss={{ backgroundColor: 'var(--accent-color)' }}
                    className="rounded-md p-6"
                    titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                    descClass="pt-4 text-[13px]"
                    bioClass="text-[13px] leading-relaxed"
                  />
                }
              />

              {hasPartner ? (
                <RevealCardContainer
                  className="w-full sm:w-[300px] rounded-md border cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/dashboard/famille/conjoint')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/famille/conjoint'); } }}
                  base={
                    <IdentityCardBody
                      fullName={partnerName || 'Partenaire'}
                      place={secondaryLine(maritalData?.date_naissance_conjoint)}
                      about="Conjoint(e)"
                      avatarUrl=""
                      avatarText={getInitials(maritalData?.prenom_conjoint, maritalData?.nom_conjoint)}
                      scheme="plain"
                      displayAvatar={false}
                      className="rounded-md shadow-sm border-0 p-6"
                      titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                      descClass="pt-4 text-[13px] text-muted-foreground"
                      bioClass="text-[13px] leading-relaxed text-muted-foreground"
                    />
                  }
                  overlay={
                    <IdentityCardBody
                      fullName={partnerName || 'Partenaire'}
                      place={secondaryLine(maritalData?.date_naissance_conjoint)}
                      about="Conjoint(e)"
                      avatarUrl=""
                      avatarText={getInitials(maritalData?.prenom_conjoint, maritalData?.nom_conjoint)}
                      scheme="accented"
                      displayAvatar
                      cardCss={{ backgroundColor: 'var(--accent-color)' }}
                      className="rounded-md p-6"
                      titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                      descClass="pt-4 text-[13px]"
                      bioClass="text-[13px] leading-relaxed"
                    />
                  }
                />
              ) : (
                <div className="w-full sm:w-[300px] rounded-md border bg-card shadow-sm p-6 flex flex-col gap-3 justify-center">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Statut
                    </label>
                    <Select value={relationStatus || 'Célibataire'} onValueChange={handleStatutChange}>
                      <SelectTrigger size="lg" className="bg-background border-border shadow-none rounded-md focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Célibataire">Célibataire</SelectItem>
                        <SelectItem value="Concubinage">Concubinage</SelectItem>
                        <SelectItem value="Pacsé(e)">Pacsé(e)</SelectItem>
                        <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                        <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                        <SelectItem value="Veuf/Veuve">Veuf/Veuve</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isDivorcedOrWidowed && (
                    <button
                      onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                      className={`inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide w-fit px-2.5 py-1 hover:opacity-85 transition-opacity duration-200 group ${FOCUS_RING}`}
                      style={{ backgroundColor: '#9bf00d', color: '#054b16' }}
                    >
                      <span className="underline-offset-2 decoration-2 group-hover:underline">Voir le détail</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Régime matrimonial / PACS — carte distincte */}
            {hasPartner && (
              <div className="flex items-center justify-between gap-5 flex-wrap rounded-md border bg-card shadow-sm p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Scale className="w-4 h-4 text-primary" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Régime matrimonial
                    </p>
                    <p className="text-sm font-semibold text-foreground truncate">{regimeStatusLine}</p>
                    {regimeDetailLabel && (
                      <p className="text-sm mt-0.5 text-muted-foreground truncate">{regimeDetailLabel}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
                  className={`inline-flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide shrink-0 px-2.5 py-1 rounded-none hover:opacity-85 transition-opacity duration-200 group ${FOCUS_RING}`}
                  style={{ backgroundColor: '#9bf00d', color: '#054b16' }}
                >
                  <span className="underline-offset-2 decoration-2 group-hover:underline">Voir le détail</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Bande 3 — Arbre familial */}
            <div className="rounded-md border bg-card shadow-sm p-6">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
                Arbre familial
              </p>
              <FamilyTreeCards
                familyProfile={familyProfile}
                maritalStatus={maritalData}
                familyLinks={familyLinks}
                onSelectMain={() => setEditView('client')}
                onSelectSpouse={() => navigate('/dashboard/famille/conjoint')}
                onSelectMember={(member) => memberDialogRef.current?.openForEdit(member)}
                onAddMember={() => memberDialogRef.current?.openForAdd()}
              />
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
    <div className="min-h-screen bg-white p-6">
      <div className="mb-6">
        <h1 className="font-playfair text-3xl font-light tracking-tight text-foreground">Famille</h1>
      </div>

      <div className="mb-6 flex justify-start">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
      </div>

      {renderContent()}
    </div>
  );
};

export default FamilleSection;
