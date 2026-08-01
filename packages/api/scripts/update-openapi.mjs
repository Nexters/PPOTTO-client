import { rename, rm, writeFile } from 'node:fs/promises';

const { PPOTTO_DOCS_USER: user, PPOTTO_DOCS_PASSWORD: password } = process.env;

if (!user || !password) {
  throw new Error('Set PPOTTO_DOCS_USER and PPOTTO_DOCS_PASSWORD');
}

const response = await fetch('https://dev-api.ppotto.co.kr/v3/api-docs', {
  headers: {
    Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,
  },
});

if (!response.ok) {
  throw new Error(`OpenAPI download failed: ${response.status} ${response.statusText}`);
}

const document = await response.json();
if (typeof document.openapi !== 'string' || typeof document.paths !== 'object') {
  throw new Error('Response is not an OpenAPI document');
}

const output = new URL('../openapi/ppotto-api.json', import.meta.url);
const temporary = new URL(`../openapi/.ppotto-api.${process.pid}.tmp`, import.meta.url);

try {
  await writeFile(temporary, `${JSON.stringify(document, null, 2)}\n`);
  await rename(temporary, output);
} finally {
  await rm(temporary, { force: true });
}

console.log('Updated packages/api/openapi/ppotto-api.json');
