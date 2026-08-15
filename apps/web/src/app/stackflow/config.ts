import { defineConfig } from '@stackflow/config';

declare module '@stackflow/config' {
  interface Register {
    Login: Record<string, never>;
    Onboarding: Record<string, never>;
    Terms: Record<string, never>;
    Board: Record<string, never>;
    Recap: { stickerId: string; boardId: string };
    PhotoViewer: { stickerId: string; initialIndex: string };
    Settings: Record<string, never>;
    AnalysisLoading: Record<string, never>;
  }
}

export const config = defineConfig({
  activities: [
    { name: 'Login', route: '/login' },
    { name: 'Onboarding', route: '/onboarding' },
    { name: 'Terms', route: '/terms' },
    { name: 'Board', route: '/board' },
    { name: 'Recap', route: '/recap' },
    { name: 'PhotoViewer', route: '/photo-viewer' },
    { name: 'Settings', route: '/settings' },
    { name: 'AnalysisLoading', route: '/analysis-loading' },
  ],
  transitionDuration: 300,
});
