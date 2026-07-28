---
name: feat-new-api
description: OpenAPI 스키마에 정의된 엔드포인트를 web 또는 mobile 앱의 entities/<domain>/api로 스캐폴딩하는 수동 실행 워크플로다.
argument-hint: '[web|mobile] [METHOD] [path] [more endpoints...]'
disable-model-invocation: true
---

# 새 API 추가

@.claude/rules/api-conventions.md

입력: $ARGUMENTS

## 1. 입력 확인

각 엔드포인트에는 앱, HTTP 메서드와 경로가 필요하다.

```text
/feat-new-api mobile POST /analysis

/feat-new-api
- mobile POST /analysis
- web GET /users/me
```

- 누락된 필드는 한 질문에서 모두 요청한다.
- 여러 엔드포인트는 하나의 승인 계획으로 묶는다.
- 의미적 인터뷰만 한 번에 하나씩 진행한다.

## 2. 조사와 상태 분류

파일을 변경하기 전에 다음을 확인한다.

1. 생성된 OpenAPI 스키마의 메서드, 경로, `operationId`, 설명, 요청과 상태 코드별 응답·payload 유무
2. 대상 앱의 API 클라이언트, `entities` 구조, 기존 API·훅·Query Key와 중복 구현
3. TanStack Query 의존성과 `QueryClientProvider`

엔드포인트별 상태:

```text
new                새로 생성해야 함
already satisfied  동일한 구현이 이미 존재함
conflict           기존 구현이 요청 또는 rule과 충돌함
invalid            OpenAPI 스키마에 메서드나 경로가 없음
```

- `already satisfied`는 다시 생성하지 않고 다른 `new` 작업을 막지 않는다.
- `conflict`나 `invalid`가 있으면 모든 조사 결과를 보고하고 쓰기 전에 해결한다.
- 전부 `already satisfied`면 변경 없음으로 종료한다.
- 스키마에 없는 타입이나 동작을 추측하지 않는다.

## 3. 결정과 인터뷰

- 기존 엔티티를 우선하고, rule·OpenAPI 설명·기존 코드로 명확한 도메인과 이름은 자동 확정해 계획에 표시한다.
- 제품 의미가 모호하거나 후보가 여러 개일 때만 추천안 하나와 근거를 제시하고 확인받는다.
- 사용자가 지정한 이름이나 정책은 다시 묻지 않는다.
- 캐시 정책은 요구사항이 없으면 생략하고, 필요한데 코드만으로 결정할 수 없을 때만 확인받는다.

## 4. 계획 승인

`conflict`와 `invalid`가 없고 `new` 작업이 있으면 전체 계획을 보여주고 쓰기 승인을 받는다.

```text
| Status | App | Endpoint | Domain | API 메서드 | Hook | Query Key | 응답 |
| new | mobile | POST /analysis | analysis | analysisApi.create | useCreateAnalysisMutation | - | unwrapData |
| already satisfied | web | GET /users/me | user | userApi.getMe | useMeQuery | userQueryKeys.me() | unwrapData |
```

승인 전에는 파일이나 의존성을 변경하지 않는다. 이름이 바뀌면 수정한 계획을 다시 보여준다.

## 5. 스캐폴딩

- GET: API 메서드, Query Key와 Query 훅을 생성한다.
- POST·PUT·PATCH·DELETE: API 메서드와 Mutation 훅을 생성한다.
- 화면, UI와 상태 모델은 함께 요청받지 않았다면 수정하지 않는다.
- TanStack Query나 Provider가 없으면 선행 조건으로 보고하고, 함께 설정하도록 명시적으로 승인받은 경우에만 앱 설정을 별도 범위로 변경한다.

## 6. 검증과 보고

루트와 대상 앱의 `package.json` 및 실행 설정을 확인하고 실제 스크립트만 실행한다. 가능한 경우 `pnpm --filter <package-name> <script>`로 대상만 검증한다.

1. typecheck
2. lint
3. 관련 테스트
4. 설정이나 번들 경계를 바꿨고 스크립트가 있으면 build

공용 패키지를 수정했다면 그 패키지의 관련 검증도 실행한다. 없는 검증 스크립트는 추측하지 않고 미실행으로 보고한다.

완료 시 변경 파일, 확정한 이름, 검증 결과와 생략한 캐시 정책을 보고한다.
