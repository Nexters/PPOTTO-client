import type { GalleryPhoto } from './gallery-photo';
import {
  createSelection,
  excludeRepresentative,
  groupPhotos,
  restoreGroup,
  unitCount,
  units,
} from './photo-group';

/**
 * 동작 범위 (2026-07-30 인터뷰)
 *
 * 근접 촬영 그룹화와 대표 사진 승계. 분석 단위 = 그룹이며 1장짜리 그룹도 그룹이다.
 *
 * 앵커 방향이 PRD 문구와 다르다. PRD는 "그룹화되지 않은 첫(가장 오래된) 사진 기준 이후 5분"이지만
 * 여기서는 "가장 최신 사진 기준 이전 5분"으로 잡는다. 갤러리를 최신부터 훑어 100그룹이 차면
 * 멈추기 위해서다. 오래된 쪽을 앵커로 두면 더 오래된 사진을 나중에 불러올 때 이미 만든 그룹의
 * 경계가 밀려서, 조기 중단이 불가능하고 100번째 그룹이 로딩 진행에 따라 달라진다.
 * 최신 기준이면 닫힌 그룹이 영구 확정되므로 필요한 만큼만 불러올 수 있다.
 *
 * 5분 창에 10장이 넘으면 앵커에 가까운 10장만 남기고 버린다. 버린 사진은 다음 그룹의 앵커가
 * 되지 않는다 — 재앵커링을 허용하면 긴 연사가 10장씩 여러 그룹으로 쪼개져 한 순간이 100자리를
 * 여러 개 차지한다.
 *
 * 제외: 그룹이 살아있는 동안 이전 대표로 되돌리기 — 소진 후 복구로 대체 가능
 * 제외: 100그룹을 채우기 위한 페이지 로딩 루프 — load-photo-groups 책임
 */

const BASE_TIME = Date.parse('2026-07-30T10:00:00.000Z');

const minutes = (n: number) => n * 60_000;
const seconds = (n: number) => n * 1_000;

/** 촬영 시각만 케이스를 가르므로 나머지 필드는 고정값을 쓴다. offset이 클수록 최신이다. */
function photo(id: string, offsetMs: number): GalleryPhoto {
  return {
    id,
    uri: `file:///${id}.jpg`,
    creationTime: BASE_TIME + offsetMs,
    width: 100,
    height: 100,
  };
}

/** 그룹은 최신 우선, 그룹 안의 사진은 촬영 시각 오름차순(첫 원소가 대표)이다. */
const idsOf = (groups: { photos: GalleryPhoto[] }[]) =>
  groups.map((g) => g.photos.map((p) => p.id));

describe('근접 촬영 그룹화', () => {
  it('그룹을 최신 순으로 정렬한다', () => {
    const groups = groupPhotos([
      photo('old', 0),
      photo('new', minutes(20)),
      photo('mid', minutes(10)),
    ]);

    expect(idsOf(groups)).toEqual([['new'], ['mid'], ['old']]);
  });

  it('가장 최신 사진 기준 이전 5분 이내 사진을 한 그룹으로 묶는다', () => {
    const groups = groupPhotos([photo('anchor', minutes(5)), photo('within', 0)]);

    expect(idsOf(groups)).toEqual([['within', 'anchor']]);
  });

  it('다음 그룹은 5분 창을 벗어난 첫 사진부터 새로 시작한다', () => {
    // a는 b와 4분 차이지만 앵커 c의 창(3~8분) 밖이라 같은 그룹이 아니다.
    // 앵커를 직전 사진으로 갱신하면(슬라이딩 윈도) 셋이 한 그룹으로 잘못 묶인다.
    const groups = groupPhotos([photo('a', 0), photo('b', minutes(4)), photo('c', minutes(8))]);

    expect(idsOf(groups)).toEqual([['b', 'c'], ['a']]);
  });

  it('그룹 하나를 분석 단위 1개로 센다', () => {
    // 2장 그룹 1개 + 1장 그룹 2개 = 분석 단위 3개
    const groups = groupPhotos([
      photo('a', 0),
      photo('b', minutes(2)),
      photo('c', minutes(30)),
      photo('d', minutes(60)),
    ]);

    expect(unitCount(createSelection(groups))).toBe(3);
  });

  it('5분 창에 10장을 넘으면 앵커에 가까운 10장만 담는다', () => {
    // 12장이 모두 앵커의 5분 창 안에 있다. 가장 오래된 p0·p1이 버려진다.
    const burst = Array.from({ length: 12 }, (_, i) => photo(`p${i}`, seconds(i * 10)));

    const groups = groupPhotos(burst);

    expect(idsOf(groups)).toEqual([['p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11']]);
  });

  it('10장을 넘겨 버린 사진은 다음 그룹의 기준이 되지 않는다', () => {
    // 버린 p0·p1이 앵커가 되면 그룹이 3개가 된다. 창 밖의 old만 새 그룹을 만들어야 한다.
    const burst = Array.from({ length: 12 }, (_, i) => photo(`p${i}`, seconds(i * 10)));

    const groups = groupPhotos([...burst, photo('old', -minutes(30))]);

    expect(groups).toHaveLength(2);
    expect(idsOf(groups)[1]).toEqual(['old']);
  });
});

describe('대표 사진 선정과 승계', () => {
  it('그룹 내 촬영 시각이 가장 빠른 사진을 대표로 선정한다', () => {
    const groups = groupPhotos([photo('later', minutes(3)), photo('earlier', 0)]);

    const displayed = units(createSelection(groups));

    expect(displayed.map((u) => u.photo.id)).toEqual(['earlier']);
  });

  it('대표를 제외하면 다음으로 빠른 사진이 새 대표가 된다', () => {
    const groups = groupPhotos([photo('a', 0), photo('b', minutes(1)), photo('c', minutes(2))]);
    const selection = createSelection(groups);

    const afterExclude = excludeRepresentative(selection, groups[0]!.id);

    expect(units(afterExclude).map((u) => u.photo.id)).toEqual(['b']);
    // 승계는 분석 단위를 없애지 않으므로 개수가 유지된다
    expect(unitCount(afterExclude)).toBe(1);
  });

  it('그룹의 모든 사진이 제외되면 그룹을 분석 대상에서 제거한다', () => {
    const groups = groupPhotos([photo('a', 0), photo('b', minutes(1))]);
    const groupId = groups[0]!.id;

    const exhausted = excludeRepresentative(
      excludeRepresentative(createSelection(groups), groupId),
      groupId,
    );

    expect(unitCount(exhausted)).toBe(0);
    expect(units(exhausted).map((u) => u.excluded)).toEqual([true]);
  });

  it('제외된 그룹도 복구 대상인 첫 사진을 표시한다', () => {
    const groups = groupPhotos([photo('a', 0), photo('b', minutes(1))]);
    const groupId = groups[0]!.id;

    const exhausted = excludeRepresentative(
      excludeRepresentative(createSelection(groups), groupId),
      groupId,
    );

    expect(units(exhausted).map((u) => u.photo.id)).toEqual(['a']);
  });

  it('소진된 그룹을 복구하면 첫 번째 사진이 다시 대표가 된다', () => {
    const groups = groupPhotos([photo('a', 0), photo('b', minutes(1))]);
    const groupId = groups[0]!.id;
    const exhausted = excludeRepresentative(
      excludeRepresentative(createSelection(groups), groupId),
      groupId,
    );

    const restored = restoreGroup(exhausted, groupId);

    expect(units(restored).map((u) => u.photo.id)).toEqual(['a']);
    expect(unitCount(restored)).toBe(1);
  });
});
