import React from 'react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { Card, CardContent } from '@/components/ui/card';
import { Cross } from 'lucide-react';
import { format } from 'date-fns';
interface FamilyTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
}
const getRelationColor = (relation: string) => {
  const colors: Record<string, string> = {
    'Enfant': 'bg-green-500',
    'Petit-enfant': 'bg-green-400',
    'Arrière petit-enfant': 'bg-green-300',
    'Parent': 'bg-blue-600',
    'Grand-parent': 'bg-blue-500',
    'Arrière grand-parent': 'bg-blue-400',
    'Frère/Sœur': 'bg-orange-500',
    'Oncle/Tante': 'bg-purple-500',
    'Neveu/Nièce': 'bg-purple-400',
    'Cousin/Cousine': 'bg-purple-300',
    'Beau-parent': 'bg-indigo-500',
    'Beau-frère/Belle-sœur': 'bg-indigo-400',
    'Autre': 'bg-gray-500'
  };
  return colors[relation] || 'bg-gray-500';
};
const FamilyMemberCard = ({
  member,
  isMain = false,
  isSpouse = false
}: {
  member: any;
  isMain?: boolean;
  isSpouse?: boolean;
}) => {
  const bgColor = isMain ? 'bg-slate-700 text-white' : isSpouse ? 'bg-slate-600 text-white' : `${getRelationColor(member.relation)} text-white`;
  return <Card className={`${bgColor} border-none shadow-lg min-w-[140px] rounded-3xl`}>
      <CardContent className="p-4 text-center">
        <div className="font-medium text-sm">
          {member.prenom || member.name}
        </div>
        {member.dateNaissance && <div className="text-xs opacity-80 mt-1">
            {member.dateNaissance}
          </div>}
        {member.isDeceased && <Cross className="w-3 h-3 mx-auto mt-1 opacity-80" />}
      </CardContent>
    </Card>;
};
const organizeFamily = (familyProfile: FamilyProfile | null, maritalStatus: MaritalStatus | null, familyMembers: FamilyLink[]) => {
  const generations: Record<string, FamilyLink[]> = {
    grandParents: [],
    parents: [],
    siblings: [],
    children: [],
    grandChildren: [],
    others: []
  };
  familyMembers.forEach(member => {
    switch (member.lien_familial) {
      case 'Grand-parent':
      case 'Arrière grand-parent':
        generations.grandParents.push(member);
        break;
      case 'Parent':
      case 'Beau-parent':
        generations.parents.push(member);
        break;
      case 'Frère/Sœur':
      case 'Beau-frère/Belle-sœur':
        generations.siblings.push(member);
        break;
      case 'Enfant':
        generations.children.push(member);
        break;
      case 'Petit-enfant':
      case 'Arrière petit-enfant':
        generations.grandChildren.push(member);
        break;
      default:
        generations.others.push(member);
        break;
    }
  });
  return generations;
};
export function FamilyTree({
  familyProfile,
  maritalStatus,
  familyMembers
}: FamilyTreeProps) {
  const generations = organizeFamily(familyProfile, maritalStatus, familyMembers);
  const mainUser = familyProfile ? {
    name: `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous',
    prenom: familyProfile.prenom || 'Vous',
    dateNaissance: familyProfile.date_naissance ? format(new Date(familyProfile.date_naissance), 'dd/MM/yyyy') : null,
    isDeceased: false
  } : null;
  const spouse = maritalStatus && ['Marié(e)', 'Concubin(e)', 'Pacsé(e)'].includes(maritalStatus.statut_couple || '') ? {
    name: `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)',
    prenom: maritalStatus.prenom_conjoint || 'Conjoint(e)',
    dateNaissance: maritalStatus.date_naissance_conjoint ? format(new Date(maritalStatus.date_naissance_conjoint), 'dd/MM/yyyy') : null,
    isDeceased: false
  } : null;
  if (!mainUser && familyMembers.length === 0) {
    return <div className="text-center text-muted-foreground py-8">
        <div className="text-lg">👥</div>
        <p>Ajoutez des membres de famille pour voir l'arbre familial</p>
      </div>;
  }
  return <div className="w-full p-6 bg-gray-50 rounded-lg">
      
      
      {/* Grands-parents */}
      {generations.grandParents.length > 0 && <div className="flex justify-center gap-4 mb-6">
          {generations.grandParents.map((member, index) => <FamilyMemberCard key={`grandparent-${index}`} member={{
        ...member,
        prenom: member.prenom || member.nom,
        dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        relation: member.lien_familial
      }} />)}
        </div>}

      {/* Parents */}
      {generations.parents.length > 0 && <div className="flex justify-center gap-4 mb-6">
          {generations.parents.map((member, index) => <FamilyMemberCard key={`parent-${index}`} member={{
        ...member,
        prenom: member.prenom || member.nom,
        dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        relation: member.lien_familial
      }} />)}
        </div>}

      {/* Utilisateur principal et conjoint */}
      <div className="flex justify-center gap-4 mb-6">
        {spouse && <FamilyMemberCard member={spouse} isSpouse={true} />}
        {mainUser && <FamilyMemberCard member={mainUser} isMain={true} />}
      </div>

      {/* Frères et sœurs */}
      {generations.siblings.length > 0 && <div className="flex justify-center gap-4 mb-6">
          {generations.siblings.map((member, index) => <FamilyMemberCard key={`sibling-${index}`} member={{
        ...member,
        prenom: member.prenom || member.nom,
        dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        relation: member.lien_familial
      }} />)}
        </div>}

      {/* Enfants */}
      {generations.children.length > 0 && <div className="bg-gray-200 rounded-lg p-4 mx-auto max-w-2xl">
          <h4 className="text-center text-sm font-medium text-gray-700 mb-3">
            Enfants de {mainUser?.prenom || 'l\'utilisateur'}
          </h4>
          <div className="flex justify-center gap-4 flex-wrap">
            {generations.children.map((member, index) => <FamilyMemberCard key={`child-${index}`} member={{
          ...member,
          prenom: member.prenom || member.nom,
          dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
          relation: member.lien_familial
        }} />)}
          </div>
        </div>}

      {/* Petits-enfants */}
      {generations.grandChildren.length > 0 && <div className="flex justify-center gap-4 mt-6">
          {generations.grandChildren.map((member, index) => <FamilyMemberCard key={`grandchild-${index}`} member={{
        ...member,
        prenom: member.prenom || member.nom,
        dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        relation: member.lien_familial
      }} />)}
        </div>}

      {/* Autres membres */}
      {generations.others.length > 0 && <div className="flex justify-center gap-4 mt-6 flex-wrap">
          {generations.others.map((member, index) => <FamilyMemberCard key={`other-${index}`} member={{
        ...member,
        prenom: member.prenom || member.nom,
        dateNaissance: member.date_naissance ? format(new Date(member.date_naissance), 'dd/MM/yyyy') : null,
        relation: member.lien_familial
      }} />)}
        </div>}
    </div>;
}