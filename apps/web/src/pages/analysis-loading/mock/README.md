# 로딩 모션 목 이미지

레포 루트에서 사진 폴더를 지정해 생성한다. JPG·PNG·WebP 1~40장을 지원한다.

```sh
node apps/web/src/pages/analysis-loading/mock/generate.mjs '/사진/폴더'
```

- `loading-state.local.json`: `GET_ANALYSIS_LOADING_STATE` 응답 형태. 사진마다 base64 `uri`, `width`, `height`, 임시 `id`가 들어간다.
- EXIF 방향 보정 후 비율을 유지해 긴 변 최대 640px, JPEG 품질 50으로 변환한다. 작은 사진은 확대하지 않는다. 네이티브 모션용 설정에 대응하지만 인코더가 달라 결과 바이트가 같지는 않다.
- 원본은 변경하지 않는다. 출력에는 원본 파일명·경로·EXIF를 남기지 않으며, 이미지 데이터는 Git에서 제외한다.
- Next.js에 설치된 `sharp`를 사용하며 생성 시 모든 base64의 이미지 디코딩과 크기를 검증한다.
- 현재는 데이터 준비만 한다. 실제 로딩페이지에 연결하거나 브라우저용 재생 화면을 추가하지 않았으므로 프로덕션 번들에는 포함되지 않는다.
