import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFamilyProfile, useMaritalStatus } from '@/hooks/useFamilyData';
import { FicheClientForm } from './components/FicheClientForm';
import { LiensFamiliauxForm } from './components/LiensFamiliauxForm';
import { getInitials } from '@/lib/family/initials';
import { ArrowLeft, ChevronRight, Scale } from 'lucide-react';
import profilHomme from '@/assets/Profil homme.png';
import profilFemme from '@/assets/Profil femme.png';

type EditView = 'client';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9bf00b] focus-visible:ring-offset-2 focus-visible:ring-offset-white';

const profileImage = (civility?: string) => (civility === 'Mme' || civility === 'Mlle' ? profilFemme : profilHomme);

const FamilleSection = () => {
  const navigate = useNavigate();
  const [editView, setEditView] = useState<EditView | null>(null);
  const { data: familyProfile, refetch: refetchProfile } = useFamilyProfile();
  const { data: maritalData, setStatutCouple } = useMaritalStatus();

  const relationStatus = (maritalData?.statut_couple as string) || '';
  const hasPartner = ['Concubinage', 'Pacsé(e)', 'Marié(e)'].includes(relationStatus);
  const isDivorcedOrWidowed = ['Divorcé(e)', 'Veuf/Veuve'].includes(relationStatus);

  const regimeTabLabel = relationStatus === 'Marié(e)' ? 'Régime matrimonial'
    : relationStatus === 'Pacsé(e)' ? 'PACS'
    : relationStatus === 'Concubinage' ? 'Concubinage'
    : 'Régime matrimonial';

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
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center shrink-0 text-white text-lg font-semibold"
              style={{ backgroundColor: '#006064' }}
            >
              {getInitials(familyProfile?.prenom, familyProfile?.nom)}
            </div>
            <div>
              <h1 className="font-playfair text-3xl font-light tracking-tight text-foreground">
                {clientName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Fiche personnelle · {secondaryLine(familyProfile?.date_naissance)}
              </p>
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

  return (
    <div className="p-6 space-y-5">
      {/* Foyer — identité */}
      <div className="flex flex-wrap gap-5">
        <div
          className="relative w-60 h-[420px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
          role="button"
          tabIndex={0}
          onClick={() => setEditView('client')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditView('client'); } }}
        >
          <img
            src={profileImage(familyProfile?.civility)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <p className="text-white text-[15px] font-semibold leading-tight">{clientName}</p>
            <p className="text-white/70 text-xs mt-1">{secondaryLine(familyProfile?.date_naissance)}</p>
            <p className="text-white/60 text-[13px] mt-2">{familyProfile?.profession || 'Vous'}</p>
          </div>
        </div>

        {hasPartner ? (
          <div
            className="relative w-60 h-[420px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/dashboard/famille/conjoint')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/dashboard/famille/conjoint'); } }}
          >
            <img
              src={profileImage(maritalData?.civilite_conjoint)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="text-white text-[15px] font-semibold leading-tight">{partnerName || 'Partenaire'}</p>
              <p className="text-white/70 text-xs mt-1">{secondaryLine(maritalData?.date_naissance_conjoint)}</p>
              <p className="text-white/60 text-[13px] mt-2">Conjoint(e)</p>
            </div>
          </div>
        ) : (
          <div className="w-60 h-[420px] shrink-0 rounded-2xl border bg-card shadow-sm p-6 flex flex-col gap-3 justify-center">
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
                className={`inline-flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide w-fit px-2.5 py-1 hover:opacity-85 transition-opacity duration-200 group ${FOCUS_RING}`}
                style={{ backgroundColor: '#9bf00d', color: '#006064' }}
              >
                <span className="underline-offset-2 decoration-2 group-hover:underline">Voir le détail</span>
                <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={3.5} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Régime matrimonial / PACS — carte distincte */}
      {hasPartner && (
        <div className="flex items-center justify-between gap-5 flex-wrap rounded-md border bg-card shadow-sm p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-[#006064]/10 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-[#006064]" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {regimeTabLabel}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">{regimeStatusLine}</p>
              {regimeDetailLabel && (
                <p className="text-sm mt-0.5 text-muted-foreground truncate">{regimeDetailLabel}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/famille/situation-matrimoniale')}
            className={`inline-flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide shrink-0 px-2.5 py-1 rounded-none hover:opacity-85 transition-opacity duration-200 group ${FOCUS_RING}`}
            style={{ backgroundColor: '#9bf00d', color: '#006064' }}
          >
            <span className="underline-offset-2 decoration-2 group-hover:underline">Voir le détail</span>
            <ChevronRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" strokeWidth={3.5} />
          </button>
        </div>
      )}

      <LiensFamiliauxForm onSelectMain={() => setEditView('client')} />
    </div>
  );
};

export default FamilleSection;
