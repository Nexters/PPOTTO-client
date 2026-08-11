import { OnboardingArrow } from '@ppotto/assets';
import Image from 'next/image';
import type { ReactNode } from 'react';

const SelectPhotos = (
  <>
    <Image
      src="/onboarding/1-1.png"
      alt=""
      width={583}
      height={669}
      priority
      className="absolute top-0 left-[10%] h-auto w-[40%]"
    />
    <div className="absolute top-[50%] left-[23%] aspect-[141/149] w-[30%]">
      <OnboardingArrow width="100%" height="100%" />
    </div>
    <Image
      src="/onboarding/1-2.png"
      alt=""
      width={566}
      height={810}
      priority
      className="absolute top-[35%] left-[51%] h-auto w-[40%]"
    />
  </>
);

const ThemeRecap = (
  <Image
    src="/onboarding/2-1.png"
    alt=""
    width={1440}
    height={1304}
    className="absolute inset-0 m-auto h-auto w-full"
  />
);

const LongPress = (
  <>
    <Image
      src="/onboarding/3-2.png"
      alt=""
      width={1046}
      height={321}
      // ponytail: 에셋이 검은 글자라 배경에 묻힌다. 흰색으로 다시 export하면 invert를 지운다.
      className="absolute top-[52%] left-[16%] h-auto w-[68%] invert"
    />
    <Image
      src="/onboarding/3-1.png"
      alt=""
      width={761}
      height={201}
      className="absolute top-[36%] left-[38%] h-auto w-[50%]"
    />
  </>
);

const DecorateBoard = (
  <Image
    src="/onboarding/4-1.png"
    alt=""
    width={1440}
    height={1304}
    className="absolute inset-0 m-auto h-auto w-full"
  />
);

type OnboardingSlide = {
  title: string;
  illustration: ReactNode;
};

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  { title: '최근 사진 100장을 올리고\n테마 스티커를 만드세요', illustration: SelectPhotos },
  { title: '스티커를 누르면\n추억을 돌아볼 수 있어요', illustration: ThemeRecap },
  { title: '3초간 꾹 눌러서\n스티커를 관리하세요', illustration: LongPress },
  { title: '스티커 보드를 자유롭게\n꾸미고 자랑하세요', illustration: DecorateBoard },
];
