import { bridge } from '@/shared/lib/bridge';

export type PostLoginDestination = { type: 'HOME' } | { type: 'BOARD_INVITATION'; code: string };

export async function getPostLoginDestination(): Promise<PostLoginDestination> {
  try {
    return await bridge.request('GET_POST_LOGIN_DESTINATION');
  } catch {
    return { type: 'HOME' };
  }
}

export async function clearPendingBoardInvitation() {
  try {
    await bridge.request('CLEAR_PENDING_BOARD_INVITATION');
  } catch {
    // 이 메시지를 모르는 구버전 앱에서도 참여 완료 이동은 유지
  }
}
