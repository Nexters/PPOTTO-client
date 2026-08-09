import { command, defineContract, request } from 'webview-bridge-kit';
import { z } from 'zod';

// POST /auth/login 응답 중 웹 라우팅에 필요한 부분. null = 사용자가 로그인 취소
const loginResponse = z
  .object({
    isNewUser: z.boolean(),
    pendingTerms: z.array(
      z.object({
        id: z.string(),
        code: z.string(),
        version: z.string(),
        isRequired: z.boolean(),
        contentUrl: z.string().nullable().optional(),
        agreed: z.boolean(),
      }),
    ),
  })
  .nullable();

// web <-> RN 브릿지 계약
export const contract = defineContract({
  APPLE_LOGIN: request({ response: loginResponse }),
  KAKAO_LOGIN: request({ response: loginResponse }),
  GET_ACCESS_TOKEN: request({
    payload: z.object({ forceRefresh: z.boolean().optional() }),
    response: z.object({ accessToken: z.string().nullable() }),
  }),
  LOGOUT: request(),
  WITHDRAW: request(),
  AUTH_EXPIRED: command(),
  LOG: command({
    payload: z.object({
      level: z.enum(['log', 'info', 'warn', 'error', 'debug']),
      args: z.array(z.string()),
    }),
  }),
  OPEN_PHOTO_SELECT: command({ payload: z.object({ boardId: z.string() }) }),
  // 보드 화면 진입/이탈 — 보드에 있는 동안만 바운스 끔
  SET_BOARD_ACTIVE: command({ payload: z.object({ active: z.boolean() }) }),
});

export type BridgeContract = typeof contract;
