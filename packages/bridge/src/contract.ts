import { defineContract, request } from 'webview-bridge-kit';
import { z } from 'zod';

// web <-> RN 브릿지 계약 
export const contract = defineContract({
  GET_ACCESS_TOKEN: request({
    response: z.object({ accessToken: z.string().nullable() }),
  }),
});

export type BridgeContract = typeof contract;
