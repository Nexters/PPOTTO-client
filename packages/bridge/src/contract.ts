import { command, defineContract, request } from 'webview-bridge-kit';
import { z } from 'zod';

// web <-> RN 브릿지 계약
export const contract = defineContract({
  GET_ACCESS_TOKEN: request({
    response: z.object({ accessToken: z.string().nullable() }),
  }),
  LOG: command({
    payload: z.object({
      level: z.enum(['log', 'info', 'warn', 'error', 'debug']),
      args: z.array(z.string()),
    }),
  }),
  OPEN_PHOTO_SELECT: command(),
});

export type BridgeContract = typeof contract;
