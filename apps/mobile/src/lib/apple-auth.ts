import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { CodedError } from 'expo-modules-core';

const CANCELED_ERROR_CODE = 'ERR_REQUEST_CANCELED';

export type AppleSignInCredential = {
  identityToken: string;
  authorizationCode: string;
  user: string;
  email: string | null;
  fullName: AppleAuthentication.AppleAuthenticationFullName | null;
  rawNonce: string;
};

export async function signInWithApple(): Promise<AppleSignInCredential | null> {
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('이 기기는 Apple 로그인을 지원하지 않아요.');
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    return {
      identityToken: credential.identityToken!,
      authorizationCode: credential.authorizationCode!,
      user: credential.user,
      email: credential.email,
      fullName: credential.fullName,
      rawNonce,
    };
  } catch (error) {
    if (error instanceof CodedError && error.code === CANCELED_ERROR_CODE) {
      return null;
    }
    throw error;
  }
}
