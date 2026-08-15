import { useFlow } from '@stackflow/react';
import { useEffect } from 'react';

import { termsApi } from '@/entities/terms/api/terms-api';

/**
 * 보드 진입 시(로그인 직후·자동로그인 모두) 필수 약관 미동의가 있으면 약관 페이지로 보낸다.
 * 조회 실패는 1회 재시도하고, 재시도도 실패하면 보드를 그대로 보여준다 —
 * 약관 확인 실패로 앱 사용을 막지 않는다.
 */
export function useTermsGate() {
  const { replace } = useFlow();

  useEffect(() => {
    let active = true;

    termsApi
      .list()
      .catch(() => termsApi.list())
      .then((terms) => {
        if (!active) return;
        if (terms.some((term) => term.isRequired && !term.agreed)) replace('Terms', {});
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [replace]);
}
