---
paths:
  - 'apps/{web,mobile}/src/entities/**/api/**/*.{ts,tsx}'
---

# API conventions

## 파일과 export

새 도메인은 필요한 파일만 만든다.

```text
apps/<app>/src/entities/<domain>/api/
  <domain>-api.ts
  <domain>-query-keys.ts
  use-<name>-query.ts
  use-<name>-mutation.ts
```

- API 메서드는 `<domain>Api` 객체로 묶고 훅은 독립된 named export로 만든다.
- Query Key 파일은 해당 도메인에 GET 엔드포인트가 있을 때만 둔다.
- 기존 barrel이 있으면 기존 방식으로 새 API 객체, 훅과 Query Key Factory를 export하고, 없으면 만들지 않는다.
- 실제 사용 전에는 다른 엔티티 계층이나 web·mobile 공용 패키지를 만들지 않는다.

## API 메서드 이름

HTTP 메서드가 아니라 도메인 동작으로 이름을 정한다.

- 표준 자원 작업: `get`, `list`, `create`, `update`, `delete`
- 도메인 명령: 실제 행위의 동사인 `start`, `cancel`, `agree`, `refresh`, `withdraw` 등
- `postAnalysis`, `patchBoard`처럼 HTTP 메서드를 이름에 넣지 않는다.
- 범위나 속성이 의미를 바꾸면 `getActive`, `listByBoard`, `updatePosition`처럼 드러낸다.
- `operationId`를 근거로 사용하되 제품 의미와 맞지 않으면 그대로 복사하지 않는다.
- 도메인 객체가 namespace이므로 `analysisApi.create`처럼 메서드에서 도메인 이름을 반복하지 않는다.

## openapi-fetch 래핑

기존 `api` 클라이언트와 `@ppotto/api`의 `unwrapData`·`unwrapVoid`를 사용하고 헬퍼를 다시 구현하지 않는다.

- `unwrapData`는 non-2xx에 `HttpError`, 2xx인데 payload가 없으면 `MalformedResponseError`를 throw하고 payload를 반환한다.
- `unwrapVoid`는 non-2xx에 `HttpError`를 throw하고 성공하면 `void`를 반환한다.
- API 메서드는 openapi-fetch options를 내부에서 조립하고 외부에는 ID, query와 body처럼 도메인에서 의미 있는 인자만 받는다. 단일 path ID는 scalar로 받고 여러 종류의 값은 `update(boardId, input)`처럼 구분한다.

```ts
import { type paths, unwrapData } from '@ppotto/api';

export type CreateAnalysisInput =
  paths['/analysis']['post']['requestBody']['content']['application/json'];

export const analysisApi = {
  create: (input: CreateAnalysisInput) => unwrapData(api.POST('/analysis', { body: input })),
};

export const boardApi = {
  get: (boardId: string) =>
    unwrapData(
      api.GET('/boards/{boardId}', {
        params: { path: { boardId } },
      }),
    ),
};
```

- 요청·query 타입은 `paths`에서 파생하고 다른 파일에서도 필요할 때만 `<domain>-api.ts`에서 export한다.
- 응답 타입은 API 메서드 반환 타입으로 추론하고, 외부 타입이 필요할 때만 `paths`의 성공 응답에서 파생한다.

## 훅 이름

- Query 훅은 구독하는 데이터로 짓는다: `useMeQuery`, `useBoardListQuery`, `useActiveAnalysisQuery`.
- Mutation 훅은 동작과 대상으로 짓는다: `useCreateAnalysisMutation`, `useAgreeTermsMutation`, `useUpdateStickerPositionMutation`.
- 기술·HTTP 용어 대신 도메인 의미를 사용하고 파일명은 훅 이름의 케밥 케이스로 작성한다.

## Query Key

- `<domain>-query-keys.ts`에 `<domain>QueryKeys` 객체를 둔다.
- `as const`의 readonly tuple을 사용하고 최상위 키는 URL이 아니라 도메인명으로 한다.
- 키는 `[domain, scope, ...identifiers, params?]` 순서로 구성한다.
- 단일 자원은 `detail`, 목록은 `list`, 특수 조회는 `me`, `active`, `required`처럼 실제 의미를 scope로 사용한다.
- 별도 무효화 단위인 목록은 `listByBoard`처럼 구체적인 scope를 사용할 수 있다.
- 결과를 바꾸는 모든 식별자는 scope 뒤에 두고 필터·페이지네이션은 마지막 객체에 묶는다.
- `all`은 도메인 전체 무효화 prefix로 제공하고 사용하지 않는 중간 prefix는 만들지 않는다.
- 외부 Query Key Factory 라이브러리나 범용 Factory를 추가하지 않는다.

```ts
export const userQueryKeys = {
  all: ['user'] as const,
  me: () => [...userQueryKeys.all, 'me'] as const,
};

export const boardQueryKeys = {
  all: ['board'] as const,
  detail: (boardId: string) => [...boardQueryKeys.all, 'detail', boardId] as const,
  list: (params: BoardListParams) => [...boardQueryKeys.all, 'list', params] as const,
};

export const stickerQueryKeys = {
  all: ['sticker'] as const,
  listByBoard: (boardId: string, params: StickerListParams) =>
    [...stickerQueryKeys.all, 'listByBoard', boardId, params] as const,
};
```

```ts
export const useMeQuery = () =>
  useQuery({
    queryKey: userQueryKeys.me(),
    queryFn: userApi.getMe,
  });

export const useBoardQuery = (boardId: string) =>
  useQuery({
    queryKey: boardQueryKeys.detail(boardId),
    queryFn: () => boardApi.get(boardId),
  });
```

인자를 전혀 받지 않는 API 메서드만 `queryFn`에 직접 전달하고, 인자가 있으면 클로저로 감싼다.

Mutation을 위해 Query Key, `mutationKey`나 Query·Mutation Options Factory를 만들지 않는다. Mutation 함수는 하나의 variables 인자를 받으며, API 메서드 인자가 여러 개면 객체로 묶는다.

```ts
type UpdateStickerPositionVariables = {
  stickerId: string;
  position: StickerPositionInput;
};

export const useUpdateStickerPositionMutation = () =>
  useMutation({
    mutationFn: ({ stickerId, position }: UpdateStickerPositionVariables) =>
      stickerApi.updatePosition(stickerId, position),
  });
```

## 기본 정책

- 요청받지 않은 기본 옵션, 재시도, 캐시 시간과 콜백을 추가하지 않는다.
- invalidate, `setQueryData`, optimistic update는 요구사항이 있거나 합의된 경우에만 추가한다.
- 얇은 API 연결과 기본 훅에는 테스트를 강제하지 않고 데이터 변환, 분기나 캐시 갱신이 생기면 테스트한다.
