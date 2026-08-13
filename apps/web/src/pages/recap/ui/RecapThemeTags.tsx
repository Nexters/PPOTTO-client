'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { AnalysisPill } from '@/shared/ui/AnalysisPill';

import { balanceIntoRows } from '../model/balance-rows';

const GAP_PX = 8; // gap-2

type RecapThemeTagsProps = {
  tags: string[];
};

export function RecapThemeTags({ tags }: RecapThemeTagsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [rows, setRows] = useState<number[][]>([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const recalculate = () => {
      const widths = itemRefs.current.map((el) => el?.offsetWidth ?? 0);
      setRows(balanceIntoRows(widths, container.offsetWidth, GAP_PX));
    };

    recalculate();
    const observer = new ResizeObserver(recalculate);
    observer.observe(container);
    return () => observer.disconnect();
  }, [tags]);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <span className="text-caption-01 text-center text-gray-400 whitespace-nowrap">테마 분석</span>

      <div ref={containerRef} className="flex w-full flex-col items-center gap-2">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-2">
            {row.map((tagIndex) => {
              const tag = tags[tagIndex];
              return tag === undefined ? null : <AnalysisPill key={tag} content={tag} />;
            })}
          </div>
        ))}
      </div>

      {/* 화면엔 안 보이지만 항상 렌더링해서 각 태그의 실제 너비를 측정하는 전용 레이어 */}
      <div className="invisible absolute flex flex-nowrap gap-2" aria-hidden>
        {tags.map((tag, index) => (
          <AnalysisPill
            key={tag}
            content={tag}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
          />
        ))}
      </div>
    </div>
  );
}
