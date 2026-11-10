import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { getAccessToken } from '@/lib/auth-session';
import { AppBackground } from '@/shared/ui/AppBackground';

export function BoardInvitationEntryScreen() {
  const { code: codeParam } = useLocalSearchParams<{ code?: string | string[] }>();
  const code = normalizeInvitationCode(codeParam);

  useEffect(() => {
    let active = true;

    if (!code) {
      router.replace('/');
      return () => {
        active = false;
      };
    }

    void getAccessToken().then(
      (accessToken) => {
        if (!active) return;
        if (!accessToken) {
          router.replace('/');
          return;
        }
        router.replace({ pathname: '/board', params: { invitationCode: code } });
      },
      () => {
        if (active) router.replace('/');
      },
    );

    return () => {
      active = false;
    };
  }, [code]);

  return <AppBackground />;
}

function normalizeInvitationCode(code: string | string[] | undefined) {
  const value = Array.isArray(code) ? code[0] : code;
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z0-9]{6}$/.test(normalized) ? normalized : null;
}
