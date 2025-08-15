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
           ['Marié(e)', 'Pacsé(e)', 'Concubinage'].includes(maritalStatus.statut_couple);
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
        value: 'Parent',
        label: 'Parent',
        enabled: true
      },
      {
        value: 'Frère/Sœur',
        label: 'Frère/Sœur',
        enabled: true
      },
      {
        value: 'Oncle/Tante',
        label: 'Oncle/Tante',
        enabled: true
      },
      {
        value: 'Tierce personne',
        label: 'Tierce personne',
        enabled: true
      }
    ];

    // Ajouter les liens conditionnels seulement s'ils sont disponibles
    if ((existingLinks['Enfant'] || []).length > 0) {
      links.splice(1, 0, {
        value: 'Petit-enfant',
        label: 'Petit-enfant',
        enabled: true
      });
    }

    if ((existingLinks['Petit-enfant'] || []).length > 0) {
      links.splice(2, 0, {
        value: 'Arrière petit-enfant',
        label: 'Arrière petit-enfant',
        enabled: true
      });
    }

    if ((existingLinks['Parent'] || []).length > 0) {
      const parentIndex = links.findIndex(link => link.value === 'Parent');
      links.splice(parentIndex + 1, 0, {
        value: 'Grand-parent',
        label: 'Grand-parent',
        enabled: true
      });
    }

    if ((existingLinks['Frère/Sœur'] || []).length > 0) {
      const siblingIndex = links.findIndex(link => link.value === 'Frère/Sœur');
      links.splice(siblingIndex + 1, 0, {
        value: 'Neveu/Nièce',
        label: 'Neveu/Nièce',
        enabled: true
      });
    }

    if ((existingLinks['Neveu/Nièce'] || []).length > 0) {
      const nephewIndex = links.findIndex(link => link.value === 'Neveu/Nièce');
      links.splice(nephewIndex + 1, 0, {
        value: 'Petit neveu/nièce',
        label: 'Petit neveu/nièce',
        enabled: true
      });
    }

    if ((existingLinks['Oncle/Tante'] || []).length > 0) {
      const uncleIndex = links.findIndex(link => link.value === 'Oncle/Tante');
      links.splice(uncleIndex + 1, 0, {
        value: 'Cousin/Cousine',
        label: 'Cousin/Cousine',
        enabled: true
      });
    }

    return links;
  }, [existingLinks]);

  const getParentOptions = (linkType: string) => {
    const options: { value: string; label: string }[] = [];

    // Always add user as default option
    options.push({ value: 'user', label: userDisplayName });

    // Add spouse if married/pacsed/concubinage
    if (isMarriedOrPacsed && spouseDisplayName) {
      options.push({ value: 'spouse', label: spouseDisplayName });
      
      // For "Enfant" link type, add combined parent option
      if (linkType === 'Enfant') {
        options.push({ 
          value: 'both_parents', 
          label: `${userDisplayName} & ${spouseDisplayName}` 
        });
      }
    }

    // Add existing family members based on link type
    switch (linkType) {
      case 'Petit-enfant':
        (existingLinks['Enfant'] || []).forEach(child => {
          const childName = `${child.prenom || ''} ${child.nom || ''}`.trim();
          if (child.id) {
            options.push({ value: child.id, label: childName });
          }
        });
        break;

      case 'Arrière petit-enfant':
        (existingLinks['Petit-enfant'] || []).forEach(grandchild => {
          const grandchildName = `${grandchild.prenom || ''} ${grandchild.nom || ''}`.trim();
          if (grandchild.id) {
            options.push({ value: grandchild.id, label: grandchildName });
          }
        });
        break;

      case 'Grand-parent':
        (existingLinks['Parent'] || []).forEach(parent => {
          const parentName = `${parent.prenom || ''} ${parent.nom || ''}`.trim();
          if (parent.id) {
            options.push({ value: parent.id, label: parentName });
          }
        });
        break;

      case 'Neveu/Nièce':
        (existingLinks['Frère/Sœur'] || []).forEach(sibling => {
          const siblingName = `${sibling.prenom || ''} ${sibling.nom || ''}`.trim();
          if (sibling.id) {
            options.push({ value: sibling.id, label: siblingName });
          }
        });
        break;

      case 'Petit neveu/nièce':
        (existingLinks['Neveu/Nièce'] || []).forEach(nephew => {
          const nephewName = `${nephew.prenom || ''} ${nephew.nom || ''}`.trim();
          if (nephew.id) {
            options.push({ value: nephew.id, label: nephewName });
          }
        });
        break;

      case 'Cousin/Cousine':
        (existingLinks['Oncle/Tante'] || []).forEach(uncle => {
          const uncleName = `${uncle.prenom || ''} ${uncle.nom || ''}`.trim();
          if (uncle.id) {
            options.push({ value: uncle.id, label: uncleName });
          }
        });
        break;
    }

    return options;
  };

  const getParentsForRenunciation = () => {
    const parents: { value: string; label: string }[] = [];
    
    parents.push({ value: 'user', label: userDisplayName });
    if (isMarriedOrPacsed && spouseDisplayName) {
      parents.push({ value: 'spouse', label: spouseDisplayName });
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