# Next 이미지 부하 테스트

[`next-image.js`](./next-image.js)는 개발 API에서 보드의 스티커 URL을 가져와 테스트 Next
서버의 `/_next/image`를 직접 요청한다. 측정 대상은 **Next 이미지 최적화와 디스크 캐시**다.
브라우저 캐시, 백엔드 signed URL 캐시, CDN 캐시는 측정하지 않는다.

## 모드

- `warm`: 동일한 이미지 변형을 먼저 생성한 뒤 반복 요청하고 `X-Nextjs-Cache: HIT`를
  기대한다.
- `cold`: 사용자별로 서로 다른 signed URL을 준비해 `X-Nextjs-Cache: MISS`를 기대한다.

현재 Cold 방식은 API가 호출마다 새로운 signed URL을 반환할 때만 동작한다. 백엔드의
signed URL 재사용이 적용된 환경에서는 스크립트가 의도적으로 중단된다. 이후 Cold 테스트는
새 이미지 객체 또는 사용하지 않은 width를 준비하거나, 테스트 서버의 Next 이미지 캐시를
비운 뒤 실행해야 한다.

## 실행

프로덕션에서는 실행하지 않는다. 기본 대상은 테스트 서버의 사설 주소
`http://10.0.0.158:3000`이다.

```bash
cd tests

export DEV_EMAIL='테스트 계정 이메일'
read -rs DEV_PASSWORD
export DEV_PASSWORD

MODE=warm VUS=5 DURATION=30s \
  k6 run --include-system-env-vars next-image.js

unset DEV_PASSWORD
```

Cold가 가능한 환경의 작은 확인용 실행:

```bash
MODE=cold COLD_USERS=20 VUS=2 \
  k6 run --include-system-env-vars next-image.js
```

필요할 때만 대상을 덮어쓴다.

```bash
TARGET_BASE_URL='http://테스트-Next-서버' MODE=warm VUS=5 DURATION=30s \
  k6 run --include-system-env-vars next-image.js
```

## 주요 설정

| 환경변수                    | 기본값                   | 설명                        |
| --------------------------- | ------------------------ | --------------------------- |
| `MODE`                      | 없음                     | `cold` 또는 `warm`          |
| `DEV_EMAIL`, `DEV_PASSWORD` | 없음                     | 개발 로그인 정보            |
| `API_TOKEN`                 | 없음                     | 지정하면 개발 로그인을 생략 |
| `BOARD_ID`                  | 첫 번째 보드             | 테스트할 보드               |
| `TARGET_BASE_URL`           | `http://10.0.0.158:3000` | 테스트 Next 서버            |
| `COLD_USERS`                | `20`                     | Cold 반복 수                |
| `VUS`                       | Cold `2`, Warm `5`       | 동시 가상 사용자 수         |
| `DURATION`                  | `30s`                    | Warm 실행 시간              |

판정은 `next_image_failed`, `next_image_expected_cache`, `next_image_duration`의 p95와
p99를 본다. CDN을 테스트하려면 대상과 판정 헤더를 `X-Cache` 기준으로 별도 구성해야 한다.
