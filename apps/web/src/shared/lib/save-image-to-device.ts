import { bridge } from './bridge';
import { blobToBase64 } from './blob-to-base64';

export async function saveImageToDevice(blob: Blob): Promise<boolean> {
  const base64 = await blobToBase64(blob);
  const { success } = await bridge.request('SAVE_IMAGE', { base64 });
  return success;
}
