import * as AppleAuthentication from 'expo-apple-authentication';
import { CodedError } from 'expo-modules-core';

const CANCELED_ERROR_CODE = 'ERR_REQUEST_CANCELED';

export async function signInWithApple(): Promise<AppleAuthentication.AppleAuthenticationCredential | null> {
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('이 기기는 Apple 로그인을 지원하지 않아요.');
  }

  try {
    return await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if (error instanceof CodedError && error.code === CANCELED_ERROR_CODE) {
      return null;
    }
    throw error;
  }
}
