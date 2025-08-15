import React, { useMemo, useState, useCallback } from 'react';
import Tree from 'react-d3-tree';
import { FamilyProfile, MaritalStatus, FamilyLink } from '@/services/familyService';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';

interface GenealogyTreeProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyMembers: FamilyLink[];
  onEditMember?: (member: FamilyLink) => void;
}

interface TreeNode {
  name: string;
  attributes?: {
    relation: string;
    birthDate?: string;
    isMain?: boolean;
    memberId?: string;
    memberType?: 'family' | 'main' | 'spouse';
  };
  children?: TreeNode[];
}

const getGenerationFromRelation = (relation: string): number => {
  switch (relation) {
    case 'Arrière grand-parent':
      return -3;
    case 'Grand-parent':
      return -2;
    case 'Parent':
    case 'Beau-parent':
      return -1;
    case 'Frère/Sœur':
    case 'Beau-frère/Belle-sœur':
    case 'Conjoint(e)':
      return 0;
    case 'Enfant':
      return 1;
    case 'Petit-enfant':
      return 2;
    case 'Arrière petit-enfant':
      return 3;
    default:
      return 0;
  }
};

export function GenealogyTree({ familyProfile, maritalStatus, familyMembers, onEditMember }: GenealogyTreeProps) {
  const [selectedMember, setSelectedMember] = useState<FamilyLink | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Créer une map pour retrouver les membres par ID
  const membersMap = useMemo(() => {
    return familyMembers.reduce((acc, member) => {
      if (member.id) acc[member.id] = member;
      return acc;
    }, {} as Record<string, FamilyLink>);
  }, [familyMembers]);

  const treeData = useMemo(() => {
    // Créer le nœud principal (utilisateur)
    const mainUserName = familyProfile 
      ? `${familyProfile.prenom || ''} ${familyProfile.nom || ''}`.trim() || 'Vous'
      : 'Vous';

    const rootNode: TreeNode = {
      name: mainUserName,
      attributes: {
        relation: 'Vous',
        birthDate: familyProfile?.date_naissance 
          ? format(new Date(familyProfile.date_naissance), 'dd/MM/yyyy')
          : undefined,
        isMain: true,
        memberType: 'main'
      },
      children: []
    };

    // Grouper les membres par génération
    const membersByGeneration = familyMembers.reduce((acc, member) => {
      const generation = getGenerationFromRelation(member.lien_familial);
      if (!acc[generation]) acc[generation] = [];
      acc[generation].push(member);
      return acc;
    }, {} as Record<number, FamilyLink[]>);

    // Ajouter le conjoint au même niveau
    if (maritalStatus && ['Marié(e)', 'Concubinage', 'Pacsé(e)'].includes(maritalStatus.statut_couple || '')) {
      const spouseName = `${maritalStatus.prenom_conjoint || ''} ${maritalStatus.nom_conjoint || ''}`.trim() || 'Conjoint(e)';
      if (!membersByGeneration[0]) membersByGeneration[0] = [];
      
      const spouseNode: TreeNode = {
        name: spouseName,
        attributes: {
          relation: 'Conjoint(e)',
          birthDate: maritalStatus.date_naissance_conjoint 
            ? format(new Date(maritalStatus.date_naissance_conjoint), 'dd/MM/yyyy')
            : undefined,
          memberType: 'spouse'
        }
      };
      
      // Ajouter le conjoint comme "enfant" du nœud principal pour l'affichage
      if (!rootNode.children) rootNode.children = [];
      rootNode.children.push(spouseNode);
    }

    // Ajouter les ascendants (parents, grands-parents, etc.)
    [-3, -2, -1].forEach(generation => {
      if (membersByGeneration[generation]) {
        membersByGeneration[generation].forEach(member => {
          const node: TreeNode = {
            name: `${member.prenom || ''} ${member.nom}`.trim(),
            attributes: {
              relation: member.lien_familial,
              birthDate: member.date_naissance 
                ? format(new Date(member.date_naissance), 'dd/MM/yyyy')
                : undefined,
              memberId: member.id,
              memberType: 'family'
            }
          };

          // Pour les ascendants, on les ajoute comme "parents" du nœud principal
          // En réalité, on va inverser la structure pour que les parents soient au-dessus
          if (generation === -1) {
            // Les parents deviennent les vrais parents du nœud principal
            const parentNode: TreeNode = {
              name: node.name,
              attributes: node.attributes,
              children: [rootNode]
            };
            // On remplace rootNode par parentNode temporairement
          }
        });
      }
    });

    // Ajouter les descendants (enfants, petits-enfants, etc.)
    [1, 2, 3].forEach(generation => {
      if (membersByGeneration[generation]) {
        if (!rootNode.children) rootNode.children = [];
        
        membersByGeneration[generation].forEach(member => {
          const node: TreeNode = {
            name: `${member.prenom || ''} ${member.nom}`.trim(),
            attributes: {
              relation: member.lien_familial,
              birthDate: member.date_naissance 
                ? format(new Date(member.date_naissance), 'dd/MM/yyyy')
                : undefined,
              memberId: member.id,
              memberType: 'family'
            }
          };
          
          rootNode.children!.push(node);
        });
      }
    });

    // Ajouter les frères et sœurs comme enfants du même parent
    if (membersByGeneration[0]) {
      membersByGeneration[0].forEach(member => {
        if (member.lien_familial === 'Frère/Sœur' || member.lien_familial === 'Beau-frère/Belle-sœur') {
          const node: TreeNode = {
            name: `${member.prenom || ''} ${member.nom}`.trim(),
            attributes: {
              relation: member.lien_familial,
              birthDate: member.date_naissance 
                ? format(new Date(member.date_naissance), 'dd/MM/yyyy')
                : undefined,
              memberId: member.id,
              memberType: 'family'
            }
          };
          
          if (!rootNode.children) rootNode.children = [];
          rootNode.children.push(node);
        }
      });
    }

    return rootNode;
  }, [familyProfile, maritalStatus, familyMembers]);

  const handleNodeClick = useCallback((nodeData: any) => {
    const data = nodeData?.data;
    const attributes = data?.attributes;
    if (attributes?.memberType === 'family' && attributes.memberId) {
      const member = membersMap[attributes.memberId];
      if (member) {
        setSelectedMember(member);
        setIsSheetOpen(true);
      }
    }
  }, [membersMap]);

  const CustomNodeElement = ({ nodeData }: { nodeData: any }) => {
    const data = nodeData?.data || {};
    const { name = 'Unknown', attributes = {} } = data;
    const isMain = attributes?.isMain;
    const isClickable = attributes?.memberType === 'family';

    return (
      <g>
        <foreignObject 
          width="160" 
          height="80" 
          x="-80" 
          y="-40"
          className={isClickable ? 'cursor-pointer' : ''}
          onClick={() => isClickable && handleNodeClick(nodeData)}
        >
          <Card className={`w-full h-full ${isMain ? 'border-primary bg-primary/5' : 'border-border'} ${isClickable ? 'hover:shadow-lg transition-shadow' : ''}`}>
            <CardContent className="p-2 flex flex-col justify-center h-full text-center">
              <div className="text-xs font-medium truncate text-foreground">
                {name}
              </div>
              {attributes?.relation && (
                <div className="text-xs text-muted-foreground">
                  {attributes.relation}
                </div>
              )}
              {attributes?.birthDate && (
                <div className="text-xs text-muted-foreground">
                  {attributes.birthDate}
                </div>
              )}
            </CardContent>
          </Card>
        </foreignObject>
      </g>
    );
  };

  if (!familyProfile && familyMembers.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <div className="text-lg">👥</div>
        <p>Ajoutez des membres de famille pour voir l'arbre généalogique</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-[600px] bg-background rounded-lg border">
        <Tree
          data={treeData}
          orientation="vertical"
          pathFunc="step"
          translate={{ x: 400, y: 100 }}
          zoom={0.8}
          scaleExtent={{ min: 0.3, max: 2 }}
          nodeSize={{ x: 180, y: 120 }}
          renderCustomNodeElement={(rd3tProps) => 
            <CustomNodeElement nodeData={rd3tProps} />
          }
        />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Informations du membre</SheetTitle>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom complet</label>
                <p className="text-sm">{`${selectedMember.prenom || ''} ${selectedMember.nom}`.trim()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Lien de parenté</label>
                <p className="text-sm">{selectedMember.lien_familial}</p>
              </div>
              {selectedMember.date_naissance && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                  <p className="text-sm">{format(new Date(selectedMember.date_naissance), 'dd/MM/yyyy')}</p>
                </div>
              )}
              {selectedMember.est_decede && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut</label>
                  <p className="text-sm text-destructive">Décédé(e)</p>
                  {selectedMember.date_deces && (
                    <p className="text-sm text-muted-foreground">
                      Le {format(new Date(selectedMember.date_deces), 'dd/MM/yyyy')}
                    </p>
                  )}
                </div>
              )}
              {onEditMember && (
                <button 
                  className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  onClick={() => {
                    onEditMember(selectedMember);
                    setIsSheetOpen(false);
                  }}
                >
                  Modifier
                </button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}