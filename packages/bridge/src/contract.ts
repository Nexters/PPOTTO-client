import { command, defineContract, event, request } from 'webview-bridge-kit';
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

const analysisLoadingPhase = z.enum(['SCAN', 'GROUP', 'ASSEMBLE', 'DECK', 'REVEAL']);
const analysisLoadingPhaseState = z.object({
  visiblePhase: analysisLoadingPhase,
  visualProgress: z.number().min(0).max(100),
});
const analysisLoadingState = analysisLoadingPhaseState.extend({
  // 선택 그룹은 최대 100개지만 그룹당 사진이 최대 10장이므로 실제 사진 수는 1,000장까지 가능하다.
  photoCount: z.number().int().min(0).max(1000),
  photos: z
    .array(
      z.object({
        id: z.string(),
        uri: z.string(),
        width: z.number().positive(),
        height: z.number().positive(),
      }),
    )
    .max(25),
});

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
  OPEN_PHOTO_SELECT: command({
    payload: z.object({ boardId: z.string(), mode: z.enum(['initial', 'additional']) }),
  }),
  SAVE_IMAGE: request({
    payload: z.object({ base64: z.string() }),
    response: z.object({ success: z.boolean() }),
  }),
  SHARE_INSTAGRAM_STORY: request({
    payload: z.object({ base64: z.string() }),
    response: z.object({ success: z.boolean() }),
  }),
  SHARE_KAKAO: request({
    payload: z.object({ templateArgs: z.record(z.string(), z.string()) }),
    response: z.object({ success: z.boolean() }),
  }),
  // 보드 화면 진입/이탈 — 보드에 있는 동안만 바운스 끔
  SET_BOARD_ACTIVE: command({ payload: z.object({ active: z.boolean() }) }),
  BOARD_READY: command(),
  GET_ANALYSIS_LOADING_STATE: request({ response: analysisLoadingState }),
  ANALYSIS_LOADING_READY: command(),
  ANALYSIS_LOADING_PHASE_STARTED: command({
    payload: z.object({ phase: analysisLoadingPhase }),
  }),
  ANALYSIS_LOADING_PHASE_FINISHED: request({
    payload: z.object({ phase: analysisLoadingPhase }),
    response: analysisLoadingPhaseState,
  }),
  ANALYSIS_LOADING_REVEAL_FINISHED: command(),
  SHOW_BOARD: event(),
});

export type BridgeContract = typeof contract;
export type AnalysisLoadingBridgeState = z.infer<typeof analysisLoadingState>;
export type AnalysisLoadingPhase = z.infer<typeof analysisLoadingPhase>;
export type AnalysisLoadingPhaseState = z.infer<typeof analysisLoadingPhaseState>;
