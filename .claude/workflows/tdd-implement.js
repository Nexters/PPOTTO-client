/**
 * tdd-implement — 여러 구현 단위를 TDD로 한 번에 완성하는 워크플로우
 *
 * 입력: test-interview가 만든 it.todo 골격을 단위별로 묶은 배열.
 *   [{ name, testFiles: string[], implementationScope: string[] }]
 *   - name: 단위 이름
 *   - testFiles: 이 단위가 소유하는 테스트 파일 (단위 간 겹치면 안 됨)
 *   - implementationScope: 이 단위 구현이 수정할 수 있는 경로
 *
 * 단계:
 *   1. 본문 작성 (병렬) — 단위별 it.todo를 실제 테스트로 채움.
 *      테스트 파일이 단위 간 겹치지 않으므로 동시 실행해도 충돌 없음.
 *   2. 구현 (순차) — 테스트를 통과시키는 코드 작성.
 *      단위들이 공유 파일(barrel, 공용 유틸)을 건드릴 수 있어 한 번에 하나씩.
 *   3. 검증 (병렬) — 단위별 테스트 실행 + test-writing 원칙 위반·계약 불충족 확인.
 *      각 단위 독립이라 동시 실행. read-only.
 *   4. 통합 검증 (1회) — 전체 테스트·타입체크·lint·잔존 only 확인. 보고만.
 *
 * 반환: { pass, unitReports, blockedUnits, verificationFailedUnits, integration }
 */
export const meta = {
  name: 'tdd-implement',
  description:
    '구현 단위별로 테스트 본문 작성(병렬) -> 구현(순차) -> 검증(병렬) 후 통합 검증. [베타] 파일 변경 추적·격리·복구는 하지 않는다 — 아래 "베타 범위 밖 보장" 참고.',
  whenToUse:
    'test-interview로 여러 구현 단위의 it.todo 골격 파일이 이미 만들어졌고, 단위 수가 많아 몰아서 완성하고 싶을 때. args로 단위 배열을 전달한다. 현재 변경사항과 결과가 섞이지 않도록 별도 브랜치에서 실행을 권장한다.',
  phases: [
    { title: '본문 작성', detail: '단위별 it.todo를 test-writing 원칙대로 실제 테스트 코드로 채움 (병렬)' },
    { title: '구현', detail: '단위별 테스트를 통과시키는 구현 (순차)' },
    { title: '검증', detail: '단위별 테스트 실행 + test-writing 원칙 위반·계약 불충족 확인 (병렬)' },
    { title: '통합 검증', detail: '전체 테스트·타입체크·lint·잔존 only 확인. 발견만 하고 수정하지 않음' },
  ],
};

const ISSUE_ITEMS = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['test', 'implementation', 'scope', 'infrastructure', 'typecheck', 'lint', 'build', 'conflict'],
    },
    message: { type: 'string' },
  },
  required: ['type', 'message'],
};

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    pass: { type: 'boolean' },
    issues: { type: 'array', items: ISSUE_ITEMS },
  },
  required: ['pass', 'issues'],
};

const WRITE_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['completed', 'test_blocked', 'infrastructure_blocked'] },
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'issues'],
};

const IMPLEMENT_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['completed', 'test_blocked', 'scope_blocked'] },
    issues: { type: 'array', items: { type: 'string' } },
    notes: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'issues'],
};

function scopeConflict(a, b) {
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`);
}

function passedVerification(result) {
  return result?.pass === true && Array.isArray(result.issues) && result.issues.length === 0;
}

const units = args;

if (!Array.isArray(units) || units.length === 0) {
  throw new Error(
    'args로 구현 단위 배열을 전달해야 한다. 예: [{ name: "photo-upload", testFiles: ["..."], implementationScope: ["apps/web/src/features/photo-upload"] }]',
  );
}

const names = new Set();
const seenTestFiles = new Set();
const scopes = [];
for (const unit of units) {
  if (
    typeof unit.name !== 'string' ||
    !Array.isArray(unit.testFiles) ||
    unit.testFiles.length === 0 ||
    !Array.isArray(unit.implementationScope) ||
    unit.implementationScope.length === 0
  ) {
    throw new Error(`잘못된 구현 단위 (name·testFiles·implementationScope 필수): ${JSON.stringify(unit)}`);
  }
  if (names.has(unit.name)) throw new Error(`단위 이름 중복: ${unit.name}`);
  names.add(unit.name);
  for (const file of unit.testFiles) {
    if (seenTestFiles.has(file)) throw new Error(`테스트 파일이 두 단위에 배정됨: ${file}`);
    seenTestFiles.add(file);
  }
  for (const path of unit.implementationScope) scopes.push({ unit: unit.name, path });
}
// 범위 중첩은 순차 구현에서 실행 충돌을 만들지 않으므로 경고만
for (let i = 0; i < scopes.length; i++) {
  for (let j = i + 1; j < scopes.length; j++) {
    if (scopes[i].unit !== scopes[j].unit && scopeConflict(scopes[i].path, scopes[j].path)) {
      log(
        `경고: 구현 범위 중첩 ${scopes[i].unit}(${scopes[i].path}) <-> ${scopes[j].unit}(${scopes[j].path}) — 단위 분할 재검토 권장`,
      );
    }
  }
}

log(`구현 단위 ${units.length}개 처리 시작`);

phase('본문 작성');
const writeResults = await parallel(
  units.map((unit) => () =>
    agent(
      `다음 테스트 골격 파일을 읽어라: ${unit.testFiles.join(', ')}. 이 파일들은 같은 구현 단위(${unit.name})에 속한다. ` +
        `상단 주석에 이번 구현의 동작 범위(포함/제외/미결)가 있고, 각 it.todo가 검증해야 할 동작이다. ` +
        `test-writing 스킬의 원칙(하나의 테스트=하나의 동작, 독립성, DAMP, 최소 데이터, 관찰 가능한 동작만 검증, 비결정성 통제, RTL 규칙, 실패 원인 명확성)에 따라 모든 it.todo를 실제 테스트 코드로 채워라. ` +
        `위 테스트 파일 외의 어떤 파일도 수정하지 마라. 구현 코드도 건드리지 마라. ` +
        `해당 테스트 파일만 지정해 실행하고 판정하라: (a) 실패하면 원인이 "동작 미구현"인지, 오타·import 오류 같은 잘못된 이유인지 확인한다 ` +
        `(b) 통과하면 기존 구현이 실제로 그 동작을 충족해서인지, 아무것도 검증하지 않아 통과한 공허한 테스트인지 확인한다 — 공허한 통과는 실패로 취급하고 assertion을 다시 써라. ` +
        `status를 보고하라: completed(테스트 본문을 다 작성함) / test_blocked(골격이나 합의된 동작 범위에 문제가 있어 진행 불가) / infrastructure_blocked(파일 접근·import·실행 환경 문제로 진행 불가).`,
      { label: `write:${unit.name}`, phase: '본문 작성', schema: WRITE_SCHEMA },
    ),
  ),
);

phase('구현');
const implResults = [];
for (let i = 0; i < units.length; i++) {
  const unit = units[i];
  const write = writeResults[i];
  if (!write || write.status !== 'completed') {
    implResults.push({
      status: 'write_blocked',
      synthesized: true,
      blockedType: write && write.status === 'test_blocked' ? 'test' : 'infrastructure',
      issues: [
        `본문 작성 단계 차단(${write ? write.status : '결과 없음'}): ${write ? (write.issues || []).join(' / ') : ''}`,
      ],
    });
    continue;
  }
  implResults.push(
    await agent(
      `${unit.implementationScope.join(', ')} 범위 안에서 다음 테스트를 통과시키는 구현을 작성하라: ${unit.testFiles.join(', ')}. ` +
        `테스트 파일은 수정하지 마라. 파일 상단 주석의 미결([팀확인]) 케이스와 테스트에 없는 동작은 구현하지 마라. ` +
        `"최소 구현"은 테스트 입력값을 하드코딩해 그 케이스만 통과시키는 것을 뜻하지 않는다 — 합의된 동작 계약을 일반적으로 만족하도록 구현하고, 테스트 전용 분기나 테스트 코드 의존성을 운영 코드에 넣지 마라. ` +
        `프로젝트의 기존 구조(FSD 레이어, 기존 컴포넌트·훅 패턴, 디자인 토큰)를 따르고, 해당 테스트 파일만 지정해 반복 실행하라 — 전체 스위트는 통합 검증 단계에서 돈다. ` +
        `시작 시점에 테스트가 이미 통과하면, 어떤 기존·선행 구현이 충족시키는지 확인해 notes에 보고하고 completed로 마쳐라(issues가 아니다 — 문제가 아닌 정보다). ` +
        `범위 밖의 파일을 고쳐야 할 필요가 있으면 직접 고치지 말고 status를 scope_blocked로 보고하라. ` +
        `테스트가 합의된 동작 범위와 충돌하거나 기술적으로 잘못됐다고 판단되면 수정하지 말고 중단한 뒤 status를 test_blocked로 보고하라. 완료 시 status와 issues를 보고하라.`,
      { label: `impl:${unit.name}`, phase: '구현', schema: IMPLEMENT_SCHEMA },
    ),
  );
}

phase('검증');
const verifyResults = await parallel(
  units.map((unit, i) => () => {
    const impl = implResults[i];
    if (!impl || impl.status !== 'completed') {
      const type = !impl
        ? 'infrastructure'
        : impl.blockedType
          ? impl.blockedType
          : impl.status === 'scope_blocked'
            ? 'scope'
            : 'test';
      return Promise.resolve({
        pass: false,
        synthesized: true,
        issues: [
          {
            type,
            message: `구현 단계 차단(${impl ? impl.status : '결과 없음'}): ${impl ? (impl.issues || []).join(' / ') : ''}`,
          },
        ],
      });
    }
    return agent(
      `먼저 다음 테스트 파일을 실제로 실행하라: ${unit.testFiles.join(', ')}. ` +
        `이 파일들 안에 it.todo·skip이 남아 있는지, only가 있는지 확인하라. ` +
        `그 후 테스트와 구현(${unit.implementationScope.join(', ')})을 대조 검토하라. ` +
        `테스트가 통과하지 않거나 합의된 동작 계약을 만족하지 않으면 원인과 무관하게 pass=false로 판정하라. 아무것도 수정하지 마라. ` +
        `문제를 유형별로 분류해 보고하라: ` +
        `test(테스트 자체가 원칙 위반이거나 잘못됨 — 내부 구현 결합, 테스트 간 의존, 통과시키려 약화된 assertion, only·skip·todo 잔존, 비결정적 값 방치, 공허한 assertion), ` +
        `implementation(구현이 계약을 충족하지 못함, 테스트 입력값 전용 하드코딩·분기 포함), ` +
        `scope(단위 범위 밖 파일이 수정됨 또는 수정이 필요함), ` +
        `infrastructure(테스트 실행 환경·의존성 문제).`,
      { label: `verify:${unit.name}`, phase: '검증', schema: VERIFY_SCHEMA },
    );
  }),
);

const unitReports = units.map((unit, i) => ({
  unit: unit.name,
  write: writeResults[i],
  implementation: implResults[i],
  verify: verifyResults[i],
}));

const blockedUnits = unitReports.filter(
  ({ implementation }) => !implementation || implementation.status !== 'completed',
);
const verificationFailedUnits = unitReports.filter(
  ({ implementation, verify }) =>
    implementation && implementation.status === 'completed' && !passedVerification(verify),
);

log(
  `단위 결과 — 검증 실패 ${verificationFailedUnits.length}건, 차단 ${blockedUnits.length}건 (전체 ${units.length}). 통합 검증 시작`,
);

phase('통합 검증');
const integration = await agent(
  `이번 워크플로우에서 처리된 구현 단위들(${units.map((u) => u.name).join(', ')})에 대해 통합 검증을 수행하라. 아무것도 수정하지 마라 — 발견과 보고만 한다. ` +
    `관련 테스트 전체 실행, 타입체크, lint, (설정돼 있으면) build를 수행하고 실패 여부를 확인하라. ` +
    `only(it.only·test.only·describe.only)는 저장소 전체에서 검색하라. todo·skip은 다음 파일 안에서만 확인하라: ${units.flatMap((u) => u.testFiles).join(', ')}. ` +
    `단위 간 충돌·중복 구현(예: 같은 로직의 재구현, barrel export 불일치)이 있으면 위치·영향·권장 해결 방법을 issues에 보고하라. ` +
    `문제 유형: test / implementation / scope / infrastructure / typecheck / lint / build / conflict.`,
  { label: 'integration', phase: '통합 검증', schema: VERIFY_SCHEMA },
);

return {
  pass:
    verificationFailedUnits.length === 0 &&
    blockedUnits.length === 0 &&
    passedVerification(integration),
  total: units.length,
  unitReports,
  blockedUnits: blockedUnits.map(({ unit }) => unit),
  verificationFailedUnits: verificationFailedUnits.map(({ unit }) => unit),
  integration,
};
