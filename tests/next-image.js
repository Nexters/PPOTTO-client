import { check, sleep } from 'k6';
import exec from 'k6/execution';
import http from 'k6/http';
import { Rate, Trend } from 'k6/metrics';

const MODE = (__ENV.MODE || '').toLowerCase();
if (MODE !== 'cold' && MODE !== 'warm') {
  throw new Error('MODE must be either cold or warm');
}

const API_BASE_URL = (__ENV.API_BASE_URL || 'https://dev-api.ppotto.co.kr').replace(/\/$/, '');
const TARGET_BASE_URL = (__ENV.TARGET_BASE_URL || 'http://10.0.0.158:3000').replace(/\/$/, '');
const IMAGE_WIDTH = 750;
const IMAGE_QUALITY = 75;
const COLD_USERS = positiveInteger('COLD_USERS', 20);
const VUS = positiveInteger('VUS', MODE === 'cold' ? 2 : 5);
const SIGNATURE_DELAY_SECONDS = positiveNumber('SIGNATURE_DELAY_SECONDS', 1.1);

const nextImageFailed = new Rate('next_image_failed');
const nextImageCacheHit = new Rate('next_image_cache_hit');
const nextImageExpectedCache = new Rate('next_image_expected_cache');
const nextImageDuration = new Trend('next_image_duration', true);

export const options = {
  discardResponseBodies: true,
  scenarios:
    MODE === 'cold'
      ? {
          image_cold: {
            executor: 'shared-iterations',
            vus: Math.min(VUS, COLD_USERS),
            iterations: COLD_USERS,
            maxDuration: __ENV.MAX_DURATION || '10m',
          },
        }
      : {
          image_warm: {
            executor: 'constant-vus',
            vus: VUS,
            duration: __ENV.DURATION || '30s',
            gracefulStop: '10s',
          },
        },
  thresholds: {
    next_image_failed: ['rate<0.01'],
    next_image_expected_cache: ['rate>0.99'],
  },
  summaryTrendStats: ['min', 'avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function positiveInteger(name, fallback) {
  const value = Number(__ENV[name] || fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function positiveNumber(name, fallback) {
  const value = Number(__ENV[name] || fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be positive`);
  return value;
}

function requiredEnv(name) {
  const value = __ENV[name];
  if (!value) exec.test.abort(`${name} is required`);
  return value;
}

function responseData(response, label) {
  if (response.status < 200 || response.status >= 300) {
    exec.test.abort(`${label} failed with status ${response.status}`);
  }

  const payload = response.json();
  if (!payload || payload.data === undefined || payload.data === null) {
    exec.test.abort(`${label} returned an invalid response`);
  }
  return payload.data;
}

function apiParams(token, name) {
  return {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    responseType: 'text',
    tags: { name, phase: 'fixture' },
  };
}

function login() {
  if (__ENV.API_TOKEN) return __ENV.API_TOKEN;

  const response = http.post(
    `${API_BASE_URL}/dev/auth/login`,
    JSON.stringify({
      email: requiredEnv('DEV_EMAIL'),
      password: requiredEnv('DEV_PASSWORD'),
    }),
    {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      responseType: 'text',
      tags: { name: 'fixture_login', phase: 'fixture' },
    },
  );

  const data = responseData(response, 'dev login');
  if (!data.accessToken) exec.test.abort('dev login returned no access token');
  return data.accessToken;
}

function findBoardId(token) {
  if (__ENV.BOARD_ID) return __ENV.BOARD_ID;

  const response = http.get(`${API_BASE_URL}/boards`, apiParams(token, 'fixture_board_list'));
  const boards = responseData(response, 'board list');
  if (!Array.isArray(boards) || !boards[0] || !boards[0].id) {
    exec.test.abort('the development account has no board');
  }
  return boards[0].id;
}

function fetchStickerUrls(token, boardId) {
  const response = http.get(
    `${API_BASE_URL}/boards/${encodeURIComponent(boardId)}`,
    apiParams(token, 'fixture_board_detail'),
  );
  const board = responseData(response, 'board detail');
  const urls = (board.stickers || [])
    .map((sticker) => sticker.imageUrl)
    .filter((url) => typeof url === 'string' && url.length > 0);

  if (urls.length === 0) exec.test.abort('the board has no sticker image URL');
  return urls;
}

function optimizerUrl(sourceUrl) {
  return `${TARGET_BASE_URL}/_next/image?url=${encodeURIComponent(sourceUrl)}&w=${IMAGE_WIDTH}&q=${IMAGE_QUALITY}`;
}

function imageRequest(sourceUrl, phase) {
  return {
    method: 'GET',
    url: optimizerUrl(sourceUrl),
    params: {
      headers: { Accept: 'image/webp' },
      tags: { name: phase === 'load' ? 'next_image' : 'prime_image', mode: MODE, phase },
    },
  };
}

function requestInPairs(sourceUrls, phase, onResponse) {
  for (let index = 0; index < sourceUrls.length; index += 2) {
    const responses = http.batch(
      sourceUrls.slice(index, index + 2).map((sourceUrl) => imageRequest(sourceUrl, phase)),
    );
    responses.forEach(onResponse);
  }
}

function primeWarmCache(sourceUrls) {
  requestInPairs(sourceUrls, 'prime', (response) => {
    if (response.status !== 200) {
      exec.test.abort(`warm cache prime failed with status ${response.status}`);
    }
  });
}

export function setup() {
  const token = login();
  const boardId = findBoardId(token);

  if (MODE === 'warm') {
    const sourceUrls = fetchStickerUrls(token, boardId);
    primeWarmCache(sourceUrls);
    return { boards: [sourceUrls] };
  }

  const boards = [];
  const seenUrls = new Set();

  for (let user = 0; user < COLD_USERS; user += 1) {
    if (user > 0) sleep(SIGNATURE_DELAY_SECONDS);
    const sourceUrls = fetchStickerUrls(token, boardId);

    sourceUrls.forEach((sourceUrl) => {
      if (seenUrls.has(sourceUrl)) {
        exec.test.abort(
          'the backend reused a signed URL; increase SIGNATURE_DELAY_SECONDS or retry later',
        );
      }
      seenUrls.add(sourceUrl);
    });
    boards.push(sourceUrls);
  }

  return { boards };
}

function recordImageResponse(response) {
  const cache = response.headers['X-Nextjs-Cache'] || '';
  const contentType = response.headers['Content-Type'] || '';
  const failed = response.status !== 200 || !contentType.startsWith('image/webp');
  const expectedCache = MODE === 'warm' ? 'HIT' : 'MISS';

  nextImageFailed.add(failed, { mode: MODE });
  nextImageCacheHit.add(cache === 'HIT', { mode: MODE });
  nextImageExpectedCache.add(cache === expectedCache, { mode: MODE });
  nextImageDuration.add(response.timings.duration, { cache: cache || 'UNKNOWN', mode: MODE });

  check(
    response,
    {
      'image status is 200': (result) => result.status === 200,
      'image type is webp': () => contentType.startsWith('image/webp'),
      [`image cache is ${expectedCache}`]: () => cache === expectedCache,
    },
    { mode: MODE },
  );
}

export default function (data) {
  const board = MODE === 'cold' ? data.boards[exec.scenario.iterationInTest] : data.boards[0];

  requestInPairs(board, 'load', recordImageResponse);
  if (MODE === 'warm') sleep(1);
}
