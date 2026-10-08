'use client';

// Lightweight windowing for long feeds (spec §23: virtualize long activity feeds).

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  className?: string;
  renderItem: (item: T, index: number) => ReactNode;
}

export function VirtualList<T>({ items, itemHeight, overscan = 6, className, renderItem }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewportHeight(el.clientHeight));
    observer.observe(el);
    setViewportHeight(el.clientHeight);
    return () => observer.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + overscan);
  const visible = items.slice(start, end);

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      style={{ overflowY: 'auto', height: '100%', contain: 'strict' }}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        {visible.map((item, i) => {
          const index = start + i;
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                top: index * itemHeight,
                height: itemHeight,
                left: 0,
                right: 0,
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
