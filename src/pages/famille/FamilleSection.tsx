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

// Foyer panel — tokens design system (texte/accent), fond blanc
const FONT_STACK = "'Segoe UI', SegoeUI, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const FOYER_INK = '#262626';       // text.inverse — titres, noms
const FOYER_LABEL = '#616161';     // text.primary — labels secondaires
const FOYER_BODY = '#262626';      // text.inverse — corps de texte
const FOYER_SOFT_BG = 'rgba(155, 240, 11, 0.14)'; // teinte de surface.raised (#9bf00b)
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bf00b] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

// Couleur de la carte (survol + bordure par défaut) selon le sexe renseigné (civilité)
const genderAccent = (civility?: string) => {
  const c = civility?.trim();
  if (c === 'M' || c === 'M.') {
    return { accent: '#b6dcfe', textOnAccent: FOYER_INK, mutedOnAccent: FOYER_LABEL };
  }
  if (c === 'Mme' || c === 'Mlle') {
    return { accent: '#dec0f1', textOnAccent: FOYER_INK, mutedOnAccent: FOYER_LABEL };
  }
  return { accent: '#000000', textOnAccent: '#FFFFFF', mutedOnAccent: 'rgba(255,255,255,0.7)' };
};

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
      <div className="bg-white" style={{ fontFamily: FONT_STACK }}>
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
            <div className="h-14 w-14 rounded-[50px] flex items-center justify-center shrink-0" style={{ backgroundColor: FOYER_SOFT_BG }}>
              <User className="h-6 w-6" style={{ color: FOYER_INK }} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight leading-tight" style={{ color: FOYER_INK }}>
                {clientName}
              </h1>
              <p className="text-[13px] mt-1" style={{ color: FOYER_LABEL }}>Fiche personnelle</p>
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
                className="w-full sm:w-[300px] rounded-[4px] border cursor-pointer"
                {...genderAccent(familyProfile?.civility)}
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
                    className="rounded-[4px] shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)] border-0 p-6"
                    titleCss={{ color: FOYER_INK, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                    descClass="pt-4 text-[13px] text-[#616161]"
                    bioClass="text-[13px] leading-relaxed text-[#616161]"
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
                    className="rounded-[4px] p-6"
                    titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                    descClass="pt-4 text-[13px]"
                    bioClass="text-[13px] leading-relaxed"
                  />
                }
              />

              {hasPartner ? (
                <RevealCardContainer
                  className="w-full sm:w-[300px] rounded-[4px] border cursor-pointer"
                  {...genderAccent(maritalData?.civilite_conjoint)}
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
                      className="rounded-[4px] shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)] border-0 p-6"
                      titleCss={{ color: FOYER_INK, fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                      descClass="pt-4 text-[13px] text-[#616161]"
                      bioClass="text-[13px] leading-relaxed text-[#616161]"
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
                      className="rounded-[4px] p-6"
                      titleCss={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}
                      descClass="pt-4 text-[13px]"
                      bioClass="text-[13px] leading-relaxed"
                    />
                  }
                />
              ) : (
                <div className="w-full sm:w-[300px] rounded-[4px] border border-[#E5E5E5] bg-white shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)] p-6 flex flex-col gap-3 justify-center">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] uppercase tracking-[0.1em]" style={{ color: FOYER_LABEL, fontFamily: "'JetBrains Mono', monospace" }}>
                      Statut
                    </label>
                    <Select value={relationStatus || 'Célibataire'} onValueChange={handleStatutChange}>
                      <SelectTrigger size="lg" className="bg-muted border-transparent shadow-none rounded-[5px]">
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
              <div
                className="flex items-center justify-between gap-5 flex-wrap rounded-[4px] shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]"
                style={{ padding: '14px 18px', backgroundColor: FOYER_SOFT_BG }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-[50px] flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(155, 240, 11, 0.35)' }}>
                    <Scale className="w-4 h-4" style={{ color: FOYER_INK }} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10.5px] uppercase tracking-[0.11em]" style={{ color: FOYER_LABEL, fontFamily: "'JetBrains Mono', monospace" }}>
                      Régime matrimonial
                    </p>
                    <p className="text-[14px] font-semibold truncate" style={{ color: FOYER_INK }}>{regimeStatusLine}</p>
                    {regimeDetailLabel && (
                      <p className="text-[13px] mt-0.5 truncate" style={{ color: FOYER_BODY }}>{regimeDetailLabel}</p>
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
            <div className="bg-white rounded-[4px] p-6 shadow-[0_1px_3px_rgba(30,29,25,0.06),0_14px_34px_-24px_rgba(30,29,25,0.4)]">
              <p
                className="text-[11px] uppercase tracking-[0.11em] mb-6"
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
    <div className="min-h-screen bg-white p-6" style={{ fontFamily: FONT_STACK }}>
      <div className="mb-6">
        <h1 className="text-[28px] font-bold" style={{ color: FOYER_INK, letterSpacing: '-0.02em' }}>Famille</h1>
      </div>

      <div className="mb-6 flex justify-start">
        <SegmentedTabs tabs={TABS} value={activeTab} onValueChange={setActiveTab} />
      </div>

      {renderContent()}
    </div>
  );
};

export default FamilleSection;
