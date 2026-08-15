import { cn } from '@/shared/lib/cn';

type BubbleProps = {
  content: string;
  direction: 'left' | 'right';
};

const tailPath = {
  left: 'M0.112417 20.1846C5.31242 20.9846 10.4458 18.1212 12.1124 16.2879C10.3945 12.1914 21.0003 2.24186 14.0003 2.24148C12.3817 2.24148 10.9993 -1.9986 5.11242 1.1846C5.09121 2.47144 5.11242 6.92582 5.11242 7.6842C5.11242 18.1842 -0.887583 19.5813 0.112417 20.1846Z',
  right:
    'M16.3048 20.1846C11.1048 20.9846 5.97148 18.1212 4.30482 16.2879C6.02269 12.1914 -4.5831 2.24186 2.4169 2.24148C4.03551 2.24148 5.41797 -1.9986 11.3048 1.1846C11.326 2.47144 11.3048 6.92582 11.3048 7.6842C11.3048 18.1842 17.3048 19.5813 16.3048 20.1846Z',
};

export function Bubble({ content, direction }: BubbleProps) {
  return (
    <div className="relative inline-flex self-start">
      <div
        className={cn(
          'flex max-w-35 items-start self-stretch rounded-[18px]',
          'bg-gray-200 px-3 py-1.5',
          direction === 'right' && 'justify-end',
        )}
      >
        <span className="text-body-06 text-gray-900 wrap-break-word">{content}</span>
      </div>
      <div
        className={cn(
          'absolute flex flex-col items-start',
          direction === 'left' ? '-left-1.25 bottom-[-0.322px]' : '-right-1 bottom-[0.678px]',
        )}
      >
        <svg viewBox="0 0 17 21" className="h-[20.322px] w-[16.417px]">
          <path d={tailPath[direction]} fill="#EEEEEE" />
        </svg>
      </div>
    </div>
  );
}
