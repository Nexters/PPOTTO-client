# 로딩 모션 목 이미지

레포 루트에서 사진 폴더를 지정해 생성한다. JPG·PNG·WebP 1~40장을 지원한다.

```sh
node apps/web/src/pages/analysis-loading/mock/generate.mjs '/사진/폴더'
```

- `loading-state.local.json`: `GET_ANALYSIS_LOADING_STATE` 응답 형태. 사진마다 base64 `uri`, `width`, `height`, 임시 `id`가 들어간다.
- EXIF 방향 보정 후 비율을 유지해 긴 변 최대 640px, JPEG 품질 50으로 변환한다. 작은 사진은 확대하지 않는다. 네이티브 모션용 설정에 대응하지만 인코더가 달라 결과 바이트가 같지는 않다.
- 원본은 변경하지 않는다. 출력에는 원본 파일명·경로·EXIF를 남기지 않으며, 이미지 데이터는 Git에서 제외한다.
- Next.js에 설치된 `sharp`를 사용하며 생성 시 모든 base64의 이미지 디코딩과 크기를 검증한다.
- 개발 서버(`pnpm --filter web dev`)의 일반 브라우저에서 `/analysis-loading`에 접속하면 이 데이터로 자동 재생한다. 새로고침하면 처음부터 다시 재생한다.
- `SCAN → GROUP → ASSEMBLE → DECK → REVEAL`을 기존 모션 코드와 속도로 한 번씩 재생한다. 이미지 디코딩 후 시작하며, 실제 업로드·폴링·보드 사전 로딩은 실행하지 않는다.
- 앱 웹뷰는 개발 환경에서도 실제 네이티브 브리지를 사용한다. 프로덕션에서는 목 API가 404를 반환하고 로컬 파일이 없어도 빌드할 수 있다.
- 데이터는 개발 전용 API가 요청 시 읽으며 클라이언트 코드에서 직접 import하지 않는다. 개인 이미지가 있으므로 개발 서버를 공개하지 않는다.
