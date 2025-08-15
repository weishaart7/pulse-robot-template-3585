import React from 'react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { FamilyTreeFlow } from './FamilyTreeFlow';

interface FamilyTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
  onEditMember?: (member: FamilyLink) => void;
}

export function FamilyTree({
  familyProfile,
  maritalStatus,
  familyMembers,
  onEditMember
}: FamilyTreeProps) {
  return (
    <FamilyTreeFlow 
      familyProfile={familyProfile}
      maritalStatus={maritalStatus}
      familyMembers={familyMembers}
      onEditMember={onEditMember}
    />
  );
}