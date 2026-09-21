import { addBreadcrumb } from '@sentry/nextjs';

const CATEGORY = 'navigation.stack';

// 화면 스택 이동을 Sentry breadcrumb으로 남긴다.
export function addNavigationBreadcrumb(message: string, data?: Record<string, unknown>) {
  addBreadcrumb({ category: CATEGORY, level: 'info', message, ...(data ? { data } : {}) });
}
