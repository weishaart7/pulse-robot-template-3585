import { useMemo } from 'react';
import { FamilyLink } from '@/services/familyService';

export interface FamilyLinkOption {
  value: string;
  label: string;
  enabled: boolean;
}

export const useFamilyLinkLogic = (
  familyLinks: FamilyLink[],
  familyProfile: any,
  maritalStatus: any
) => {
  const userDisplayName = useMemo(() => {
    if (!familyProfile) return 'Utilisateur';
    return `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Utilisateur';
  }, [familyProfile]);

  const spouseDisplayName = useMemo(() => {
    if (!maritalStatus || !maritalStatus.statut_couple || maritalStatus.statut_couple === 'celibataire') {
      return null;
    }
    return `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint';
  }, [maritalStatus]);

  const isMarriedOrPacsed = useMemo(() => {
    return maritalStatus?.statut_couple && 
           ['marie', 'pacs'].includes(maritalStatus.statut_couple);
  }, [maritalStatus]);

  const existingLinks = useMemo(() => {
    return familyLinks.reduce((acc, link) => {
      if (!acc[link.lien_familial]) {
        acc[link.lien_familial] = [];
      }
      acc[link.lien_familial].push(link);
      return acc;
    }, {} as Record<string, FamilyLink[]>);
  }, [familyLinks]);

  const availableLinks = useMemo((): FamilyLinkOption[] => {
    const links: FamilyLinkOption[] = [
      {
        value: 'Enfant',
        label: 'Enfant',
        enabled: true
      },
      {
        value: 'Petit-enfant',
        label: 'Petit-enfant',
        enabled: (existingLinks['Enfant'] || []).length > 0
      },
      {
        value: 'Arrière petit-enfant',
        label: 'Arrière petit-enfant',
        enabled: (existingLinks['Petit-enfant'] || []).length > 0
      },
      {
        value: 'Parent',
        label: 'Parent',
        enabled: true
      },
      {
        value: 'Grand-parent',
        label: 'Grand-parent',
        enabled: (existingLinks['Parent'] || []).length > 0
      },
      {
        value: 'Frère/Sœur',
        label: 'Frère/Sœur',
        enabled: true
      },
      {
        value: 'Neveu/Nièce',
        label: 'Neveu/Nièce',
        enabled: (existingLinks['Frère/Sœur'] || []).length > 0
      },
      {
        value: 'Petit neveu/nièce',
        label: 'Petit neveu/nièce',
        enabled: (existingLinks['Neveu/Nièce'] || []).length > 0
      },
      {
        value: 'Oncle/Tante',
        label: 'Oncle/Tante',
        enabled: true
      },
      {
        value: 'Cousin/Cousine',
        label: 'Cousin/Cousine',
        enabled: (existingLinks['Oncle/Tante'] || []).length > 0
      },
      {
        value: 'Tierce personne',
        label: 'Tierce personne',
        enabled: true
      }
    ];

    return links;
  }, [existingLinks]);

  const getParentOptions = (linkType: string) => {
    const options: { value: string; label: string }[] = [];

    switch (linkType) {
      case 'Enfant':
      case 'Parent':
      case 'Frère/Sœur':
      case 'Oncle/Tante':
        options.push({ value: userDisplayName, label: userDisplayName });
        if (isMarriedOrPacsed && spouseDisplayName) {
          options.push({ value: spouseDisplayName, label: spouseDisplayName });
        }
        break;

      case 'Petit-enfant':
        (existingLinks['Enfant'] || []).forEach(child => {
          const childName = `${child.prenom || ''} ${child.nom || ''}`.trim();
          options.push({ value: childName, label: childName });
        });
        break;

      case 'Arrière petit-enfant':
        (existingLinks['Petit-enfant'] || []).forEach(grandchild => {
          const grandchildName = `${grandchild.prenom || ''} ${grandchild.nom || ''}`.trim();
          options.push({ value: grandchildName, label: grandchildName });
        });
        break;

      case 'Grand-parent':
        (existingLinks['Parent'] || []).forEach(parent => {
          const parentName = `${parent.prenom || ''} ${parent.nom || ''}`.trim();
          options.push({ value: parentName, label: parentName });
        });
        break;

      case 'Neveu/Nièce':
        (existingLinks['Frère/Sœur'] || []).forEach(sibling => {
          const siblingName = `${sibling.prenom || ''} ${sibling.nom || ''}`.trim();
          options.push({ value: siblingName, label: siblingName });
        });
        break;

      case 'Petit neveu/nièce':
        (existingLinks['Neveu/Nièce'] || []).forEach(nephew => {
          const nephewName = `${nephew.prenom || ''} ${nephew.nom || ''}`.trim();
          options.push({ value: nephewName, label: nephewName });
        });
        break;

      case 'Cousin/Cousine':
        (existingLinks['Oncle/Tante'] || []).forEach(uncle => {
          const uncleName = `${uncle.prenom || ''} ${uncle.nom || ''}`.trim();
          options.push({ value: uncleName, label: uncleName });
        });
        break;
    }

    return options;
  };

  const getParentsForRenunciation = () => {
    const parents: { value: string; label: string }[] = [];
    
    parents.push({ value: userDisplayName, label: userDisplayName });
    if (isMarriedOrPacsed && spouseDisplayName) {
      parents.push({ value: spouseDisplayName, label: spouseDisplayName });
    }

    return parents;
  };

  return {
    availableLinks,
    getParentOptions,
    getParentsForRenunciation,
    userDisplayName,
    spouseDisplayName,
    isMarriedOrPacsed
  };
};