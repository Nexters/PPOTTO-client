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
