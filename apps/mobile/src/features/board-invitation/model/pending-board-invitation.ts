import * as SecureStore from 'expo-secure-store';

const PENDING_BOARD_INVITATION_KEY = 'ppotto.pending-board-invitation';
const PENDING_BOARD_INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const BOARD_INVITATION_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export interface PendingBoardInvitation {
  code: string;
  receivedAt: number;
}

export async function savePendingBoardInvitation(code: string) {
  if (!BOARD_INVITATION_CODE_PATTERN.test(code)) {
    throw new Error('유효하지 않은 보드 초대 코드입니다.');
  }

  const invitation: PendingBoardInvitation = {
    code,
    receivedAt: Date.now(),
  };
  await SecureStore.setItemAsync(PENDING_BOARD_INVITATION_KEY, JSON.stringify(invitation));
}

export async function getPendingBoardInvitation(): Promise<PendingBoardInvitation | null> {
  const stored = await SecureStore.getItemAsync(PENDING_BOARD_INVITATION_KEY);
  if (!stored) return null;

  const invitation = parsePendingBoardInvitation(stored);
  if (!invitation || isExpired(invitation.receivedAt)) {
    await clearPendingBoardInvitation();
    return null;
  }

  return invitation;
}

export function clearPendingBoardInvitation() {
  return SecureStore.deleteItemAsync(PENDING_BOARD_INVITATION_KEY);
}

function parsePendingBoardInvitation(value: string): PendingBoardInvitation | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('code' in parsed) ||
      !('receivedAt' in parsed) ||
      typeof parsed.code !== 'string' ||
      !BOARD_INVITATION_CODE_PATTERN.test(parsed.code) ||
      typeof parsed.receivedAt !== 'number' ||
      !Number.isFinite(parsed.receivedAt)
    ) {
      return null;
    }

    return { code: parsed.code, receivedAt: parsed.receivedAt };
  } catch {
    return null;
  }
}

function isExpired(receivedAt: number) {
  const age = Date.now() - receivedAt;
  return age < 0 || age >= PENDING_BOARD_INVITATION_TTL_MS;
}
