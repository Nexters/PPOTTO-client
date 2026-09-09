declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (params: { redirectUri: string; state?: string }) => void;
      };
      Share: {
        uploadImage: (params: { file: File[] | FileList }) => Promise<{
          infos: { original: { url: string } };
        }>;
      };
    };
  }
}

export function initKakao() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || !window.Kakao || window.Kakao.isInitialized()) return;
  window.Kakao.init(key);
}

// 카카오 인가 페이지로 이동한다. 돌아올 때 redirectUri에 code가 붙는다.
export function authorizeWithKakao(redirectUri: string) {
  initKakao();
  if (!window.Kakao?.isInitialized()) throw new Error('카카오 SDK가 아직 준비되지 않았습니다.');
  window.Kakao.Auth.authorize({ redirectUri });
}
