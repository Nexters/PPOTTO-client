export function uuidv7(): string {
  const timestampBytes = new Uint8Array(6);
  let remainingMs = Date.now();
  for (let i = 5; i >= 0; i -= 1) {
    timestampBytes[i] = remainingMs % 256;
    remainingMs = Math.floor(remainingMs / 256);
  }

  const bytes = new Uint8Array(16);
  bytes.set(timestampBytes, 0);
  bytes.set(crypto.getRandomValues(new Uint8Array(10)), 6);

  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // 버전 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // 변형(variant) 10xx

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
