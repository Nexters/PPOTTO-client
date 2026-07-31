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
import { bridge } from '@/shared/lib/bridge';

import { config } from './config';

const tempButton = 'rounded-12 bg-gray-900 px-4 py-2 text-body-04 text-gray-50';

const LoginActivity: ActivityComponentType<'Login'> = () => (
  <AppScreen>
    <LoginPage />
  </AppScreen>
);

const BoardActivity: ActivityComponentType<'Board'> = () => {
  const { push } = useFlow();
  return (
    <AppScreen>
      <BoardPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center gap-2">
        <button className={tempButton} onClick={() => push('Recap', {})}>
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

const RecapActivity: ActivityComponentType<'Recap'> = () => (
  <AppScreen>
    <RecapPage />
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
