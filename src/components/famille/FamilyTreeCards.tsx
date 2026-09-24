import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { FamilyLink, FamilyProfile, MaritalStatus } from '@/services/familyService';
import { buildFamilyGraph, FamilyGraph, FamilyGraphNode } from '@/lib/family/buildFamilyGraph';
import { initialsFromFullName } from '@/lib/family/initials';
import { cn } from '@/lib/utils';

interface FamilyTreeCardsProps {
  familyProfile: FamilyProfile | null;
  maritalStatus: MaritalStatus | null;
  familyLinks: FamilyLink[];
  onSelectMain: () => void;
  onSelectSpouse: () => void;
  onSelectMember: (member: FamilyLink) => void;
}

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

// Libellé d'une ligne d'après les liens réellement présents (une même
// génération mêle par ex. parents et oncles/tantes, ou petits-enfants et
// neveux/nièces), plutôt qu'un nom de génération qui ne décrit qu'une partie.
const RELATION_PLURALS: Record<string, string> = {
  'Arrière grand-parent': 'Arrière-grands-parents',
  'Grand-parent': 'Grands-parents',
  'Parent': 'Parents',
  'Beau-parent': 'Beaux-parents',
  'Oncle/Tante': 'Oncles et tantes',
  'Frère/Sœur': 'Frères et sœurs',
  'Beau-frère/Belle-sœur': 'Beaux-frères et belles-sœurs',
  'Cousin/Cousine': 'Cousins',
  'Tierce personne': 'Tiers',
  'Enfant': 'Enfants',
  'Petit-enfant': 'Petits-enfants',
  'Neveu/Nièce': 'Neveux et nièces',
  'Arrière petit-enfant': 'Arrière-petits-enfants',
  'Petit neveu/nièce': 'Petits-neveux et nièces',
};

function generationLabels(members: FamilyGraphNode[]): string[] {
  const labels: string[] = [];
  if (members.some(m => m.isMain || m.isSpouse)) labels.push('Vous');
  members.forEach(m => {
    if (m.isMain || m.isSpouse) return;
    const label = RELATION_PLURALS[m.relation] ?? m.relation;
    if (!labels.includes(label)) labels.push(label);
  });
  return labels;
}

// ─── Disposition en deux branches ────────────────────────────────────────────
// Famille du client à gauche, famille du conjoint à droite, descendance du
// couple centrée dessous. Purement visuel : le graphe (buildFamilyGraph) et
// donc les liens utilisés par la succession ne changent pas.

type Side = 'user' | 'spouse' | 'center';

// Côté imposé par la nature du lien ; les autres héritent du nœud auquel ils sont reliés.
const FIXED_SIDE: Record<string, Side> = {
  'Beau-parent': 'spouse',
  'Beau-frère/Belle-sœur': 'spouse',
  'Enfant': 'center',
  'Petit-enfant': 'center',
  'Arrière petit-enfant': 'center',
  'Tierce personne': 'user',
};

function assignSides(graph: FamilyGraph): Map<string, Side> {
  const sides = new Map<string, Side>();
  graph.nodes.forEach(n => {
    if (n.isMain) sides.set(n.id, 'user');
    else if (n.isSpouse) sides.set(n.id, 'spouse');
    else if (FIXED_SIDE[n.relation]) sides.set(n.id, FIXED_SIDE[n.relation]);
    else if (n.relation === 'Parent') sides.set(n.id, n.originalData?.enfant_de === 'spouse' ? 'spouse' : 'user');
  });
  // Propagation le long des arêtes (fratrie ← parent, grand-parent → parent, neveu ← frère…).
  for (let pass = 0; pass < 6; pass++) {
    graph.edges.forEach(e => {
      if (e.id === 'edge-main-spouse') return;
      const a = sides.get(e.source);
      const b = sides.get(e.target);
      if (a && !b && a !== 'center') sides.set(e.target, a);
      if (b && !a && b !== 'center') sides.set(e.source, b);
    });
  }
  graph.nodes.forEach(n => { if (!sides.has(n.id)) sides.set(n.id, 'user'); });
  return sides;
}

// Plus le rang est petit, plus la carte est proche de l'axe central du couple.
const PROXIMITY: Record<string, number> = {
  'Parent': 0, 'Beau-parent': 0, 'Grand-parent': 0, 'Arrière grand-parent': 0,
  'Frère/Sœur': 1, 'Beau-frère/Belle-sœur': 1, 'Oncle/Tante': 1,
  'Cousin/Cousine': 2, 'Neveu/Nièce': 1, 'Petit neveu/nièce': 1, 'Tierce personne': 3,
};
const proximity = (n: FamilyGraphNode) => (n.isMain || n.isSpouse ? -1 : PROXIMITY[n.relation] ?? 2);

// ─── Carte ───────────────────────────────────────────────────────────────────

function MemberCard({
  node,
  onClick,
  cardRef,
}: {
  node: FamilyGraphNode;
  onClick: () => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  const isCouple = !!(node.isMain || node.isSpouse);
  const relationLabel = node.isMain ? 'Vous' : node.isSpouse ? 'Conjoint(e)' : node.relation;
  const secondaryLabel = node.isDeceased
    ? `${relationLabel} · †${node.deathYear ? ` ${node.deathYear}` : ''}`
    : relationLabel;
  const m = node.originalData;
  const flag = m && !m.est_decede && (m.handicap
    ? 'Handicap'
    : m.enfant_a_charge || m.fiscalement_a_charge ? 'À charge' : null);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={onClick}
      title={flag ? `${node.name} · ${flag}` : node.name}
      className={cn(
        'relative flex h-14 w-[188px] shrink-0 items-center gap-2.5 rounded-2xl px-3 text-left transition-colors duration-200',
        isCouple
          ? 'bg-foreground text-background shadow-whisper hover:bg-foreground/90'
          : 'bg-secondary text-foreground hover:bg-border',
        // Décédé : carte estompée mais toujours reliée à ses descendants
        // (qui viennent à la succession par représentation).
        node.isDeceased && 'bg-transparent shadow-[inset_0_0_0_1px_hsl(var(--input))] text-muted-foreground hover:bg-secondary',
        FOCUS_RING
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium',
          isCouple ? 'bg-background/15 text-background' : 'bg-background text-foreground',
          node.isDeceased && 'bg-secondary text-muted-foreground'
        )}
      >
        {initialsFromFullName(node.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium">{node.name}</span>
        <span className={cn('ds-eyebrow mt-0.5 block truncate !text-[10px]', isCouple ? 'text-background/60' : 'text-muted-foreground')}>
          {secondaryLabel}
        </span>
      </span>
      {flag && <span aria-label={flag} className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-spark" />}
    </button>
  );
}

// ─── Arbre ───────────────────────────────────────────────────────────────────

export function FamilyTreeCards({ familyProfile, maritalStatus, familyLinks, onSelectMain, onSelectSpouse, onSelectMember }: FamilyTreeCardsProps) {
  const graph = useMemo(
    () => buildFamilyGraph(familyProfile, maritalStatus, familyLinks),
    [familyProfile, maritalStatus, familyLinks]
  );
  const sides = useMemo(() => assignSides(graph), [graph]);

  const generations = useMemo(
    () => Array.from(new Set(graph.nodes.map(n => n.generation))).sort((a, b) => a - b),
    [graph]
  );
  const zone = (generation: number, side: Side) =>
    graph.nodes
      .filter(n => n.generation === generation && sides.get(n.id) === side)
      .sort((a, b) => proximity(a) - proximity(b));

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLButtonElement>());
  const cardRefSetters = useRef(new Map<string, (el: HTMLButtonElement | null) => void>());
  const [paths, setPaths] = useState<string[]>([]);

  const getCardRef = useCallback((id: string) => {
    if (!cardRefSetters.current.has(id)) {
      cardRefSetters.current.set(id, (el: HTMLButtonElement | null) => {
        if (el) cardEls.current.set(id, el);
        else cardEls.current.delete(id);
      });
    }
    return cardRefSetters.current.get(id)!;
  }, []);

  // Traits « généalogiques » : les parents d'un même groupe d'enfants sont
  // reliés entre eux, un trait unique descend de leur milieu jusqu'à une barre
  // horizontale d'où partent les enfants.
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const origin = container.getBoundingClientRect();
    const rect = (id: string) => {
      const el = cardEls.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left - origin.left, r: r.right - origin.left, t: r.top - origin.top, b: r.bottom - origin.top, cx: r.left - origin.left + r.width / 2, cy: r.top - origin.top + r.height / 2 };
    };
    const byId = new Map(graph.nodes.map(n => [n.id, n]));

    // Parents (génération supérieure) de chaque enfant.
    const parentsOf = new Map<string, Set<string>>();
    graph.edges.forEach(e => {
      const s = byId.get(e.source), t = byId.get(e.target);
      if (!s || !t || s.generation === t.generation) return;
      const [up, down] = s.generation < t.generation ? [s, t] : [t, s];
      if (!parentsOf.has(down.id)) parentsOf.set(down.id, new Set());
      parentsOf.get(down.id)!.add(up.id);
    });

    // Groupes d'enfants par ensemble de parents ; un ensemble inclus dans un
    // autre est fusionné (un frère rattaché à un seul parent rejoint la fratrie).
    const groups: { parents: Set<string>; children: string[] }[] = [];
    [...parentsOf.entries()]
      .sort((a, b) => b[1].size - a[1].size)
      .forEach(([child, parents]) => {
        const host = groups.find(g => [...parents].every(p => g.parents.has(p)));
        if (host) host.children.push(child);
        else groups.push({ parents: new Set(parents), children: [child] });
      });

    const d: string[] = [];
    const joined = new Set<string>();
    const joinPair = (a: string, b: string) => {
      const key = [a, b].sort().join('|');
      if (joined.has(key)) return;
      const ra = rect(a), rb = rect(b);
      if (!ra || !rb || Math.abs(ra.cy - rb.cy) > 2) return;
      const [left, right] = ra.l < rb.l ? [ra, rb] : [rb, ra];
      d.push(`M ${left.r} ${left.cy} H ${right.l}`);
      joined.add(key);
    };

    if (byId.has('spouse')) joinPair('main', 'spouse');

    groups.forEach(({ parents, children }) => {
      const pr = [...parents].map(rect).filter(Boolean) as NonNullable<ReturnType<typeof rect>>[];
      const cr = children.map(rect).filter(Boolean) as NonNullable<ReturnType<typeof rect>>[];
      if (!pr.length || !cr.length) return;
      const ps = [...parents];
      for (let i = 1; i < ps.length; i++) joinPair(ps[i - 1], ps[i]);

      // Départ : milieu du trait entre deux parents alignés, sinon bas de la carte.
      const x0 = pr.reduce((s, r) => s + r.cx, 0) / pr.length;
      const y0 = pr.length > 1 ? pr[0].cy : Math.max(...pr.map(r => r.b));
      const top = Math.min(...cr.map(r => r.t));
      const bar = top - 14;
      d.push(`M ${x0} ${y0} V ${bar}`);
      const xs = cr.map(r => r.cx).concat(x0);
      d.push(`M ${Math.min(...xs)} ${bar} H ${Math.max(...xs)}`);
      cr.forEach(r => d.push(`M ${r.cx} ${bar} V ${r.t}`));
    });

    setPaths(d);
  }, [graph]);

  useLayoutEffect(() => {
    measure();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);

  // À l'ouverture (téléphone notamment), on centre le défilement sur le couple.
  useLayoutEffect(() => {
    const scroller = scrollRef.current;
    const main = cardEls.current.get('main');
    if (!scroller || !main || scroller.scrollWidth <= scroller.clientWidth) return;
    const s = scroller.getBoundingClientRect(), m = main.getBoundingClientRect();
    scroller.scrollLeft += m.right - s.left - s.width / 2;
  }, [graph]);

  const handleSelect = (node: FamilyGraphNode) => {
    if (node.isMain) return onSelectMain();
    if (node.isSpouse) return onSelectSpouse();
    if (node.originalData) return onSelectMember(node.originalData);
  };
  const card = (node: FamilyGraphNode) => (
    <MemberCard key={node.id} node={node} onClick={() => handleSelect(node)} cardRef={getCardRef(node.id)} />
  );

  return (
    // Défilement horizontal de l'arbre entier : les traits, mesurés dans le
    // conteneur interne, restent alignés.
    <div ref={scrollRef} className="overflow-x-auto [scrollbar-width:thin]">
      <div
        ref={containerRef}
        className="relative grid w-full min-w-max grid-cols-[6rem_1fr_1fr] items-center gap-x-6 gap-y-10 py-2 md:gap-x-10"
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
          {paths.map((p, i) => (
            <path key={i} d={p} fill="none" stroke="hsl(var(--input))" strokeWidth={1.25} strokeLinejoin="round" />
          ))}
        </svg>

        {generations.map(generation => {
          const center = zone(generation, 'center');
          const left = zone(generation, 'user');
          const right = zone(generation, 'spouse');
          const rowNodes = [...left, ...center, ...right];
          return (
            <div key={generation} className="contents">
              <div
                className={cn(
                  'ds-eyebrow self-center text-left !text-[10px] leading-snug',
                  generation === 0 ? 'text-foreground' : 'text-ash'
                )}
              >
                {generationLabels(rowNodes).map(label => <span key={label} className="block">{label}</span>)}
              </div>
              {center.length > 0 && left.length === 0 && right.length === 0 ? (
                <div className="col-span-2 flex justify-center gap-4">{center.map(card)}</div>
              ) : (
                <>
                  {/* Branche client : de l'extérieur vers le centre. */}
                  <div className="flex flex-row-reverse justify-start gap-4">{left.map(card)}{center.map(card)}</div>
                  <div className="flex justify-start gap-4">{right.map(card)}</div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
