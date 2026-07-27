import * as AppleAuthentication from 'expo-apple-authentication';

export async function signInWithApple(): Promise<AppleAuthentication.AppleAuthenticationCredential> {
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('이 기기는 Apple 로그인을 지원하지 않아요.');
  }

  return AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
}
