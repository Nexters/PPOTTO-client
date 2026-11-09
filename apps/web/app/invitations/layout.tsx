import type { ReactNode } from 'react';

import { ToastProvider } from '@/shared/ui/common/Toast';

export default function BoardInvitationsLayout({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
