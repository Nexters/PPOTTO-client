import { login } from '@react-native-seoul/kakao-login';

export class KakaoLoginCancelledError extends Error {}

export async function signInWithKakao(): Promise<string> {
  try {
    const token = await login();
    return token.accessToken;
  } catch (error) {
    if (error instanceof Error && /cancel/i.test(error.message)) {
      throw new KakaoLoginCancelledError('사용자가 카카오 로그인을 취소했어요.');
    }
    throw error;
  }
}
