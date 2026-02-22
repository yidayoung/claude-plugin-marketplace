import { useState, useCallback } from 'react';

export function useHoverState() {
  const [hoveredItems, setHoveredItems] = useState<Set<string>>(new Set());

  const isHovered = useCallback((id: string) => hoveredItems.has(id), [hoveredItems]);

  const setHovered = useCallback((id: string, hovered: boolean) => {
    setHoveredItems(prev => {
      const newSet = new Set(prev);
      if (hovered) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  return { isHovered, setHovered };
}
