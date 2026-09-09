import assert from 'node:assert/strict';
import { readdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Next.js에 설치된 sharp를 재사용한다. 브라우저에서는 실행하지 않는다.
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
const sourceDirectory = process.argv[2];
assert(sourceDirectory, 'Usage: node generate.mjs <image-directory>');

const files = (await readdir(sourceDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && /\.(jpe?g|png|webp)$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();
assert(
  files.length > 0 && files.length <= 40,
  `이미지는 1~40장이어야 합니다. 현재 ${files.length}장`,
);

const photos = [];
let jpegBytes = 0;
for (const filename of files) {
  const { data, info } = await sharp(join(sourceDirectory, filename))
    .autoOrient()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 50 })
    .toBuffer({ resolveWithObject: true });
  const base64 = data.toString('base64');

  // 생성 시 실제 base64를 다시 디코딩해 유효한 사진과 출력 크기인지 확인한다.
  const decoded = await sharp(Buffer.from(base64, 'base64'))
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert.equal(info.format, 'jpeg');
  assert.equal(decoded.info.width, info.width);
  assert.equal(decoded.info.height, info.height);
  assert(info.width > 0 && info.height > 0 && Math.max(info.width, info.height) <= 640);

  photos.push({
    id: `mock-photo-${String(photos.length + 1).padStart(2, '0')}`,
    uri: `data:image/jpeg;base64,${base64}`,
    width: info.width,
    height: info.height,
  });
  jpegBytes += data.length;
}

const state = {
  jobId: 'local-motion-mock',
  photoCount: photos.length,
  downloadingFromICloud: false,
  visiblePhase: 'SCAN',
  visualProgress: 0,
  photos,
};
const output = new URL('./loading-state.local.json', import.meta.url);
const json = `${JSON.stringify(state, null, 2)}\n`;
await writeFile(output, json);
process.stdout.write(
  `Validated ${photos.length} photos; JPEG ${(jpegBytes / 1024).toFixed(1)} KiB; JSON ${(Buffer.byteLength(json) / 1024).toFixed(1)} KiB\n`,
);
process.stdout.write(`${fileURLToPath(output)}\n`);
