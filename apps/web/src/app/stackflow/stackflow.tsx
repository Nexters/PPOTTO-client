'use client';

import '@stackflow/plugin-basic-ui/index.css';

import { AppScreen, basicUIPlugin } from '@stackflow/plugin-basic-ui';
import { historySyncPlugin } from '@stackflow/plugin-history-sync';
import { basicRendererPlugin } from '@stackflow/plugin-renderer-basic';
import { stackflow, type ActivityComponentType } from '@stackflow/react';

import { BoardPage } from '@/pages/board';
import { AnalysisLoadingPage } from '@/pages/analysis-loading';
import { LoginPage } from '@/pages/login';
import { OnboardingPage } from '@/pages/onboarding';
import { PhotoViewerPage } from '@/pages/photo-viewer';
import { RecapPage } from '@/pages/recap';
import { SettingsPage } from '@/pages/settings';
import { TermsDetailPage, TermsPage } from '@/pages/terms';

import { config } from './config';
import { observabilityPlugin } from './observability-plugin';

const LoginActivity: ActivityComponentType<'Login'> = () => {
  return (
    <AppScreen>
      <LoginPage />
    </AppScreen>
  );
};

const BoardActivity: ActivityComponentType<'Board'> = () => {
  return (
    <AppScreen>
      <BoardPage />
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

const TermsDetailActivity: ActivityComponentType<'TermsDetail'> = ({ params }) => (
  <AppScreen>
    <TermsDetailPage code={params.code === 'PRIVACY' ? 'PRIVACY' : 'TOS'} />
  </AppScreen>
);

const RecapActivity: ActivityComponentType<'Recap'> = ({ params }) => (
  <AppScreen>
    <RecapPage stickerId={params.stickerId} boardId={params.boardId} />
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

const AnalysisLoadingActivity: ActivityComponentType<'AnalysisLoading'> = () => (
  <AppScreen>
    <AnalysisLoadingPage />
  </AppScreen>
);

export const { Stack } = stackflow({
  config,
  components: {
    Login: LoginActivity,
    Onboarding: OnboardingActivity,
    Terms: TermsActivity,
    TermsDetail: TermsDetailActivity,
    Board: BoardActivity,
    Recap: RecapActivity,
    PhotoViewer: PhotoViewerActivity,
    Settings: SettingsActivity,
    AnalysisLoading: AnalysisLoadingActivity,
  },
  plugins: [
    basicRendererPlugin(),
    basicUIPlugin({
      theme: 'cupertino',
      backgroundColor: 'transparent',
      backgroundImage: 'none',
    }),
    historySyncPlugin({ config, fallbackActivity: () => 'Login' }),
    observabilityPlugin,
  ],
});
