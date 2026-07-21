import { get } from './get';

// 사용처: photos.get.list() — 파일은 HTTP 메서드별(get.ts/post.ts), 호출은 도메인.메서드 네임스페이스
export const photos = { get };

export { photoKeys, usePhotoList } from './queries';
