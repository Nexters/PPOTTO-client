'use client';

import '@stackflow/plugin-basic-ui/index.css';

import { AppScreen, basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { stackflow, useFlow, type ActivityComponentType } from '@stackflow/react';

import { BoardPage } from '@/pages/board';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { RecapPage } from '@/pages/recap';
import { SettingsPage } from '@/pages/settings';
import { TermsPage } from '@/pages/terms';
import { useBridge } from '@/shared/lib/bridge';

import { config } from './config';

const tempButton = 'rounded-12 bg-gray-900 px-4 py-2 text-body-04 text-gray-50';

const LoginActivity: ActivityComponentType<'Login'> = () => {
  const { push } = useFlow();
  return (
    <AppScreen>
      <LoginPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center">
        <button className={tempButton} onClick={() => push('Board', {})}>
          보드로
        </button>
      </div>
    </AppScreen>
  );
};

const BoardActivity: ActivityComponentType<'Board'> = () => {
  const { push } = useFlow();
  const bridge = useBridge();
  return (
    <AppScreen>
      <BoardPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center gap-2">
        {/* TODO: 임시 디버그 버튼, 실제로는 보드의 스티커 클릭 시 해당 stickerId로 push('Recap', ...) 호출 */}
        <button
          className={tempButton}
          onClick={() => push('Recap', { stickerId: '01983f2b-1a2b-7c3d-8e4f-5a6b7c8d9e0f' })}
        >
          리캡 보기
        </button>
        <button className={tempButton} onClick={() => bridge.send('OPEN_PHOTO_SELECT')}>
          이미지 추가
        </button>
      </div>
    </AppScreen>
  );
};

const OnboardingActivity: ActivityComponentType<'Onboarding'> = () => (
  <AppScreen>
    <OnboardingPage />
  </AppScreen>
);

const TermsActivity: ActivityComponentType<'Terms'> = () => (
  <AppScreen>
    <TermsPage />
  </AppScreen>
);

const RecapActivity: ActivityComponentType<'Recap'> = ({ params }) => (
  <AppScreen>
    <RecapPage stickerId={params.stickerId} />
  </AppScreen>
);

const SettingsActivity: ActivityComponentType<'Settings'> = () => (
  <AppScreen>
    <SettingsPage />
  </AppScreen>
);

export const { Stack } = stackflow({
  config,
  components: {
    Login: LoginActivity,
    Onboarding: OnboardingActivity,
    Terms: TermsActivity,
    Board: BoardActivity,
    Recap: RecapActivity,
    Settings: SettingsActivity,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({ theme: 'cupertino' }),
    historySyncPlugin({ config, fallbackActivity: () => 'Login' }),
  ],
});
