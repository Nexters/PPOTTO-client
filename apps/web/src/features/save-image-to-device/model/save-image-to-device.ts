import { bridge } from '@/shared/lib/bridge';
import { blobToBase64 } from '@/shared/lib/blob-to-base64';

export async function saveImageToDevice(blob: Blob): Promise<boolean> {
  const base64 = await blobToBase64(blob);
  const { success } = await bridge.request('SAVE_IMAGE', { base64 });
  return success;
}
