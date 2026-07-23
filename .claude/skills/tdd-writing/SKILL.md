---
name: tdd-writing
description: 테스트 코드(Vitest/Jest, React Testing Library)를 작성하거나 수정할 때 반드시 적용하는 작성 원칙. 새 테스트 작성, it.todo 채우기, 기존 테스트 리팩토링, 테스트 리뷰 시 이 스킬을 로드한다.
---

# 테스트 작성 원칙

테스트는 통과 여부보다 **읽는 사람에게 동작을 설명하는가**가 품질 기준이다.

이 프로젝트에서 테스트는 **자동 검증 가능한 동작 계약의 SoT**다. 제품 정책과 구현 범위는 PRD 및 합의된 기능 명세를 따른다. 테스트와 PRD 또는 합의된 기능 명세가 충돌하면 어느 한쪽에 임의로 맞추지 않는다. 충돌 내용을 사용자에게 알리고, 확인된 정책에 따라 테스트 또는 문서를 수정한다.

아래 원칙에 예외 조항을 사용할 때는(스냅샷, fireEvent 등) 해당 위치에 사유를 주석으로 남긴다.

## 1. 테스트 하나 = 동작 하나

각 테스트는 하나의 요구사항을 증명한다. 테스트 이름만 이어 읽어도 스펙 문서가 되어야 한다.

```ts
// 좋음 — 이름이 곧 스펙
test('재고가 0이면 버튼이 비활성화되고 품절 문구가 보인다', ...)
test('클릭하면 onAdd가 상품 id와 함께 호출된다', ...)

// 나쁨 — 여러 동작이 한 테스트에 뭉침
test('버튼이 잘 동작한다', ...)
```

단, "assertion 하나만"이라는 뜻은 아니다. **같은 동작을 증명하는 assertion 여러 개는 한 테스트에 함께 둔다.**

```tsx
test('재고가 0이면 버튼이 비활성화되고 품절 문구가 보인다', () => {
  render(<AddToCartButton stock={0} />);
  // 두 assertion 모두 "품절 상태의 UI"라는 하나의 동작을 증명
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('품절')).toBeInTheDocument();
});
```

서로 다른 동작(예: 품절 UI + 클릭 동작)이 한 테스트에 섞여 있으면 분리한다.

## 2. 테스트는 서로 독립적이다

- 실행 순서에 의존하지 않는다. 어떤 테스트 하나만 `it.only`로 돌려도 통과해야 한다.
- 앞 테스트가 만든 상태(파일, 전역 변수, 모듈 상태)를 다음 테스트가 사용하지 않는다.
- 각 테스트는 자신의 전제를 독립적으로 준비한다. 여러 테스트에 공통인 **기술적 초기화**(mock 서버 기동, userEvent.setup 등)만 `beforeEach`로 옮긴다.
- 케이스를 구분하는 데이터와 렌더 조건은 가능하면 테스트 본문에 남긴다. render를 beforeEach에 숨기지 않는다.
- mock, spy, fake timer, 변경한 전역 상태가 테스트 사이에 누출되지 않도록 정리한다.
- 호출 기록만 지울지, 구현까지 초기화할지, 원본을 복원할지는 mock의 성격에 맞게 선택한다.
- 전역 spy와 fake timer는 테스트 후 반드시 원복한다.

```ts
// 나쁨 — 순서 의존
test('A: 장바구니에 담는다', ...)
test('B: A에서 담은 상품을 결제한다', ...)  // A 없이 실행하면 깨짐

// 좋음 — B가 자기 전제를 스스로 준비
test('장바구니에 상품이 있으면 결제 버튼이 활성화된다', () => {
  render(<Cart items={[fakeItem()]} />);
  ...
});
```

## 3. 준비 코드는 헬퍼로, 검증은 눈앞에 (DAMP > DRY)

반복되는 준비(render 래핑, provider 감싸기, mock 서버 세팅)는 헬퍼로 빼도 된다.

```tsx
function renderWithProviders(ui: ReactElement, { user = fakeUser() } = {}) {
  return render(<AuthContext.Provider value={user}>{ui}</AuthContext.Provider>);
}
```

단, **테스트의 상황과 검증까지 추상화해서 감추지 않는다.** 테스트는 일반 코드보다 중복을 허용하더라도, 파일을 열었을 때 "무슨 상황에서 무엇을 확인하는지"가 그 자리에서 보여야 한다.

```ts
// 나쁨 — 무슨 테스트인지 열어봐도 모름
await givenValidCart();
await whenCheckout();
await thenEverythingWorks();
```

헬퍼는 "지루한 준비"만 담고, 케이스를 구분 짓는 값(재고 수량, 응답 상태코드 등)은 테스트 본문에 명시적으로 남긴다.

## 4. 테스트 데이터는 의도를 드러내는 최소값으로 만든다

- 해당 동작에 영향을 주는 값만 테스트 본문에서 명시하고, 나머지는 factory의 기본값을 사용한다.
- 실제 운영 데이터를 그대로 복제한 거대한 fixture를 만들지 않는다. 데이터가 많을수록 무엇이 중요한지 흐려지고, 타입 변경 시 무관한 테스트까지 함께 깨진다.
- 경계값과 케이스를 구분하는 값은 factory 기본값에 숨기지 않는다.

```ts
// 좋음 — 이 테스트의 관심사는 stock뿐임이 드러남
const product = fakeProduct({ stock: 0 });

// 나쁨 — 재고 테스트인데 필드 12개가 시야를 가림
const product = { id: '1', name: '상품', stock: 0, category: ..., seller: ..., reviews: ..., createdAt: ... };
```

## 5. 구현이 아니라 관찰 가능한 동작에 결합한다 (가장 중요)

내부 구현을 전부 바꿔도(useState→useReducer, 함수 분리, 라이브러리 교체) 사용자가 보는 동작이 같으면 테스트는 통과해야 한다.

검증 대상 판별 기준 — **그것이 컴포넌트의 공개 계약인가?**

| 검증해도 되는 것 (공개 계약)                  | 검증하면 안 되는 것 (내부 구현)              |
| --------------------------------------------- | -------------------------------------------- |
| 화면에 보이는 텍스트, role, 상태(disabled 등) | 내부 state 값, 컴포넌트 인스턴스             |
| props로 받은 콜백의 호출 여부/인자            | 내부에서 import한 유틸·모듈 mock의 호출 횟수 |
| 발생한 네트워크 요청 (msw 등 경계에서 관찰)   | fetch를 감싼 내부 함수가 불렸는지            |

호출 **횟수** 검증은 횟수 자체가 요구사항일 때만 한다. 이때 검증 지점은 그 책임을 가진 쪽의 경계다 — 컴포넌트가 요청을 직접 보내면 네트워크 경계(msw)에서, 단순히 콜백을 위임하면 콜백에서 관찰한다.

```tsx
// 좋음 — "요청 한 번"이 요구사항이고 요청 책임이 컴포넌트에 있으므로 네트워크 경계에서 관찰
test('저장 중 다시 클릭해도 저장 요청은 한 번만 발생한다', async () => {
  const user = userEvent.setup();
  const { handler, getRequestCount } = createDelayedSaveHandler();

  server.use(handler);
  render(<ProfileForm />);

  const saveButton = screen.getByRole('button', { name: '저장' });

  await user.click(saveButton);
  await user.click(saveButton);

  expect(getRequestCount()).toBe(1);
});

// 좋음 — 단순 위임 컴포넌트는 공개 계약인 콜백을 관찰
test('클릭하면 onAdd를 상품 id와 함께 호출한다', async () => {
  const onAdd = vi.fn();
  const user = userEvent.setup();
  render(<AddButton productId="product-1" onAdd={onAdd} />);

  await user.click(screen.getByRole('button', { name: '담기' }));
  expect(onAdd).toHaveBeenCalledWith('product-1');
});

// 나쁨 — 내부 함수 구조가 바뀌면 동작이 같아도 깨짐
expect(formatPriceMock).toHaveBeenCalledTimes(1);
// 대신 결과를 검증: expect(screen.getByText('15,000원')).toBeInTheDocument();
```

## 6. 비결정적 의존성을 통제한다

현재 시간, 타이머, 난수, UUID, 브라우저 전역 상태(viewport, locale 등)에 따라 결과가 달라지지 않게 한다. 필요한 값은 테스트에서 고정하고(`vi.useFakeTimers`, `vi.setSystemTime`, seed 고정 등), 테스트 후 반드시 복원한다(`vi.useRealTimers` 등). 고정하지 않은 비결정 값이 assertion에 들어가면 그 테스트는 언젠가 flaky가 된다.

## 7. RTL 규칙

- 사용자가 인식하는 방식으로 요소를 찾는다. 기본 우선순위: `ByRole` → `ByLabelText` → `ByPlaceholderText`·`ByText` → `ByDisplayValue` → `ByTestId`(사용자 관점 쿼리로 안정적으로 찾을 수 없을 때만).
- 상호작용 요소(버튼, 입력, 링크 등)를 role이나 label로 찾을 수 없다면 접근성 구현을 먼저 의심한다.
- 사용자의 실제 조작은 `userEvent`를 사용한다. `userEvent`가 지원하지 않는 저수준·브라우저 이벤트(scroll, 커스텀 이벤트 등)에만 `fireEvent`를 쓰고 사유를 주석으로 남긴다.
- 비동기 UI는 `await screen.findBy...` 또는 `waitFor`로 기다린다. 임의의 `setTimeout` 대기 금지.
- 스냅샷: UI 전체 스냅샷은 사용하지 않는다. 출력 전체가 계약인 코드 생성기·직렬화기 등에서만 작은 범위로 허용하되, 핵심 동작 assertion을 대체하지 않으며 사유를 주석으로 남긴다.
- API mock은 fetch 함수 mock보다 msw 같은 네트워크 경계 mock을 우선한다.

## 8. 실패가 원인을 말하게 한다

- 테스트 하나가 깨지면 원인 후보가 하나로 좁혀져야 한다. 여러 동작을 한 테스트에 넣으면 이게 무너진다 (1번과 연결).
- 테스트 본문 안에서 조건 분기나 반복문으로 서로 다른 결과를 검증하지 않는다.
- 서로 다른 정책이나 실패 원인은 테스트를 나눈다.
- 동일한 계약을 여러 입력값으로 검증하는 테이블 기반 테스트(`test.each`)는 허용한다.
- 매직 값 대신 의도가 보이는 이름을 쓴다: `stock={0}` 은 그대로 두되, `userEvent.click(...)` 을 두 번 하는 이유가 "더블클릭 시나리오"라면 주석이 아니라 테스트 이름에 담는다.
