# 왜 빈 폴더인가

이 폴더가 없으면 Next.js가 `src/pages`(FSD pages 레이어)를 Pages Router로 인식해 빌드가 실패한다.
App Router 라우팅은 루트 `app/`에서만 처리하며, 이 폴더는 비워둔다.
