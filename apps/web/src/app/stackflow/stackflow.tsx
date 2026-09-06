'use client';

import '@stackflow/plugin-basic-ui/index.css';

import { AppScreen, basicUIPlugin } from '@stackflow/plugin-basic-ui';
import type { AnalyticsEvents } from '@ppotto/bridge';
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
import { track } from '@/shared/lib/bridge';
import { useTrackActivityView } from '@/shared/lib/use-track-activity-view';

import { androidBackPlugin, registerAndroidBackHandler } from './android-back';
import { config } from './config';
import { sentryPlugin } from './sentry-plugin';

function ScreenView({ name }: { name: AnalyticsEvents['screen_view']['screen_name'] }) {
  useTrackActivityView(true, 'screen_view', { screen_name: name });
  return null;
}

const LoginActivity: ActivityComponentType<'Login'> = () => {
  return (
    <AppScreen>
      <ScreenView name="login" />
      <LoginPage />
    </AppScreen>
  );
};

const BoardActivity: ActivityComponentType<'Board'> = () => {
  return (
    <AppScreen>
      <ScreenView name="board" />
      <BoardPage />
    </AppScreen>
  );
};

const OnboardingActivity: ActivityComponentType<'Onboarding'> = () => (
  <AppScreen>
    <ScreenView name="onboarding" />
    <OnboardingPage />
  </AppScreen>
);

const TermsActivity: ActivityComponentType<'Terms'> = () => (
  <AppScreen>
    <ScreenView name="terms" />
    <TermsPage />
  </AppScreen>
);

const TermsDetailActivity: ActivityComponentType<'TermsDetail'> = ({ params }) => (
  <AppScreen>
    <ScreenView name="terms_detail" />
    <TermsDetailPage code={params.code === 'PRIVACY' ? 'PRIVACY' : 'TOS'} />
  </AppScreen>
);

const RecapActivity: ActivityComponentType<'Recap'> = ({ params }) => (
  <AppScreen className="recap-app-screen">
    <ScreenView name="recap" />
    <RecapPage stickerId={params.stickerId} boardId={params.boardId} />
  </AppScreen>
);

const PhotoViewerActivity: ActivityComponentType<'PhotoViewer'> = ({ params }) => (
  <AppScreen>
    <ScreenView name="photo_viewer" />
    <PhotoViewerPage stickerId={params.stickerId} initialIndex={params.initialIndex} />
  </AppScreen>
);

const SettingsActivity: ActivityComponentType<'Settings'> = () => (
  <AppScreen>
    <ScreenView name="settings" />
    <SettingsPage />
  </AppScreen>
);

const AnalysisLoadingActivity: ActivityComponentType<'AnalysisLoading'> = () => (
  <AppScreen>
    <ScreenView name="analysis_loading" />
    <AnalysisLoadingPage />
  </AppScreen>
);

export const { Stack, actions } = stackflow({
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
    sentryPlugin,
    androidBackPlugin(),
  ],
});

// 안드로이드 하드웨어 뒤로가기(NAVIGATE_BACK) 수신 — 시트 닫기/스택 pop/앱 이탈 위임
if (typeof window !== 'undefined') {
  registerAndroidBackHandler(actions);
  if (process.env.NODE_ENV === 'development') track('webview_analytics_setup_test');
}
