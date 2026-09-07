import { contract } from '@ppotto/bridge';

export async function GET() {
  if (process.env.NODE_ENV !== 'development') return new Response(null, { status: 404 });

  try {
    // 로컬 개인 사진을 번들에 import하지 않는다. 개발 요청에서만 파일을 읽는다.
    const { readFile } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const json = await readFile(
      join(process.cwd(), 'src/pages/analysis-loading/mock/loading-state.local.json'),
      'utf8',
    );
    const state = contract.GET_ANALYSIS_LOADING_STATE.response!.parse(JSON.parse(json));
    if (state.photos.length === 0) throw new Error('Empty mock photos');
    return Response.json(state, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { message: 'mock/generate.mjs로 유효한 로컬 이미지 데이터를 생성해 주세요.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
