import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// 커스텀 타이포 토큰(text-body-03 등)을 twMerge가 텍스트 색상으로 오인해서
// 함께 쓰인 text-black 같은 색상 클래스를 지워버린다 — 폰트 크기 그룹으로 등록해 막는다
const isTypographyToken = (value: string) => /^(?:header|subtitle|body|caption)-\d{2}$/.test(value);

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [isTypographyToken] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
