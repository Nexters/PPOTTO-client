'use client';

import '@stackflow/plugin-basic-ui/index.css';

import { AppScreen, basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { stackflow, useFlow, type ActivityComponentType } from '@stackflow/react';

import { BoardPage } from '@/pages/board';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { PhotoViewerPage } from '@/pages/photo-viewer';
import { RecapPage } from '@/pages/recap';
import { SettingsPage } from '@/pages/settings';
import { TermsPage } from '@/pages/terms';

import { config } from './config';

const tempButton = 'rounded-12 bg-gray-900 px-4 py-2 text-body-04 text-gray-50';

const LoginActivity: ActivityComponentType<'Login'> = () => {
  const { push } = useFlow();
  return (
    <AppScreen>
      <LoginPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center">
        <button
          className={tempButton}
          onClick={() => push('Board', { boardId: '01983f2a-3c4d-7e5f-a6b7-8c9d0e1f2a3b' })}
        >
          보드로
        </button>
      </div>
    </AppScreen>
  );
};

const BoardActivity: ActivityComponentType<'Board'> = ({ params }) => {
  return (
    <AppScreen>
      <BoardPage boardId={params.boardId} />
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

const PhotoViewerActivity: ActivityComponentType<'PhotoViewer'> = ({ params }) => (
  <AppScreen>
    <PhotoViewerPage stickerId={params.stickerId} initialIndex={params.initialIndex} />
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
    PhotoViewer: PhotoViewerActivity,
    Settings: SettingsActivity,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({ theme: 'cupertino' }),
    historySyncPlugin({ config, fallbackActivity: () => 'Login' }),
  ],
});
