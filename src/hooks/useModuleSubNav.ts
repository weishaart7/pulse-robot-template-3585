import { useEffect, useRef } from 'react';
import { useSubNav, type SubNavItem } from '@/contexts/SubNavContext';

export function useModuleSubNav(items: SubNavItem[], activeId: string, onSelect: (id: string) => void) {
  const { setSubNav, clearSubNav } = useSubNav();
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const itemsKey = items.map((item) => `${item.id}:${item.label}`).join('|');

  useEffect(() => {
    setSubNav(items, activeId, (id) => onSelectRef.current(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, activeId]);

  useEffect(() => () => clearSubNav(), [clearSubNav]);
}
